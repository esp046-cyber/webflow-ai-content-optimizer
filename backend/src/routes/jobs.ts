import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { jobService } from "../services/jobService";
import { jobRateLimiter } from "../middleware/rateLimiter";
import { AppError } from "../middleware/errorHandler";
import { generateCsvReport } from "../utils/csvExport";

export const jobsRouter = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const toneSchema = z.enum([
  "professional",
  "casual",
  "technical",
  "friendly",
  "authoritative",
  "conversational",
]);

const createJobSchema = z.object({
  mode: z.enum(["generate", "seo-rewrite", "auto-bulk"]),
  webflowToken: z.string().min(1),
  siteId: z.string().min(1),
  collectionId: z.string().min(1),
  itemIds: z.array(z.string()).optional(),
  dryRun: z.boolean().optional().default(false),
  concurrency: z.number().min(1).max(20).optional(),
  options: z.object({
    tone: toneSchema.optional().default("professional"),
    targetKeywords: z.array(z.string()).optional().default([]),
    promptTemplate: z.string().optional(),
    maxTokens: z.number().optional(),
    preserveFields: z.array(z.string()).optional(),
    fieldMappings: z.record(z.string()).optional(),
    optimizeTitle: z.boolean().optional(),
    optimizeMeta: z.boolean().optional(),
    improveReadability: z.boolean().optional(),
    boostEeat: z.boolean().optional(),
  }),
});

// ─── POST /api/jobs — create and start a job ──────────────────────────────────

jobsRouter.post("/", jobRateLimiter, async (req: Request, res: Response) => {
  const body = createJobSchema.parse(req.body);

  const job = jobService.createJob({
    mode: body.mode,
    webflowToken: body.webflowToken,
    siteId: body.siteId,
    collectionId: body.collectionId,
    itemIds: body.itemIds,
    dryRun: body.dryRun,
    concurrency: body.concurrency,
    options: body.options as Parameters<typeof jobService.createJob>[0]["options"],
  });

  // Start async (non-blocking)
  jobService.startJob(job.id).catch(() => {
    // Error captured inside job logs
  });

  res.status(202).json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      streamUrl: `/api/jobs/${job.id}/stream`,
    },
    message: `Job ${job.id} created and started.`,
  });
});

// ─── GET /api/jobs — list all jobs ───────────────────────────────────────────

jobsRouter.get("/", (req: Request, res: Response) => {
  const jobs = jobService.listJobs().map((j) => ({
    id: j.id,
    status: j.status,
    mode: j.config.mode,
    dryRun: j.config.dryRun,
    collectionId: j.config.collectionId,
    createdAt: j.createdAt,
    completedAt: j.completedAt,
    progress: j.progress,
    metrics: j.metrics,
  }));

  res.json({ success: true, data: jobs });
});

// ─── GET /api/jobs/:id — get job status ──────────────────────────────────────

jobsRouter.get("/:id", (req: Request, res: Response) => {
  const job = jobService.getJob(req.params.id!);
  if (!job) throw new AppError(404, `Job ${req.params.id} not found`);
  res.json({ success: true, data: job });
});

// ─── GET /api/jobs/:id/stream — SSE real-time log stream ──────────────────────

jobsRouter.get("/:id/stream", (req: Request, res: Response) => {
  const jobId = req.params.id!;
  const job = jobService.getJob(jobId);
  if (!job) throw new AppError(404, `Job ${jobId} not found`);

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no", // disable Nginx buffering
  });

  // Send initial snapshot
  res.write(
    `data: ${JSON.stringify({ type: "snapshot", job })}\n\n`
  );

  const send = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Listen for events
  jobService.on(`job:${jobId}`, send);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  // Cleanup on client disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    jobService.off(`job:${jobId}`, send);
  });

  // Auto-close SSE when job completes
  if (job.status === "completed" || job.status === "failed") {
    send({ type: "complete", job });
    clearInterval(heartbeat);
    jobService.off(`job:${jobId}`, send);
    res.end();
  }
});

// ─── POST /api/jobs/:id/rollback ──────────────────────────────────────────────

jobsRouter.post("/:id/rollback", async (req: Request, res: Response) => {
  const jobId = req.params.id!;
  await jobService.rollbackJob(jobId);
  const job = jobService.getJob(jobId);
  res.json({
    success: true,
    data: { status: job?.status, jobId },
    message: "Rollback completed successfully.",
  });
});

// ─── GET /api/jobs/:id/report — download CSV ─────────────────────────────────

jobsRouter.get("/:id/report", (req: Request, res: Response) => {
  const jobId = req.params.id!;
  const job = jobService.getJob(jobId);
  if (!job) throw new AppError(404, `Job ${jobId} not found`);

  const csv = generateCsvReport(job);
  const filename = `job-${jobId}-report-${new Date().toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});
