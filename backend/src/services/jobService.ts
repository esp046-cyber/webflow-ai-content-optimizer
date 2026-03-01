import { EventEmitter } from "events";
import PQueue from "p-queue";
import { v4 as uuidv4 } from "uuid";
import type {
  Job,
  JobConfig,
  JobLog,
  JobResult,
  JobStatus,
  JobMetrics,
  GenerateOptions,
  SeoRewriteOptions,
} from "../types";
import { webflowService } from "./webflowService";
import { openaiService } from "./openaiService";
import { seoService } from "./seoService";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * JobService — orchestrates bulk AI content operations.
 *
 * Features:
 * - Concurrent processing via p-queue
 * - Real-time SSE log streaming via EventEmitter
 * - Dry-run mode (preview without writing)
 * - Rollback: revert all PATCH operations
 * - In-memory job store (extendable to Redis)
 */
export class JobService extends EventEmitter {
  private jobs: Map<string, Job> = new Map();

  // ─── Job Lifecycle ───────────────────────────────────────────────────────────

  createJob(jobConfig: JobConfig): Job {
    const id = uuidv4();
    const job: Job = {
      id,
      status: "pending",
      config: jobConfig,
      createdAt: new Date().toISOString(),
      progress: { total: 0, completed: 0, failed: 0, percentage: 0 },
      results: [],
      logs: [],
      metrics: this.emptyMetrics(),
      rollbackData: [],
    };

    this.jobs.set(id, job);
    this.pruneOldJobs();
    logger.info(`Job created: ${id} mode=${jobConfig.mode}`);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  listJobs(): Job[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ─── Job Execution ───────────────────────────────────────────────────────────

  /**
   * Start a job asynchronously.
   * Returns immediately — use SSE or polling for progress.
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== "pending") throw new Error(`Job ${jobId} is already ${job.status}`);

    job.status = "running";
    job.startedAt = new Date().toISOString();
    this.emit(`job:${jobId}`, { type: "start" });

    // Run asynchronously — don't await in the HTTP handler
    this.executeJob(job).catch((err) => {
      this.addLog(job, "error", `Fatal job error: ${(err as Error).message}`);
      job.status = "failed";
      this.emit(`job:${jobId}`, { type: "complete", job });
    });
  }

  private async executeJob(job: Job): Promise<void> {
    const { config: cfg } = job;
    const startTime = Date.now();

    try {
      this.addLog(job, "info", `🚀 Starting ${cfg.mode} job (dryRun=${cfg.dryRun})`);

      // 1. Fetch collection schema
      this.addLog(job, "info", "Fetching collection schema from Webflow...");
      const collection = await webflowService.getCollection(
        cfg.webflowToken,
        cfg.collectionId
      );
      this.addLog(job, "info", `Collection: "${collection.displayName}" (${collection.fields.length} fields)`);

      // 2. Fetch items
      this.addLog(job, "info", "Fetching collection items...");
      const itemsResponse = await webflowService.getItems(
        cfg.webflowToken,
        cfg.collectionId,
        { fetchAll: true }
      );

      let items = itemsResponse.items;

      // Filter to selected IDs if provided
      if (cfg.itemIds && cfg.itemIds.length > 0) {
        items = items.filter((item) => cfg.itemIds!.includes(item.id));
      }

      job.progress.total = items.length;
      this.addLog(job, "info", `Processing ${items.length} items...`);
      this.emitProgress(job);

      // 3. Process items concurrently
      const concurrency = cfg.concurrency ?? config.bulk.concurrency;
      const queue = new PQueue({ concurrency });

      const tasks = items.map((item) =>
        queue.add(async () => {
          const result = await this.processItem(job, collection, item, cfg);
          job.results.push(result);
          if (result.success) {
            job.progress.completed++;
          } else {
            job.progress.failed++;
          }
          job.progress.percentage = Math.round(
            ((job.progress.completed + job.progress.failed) / job.progress.total) * 100
          );
          this.emitProgress(job);
        })
      );

      await Promise.all(tasks);

      // 4. Finalize
      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.metrics = this.computeMetrics(job, Date.now() - startTime);

      this.addLog(
        job,
        "success",
        `✅ Job complete! ${job.progress.completed} succeeded, ${job.progress.failed} failed. Avg SEO improvement: +${job.metrics.avgSeoScoreImprovement.toFixed(1)} pts`
      );
    } catch (err) {
      job.status = "failed";
      job.completedAt = new Date().toISOString();
      job.metrics = this.computeMetrics(job, Date.now() - startTime);
      this.addLog(job, "error", `Job failed: ${(err as Error).message}`);
    } finally {
      this.emit(`job:${job.id}`, { type: "complete", job });
    }
  }

  private async processItem(
    job: Job,
    collection: { fields: Array<{ slug: string; type: string; displayName: string }> },
    item: { id: string; fieldData: Record<string, unknown> },
    cfg: JobConfig
  ): Promise<JobResult> {
    const itemStart = Date.now();
    const itemName =
      (item.fieldData["name"] as string) ??
      (item.fieldData["slug"] as string) ??
      item.id;

    this.addLog(job, "info", `Processing: ${itemName}`, item.id);

    try {
      // Identify text fields (skip system fields, booleans, numbers, refs)
      const textFieldSlugs = collection.fields
        .filter(
          (f) =>
            f.isEditable &&
            ["PlainText", "RichText", "Url"].includes(f.type)
        )
        .map((f) => f.slug);

      // Extract relevant content
      const contentToProcess: Record<string, unknown> = {};
      for (const slug of textFieldSlugs) {
        const val = item.fieldData[slug];
        if (typeof val === "string" && val.length > 0) {
          contentToProcess[slug] = val;
        }
      }

      // Score before
      const seoScoreBefore = seoService.score(
        contentToProcess as { title?: string; metaDescription?: string; body?: string },
        (cfg.options as SeoRewriteOptions).targetKeywords ?? []
      );

      let updatedData: Record<string, unknown> = {};
      let tokensUsed = 0;

      if (cfg.mode === "generate") {
        updatedData = await this.runGenerate(
          item.fieldData,
          collection.fields as Array<{ slug: string; displayName: string }>,
          cfg.options as GenerateOptions
        );
      } else if (cfg.mode === "seo-rewrite") {
        const result = await openaiService.seoRewrite(
          contentToProcess,
          cfg.options as SeoRewriteOptions
        );
        updatedData = result.optimized;
        tokensUsed = result.tokensUsed;
        this.addLog(
          job,
          "info",
          `  SEO changes: ${result.analysis.changes.slice(0, 2).join("; ")}`,
          item.id
        );
      } else {
        // auto-bulk: run seo-rewrite + generate for missing fields
        const seoResult = await openaiService.seoRewrite(
          contentToProcess,
          cfg.options as SeoRewriteOptions
        );
        updatedData = seoResult.optimized;
        tokensUsed = seoResult.tokensUsed;
      }

      // Score after
      const mergedContent = { ...contentToProcess, ...updatedData };
      const seoScoreAfter = seoService.score(
        mergedContent as { title?: string; metaDescription?: string; body?: string },
        (cfg.options as SeoRewriteOptions).targetKeywords ?? []
      );

      // Apply update to Webflow (unless dry run)
      if (!cfg.dryRun && Object.keys(updatedData).length > 0) {
        // Store original for rollback
        job.rollbackData?.push({
          itemId: item.id,
          originalData: { ...item.fieldData },
        });

        await webflowService.updateItem(
          cfg.webflowToken,
          cfg.collectionId,
          item.id,
          updatedData
        );

        this.addLog(
          job,
          "success",
          `  ✓ Updated ${itemName} (SEO: ${seoScoreBefore.overall} → ${seoScoreAfter.overall})`,
          item.id
        );
      } else if (cfg.dryRun) {
        this.addLog(
          job,
          "info",
          `  [DRY RUN] Would update ${itemName} (SEO: ${seoScoreBefore.overall} → ${seoScoreAfter.overall})`,
          item.id
        );
      }

      return {
        itemId: item.id,
        itemName,
        success: true,
        dryRun: cfg.dryRun,
        originalData: contentToProcess,
        updatedData,
        seoScoreBefore,
        seoScoreAfter,
        processingTimeMs: Date.now() - itemStart,
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.addLog(job, "error", `  ✗ Failed: ${itemName}: ${errorMsg}`, item.id);
      return {
        itemId: item.id,
        itemName,
        success: false,
        error: errorMsg,
        dryRun: cfg.dryRun,
        processingTimeMs: Date.now() - itemStart,
      };
    }
  }

  private async runGenerate(
    fieldData: Record<string, unknown>,
    fields: Array<{ slug: string; displayName: string }>,
    options: GenerateOptions
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const fieldMappings = options.fieldMappings ?? {};
    const preserveFields = new Set(options.preserveFields ?? []);

    // Determine which fields to generate
    const slugsToGenerate = Object.keys(fieldMappings).length > 0
      ? Object.keys(fieldMappings)
      : fields.slice(0, 3).map((f) => f.slug); // default: first 3 fields

    for (const slug of slugsToGenerate) {
      if (preserveFields.has(slug)) continue;
      const fieldDef = fields.find((f) => f.slug === slug);
      if (!fieldDef) continue;

      const generated = await openaiService.generateContent(
        fieldDef.displayName,
        fieldData,
        options
      );

      if (generated) result[slug] = generated;
    }

    return result;
  }

  // ─── Rollback ────────────────────────────────────────────────────────────────

  async rollbackJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== "completed") {
      throw new Error(`Can only rollback completed jobs (status: ${job.status})`);
    }
    if (!job.rollbackData || job.rollbackData.length === 0) {
      throw new Error("No rollback data available (was this a dry-run job?)");
    }

    logger.info(`Rolling back job ${jobId} (${job.rollbackData.length} items)`);
    this.addLog(job, "info", `🔄 Starting rollback of ${job.rollbackData.length} items...`);

    const queue = new PQueue({ concurrency: config.bulk.concurrency });

    for (const { itemId, originalData } of job.rollbackData) {
      await queue.add(async () => {
        try {
          await webflowService.updateItem(
            job.config.webflowToken,
            job.config.collectionId,
            itemId,
            originalData
          );
          this.addLog(job, "success", `  ✓ Restored item ${itemId}`);
        } catch (err) {
          this.addLog(job, "error", `  ✗ Failed to restore ${itemId}: ${(err as Error).message}`);
        }
      });
    }

    job.status = "rolled_back";
    this.addLog(job, "success", "✅ Rollback complete");
    this.emit(`job:${jobId}`, { type: "rollback", job });
  }

  // ─── SSE Streaming ───────────────────────────────────────────────────────────

  private addLog(job: Job, level: JobLog["level"], message: string, itemId?: string): void {
    const log: JobLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      itemId,
    };
    job.logs.push(log);
    this.emit(`job:${job.id}`, { type: "log", log });
  }

  private emitProgress(job: Job): void {
    this.emit(`job:${job.id}`, { type: "progress", progress: job.progress });
  }

  // ─── Metrics ─────────────────────────────────────────────────────────────────

  private computeMetrics(job: Job, processingTimeMs: number): JobMetrics {
    const successful = job.results.filter((r) => r.success);
    const withScores = successful.filter(
      (r) =>
        r.seoScoreBefore !== undefined && r.seoScoreAfter !== undefined
    );

    const avgImprovement =
      withScores.length > 0
        ? withScores.reduce(
            (sum, r) => sum + (r.seoScoreAfter!.overall - r.seoScoreBefore!.overall),
            0
          ) / withScores.length
        : 0;

    // Estimate time saved: each item would take ~5 min manually
    const estimatedTimeSavedMinutes = successful.length * 5;

    return {
      itemsProcessed: successful.length,
      itemsFailed: job.results.filter((r) => !r.success).length,
      avgSeoScoreImprovement: Math.round(avgImprovement * 10) / 10,
      totalTokensUsed: 0, // TODO: aggregate from results
      estimatedTimeSavedMinutes,
      processingTimeMs,
    };
  }

  private emptyMetrics(): JobMetrics {
    return {
      itemsProcessed: 0,
      itemsFailed: 0,
      avgSeoScoreImprovement: 0,
      totalTokensUsed: 0,
      estimatedTimeSavedMinutes: 0,
      processingTimeMs: 0,
    };
  }

  /** Remove oldest jobs when over the limit */
  private pruneOldJobs(): void {
    const sorted = Array.from(this.jobs.entries()).sort(
      ([, a], [, b]) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    while (sorted.length > config.jobs.maxHistory) {
      const [oldId] = sorted.shift()!;
      this.jobs.delete(oldId);
    }
  }
}

export const jobService = new JobService();
