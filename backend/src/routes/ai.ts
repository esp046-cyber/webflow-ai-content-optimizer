import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { openaiService } from "../services/openaiService";
import { seoService } from "../services/seoService";
import { aiRateLimiter } from "../middleware/rateLimiter";

export const aiRouter = Router();

// Apply stricter rate limiting to all AI routes
aiRouter.use(aiRateLimiter);

// ─── Validation Schemas ───────────────────────────────────────────────────────

const toneSchema = z.enum([
  "professional",
  "casual",
  "technical",
  "friendly",
  "authoritative",
  "conversational",
]);

const generateOptionsSchema = z.object({
  tone: toneSchema.default("professional"),
  targetKeywords: z.array(z.string()).default([]),
  promptTemplate: z.string().optional(),
  maxTokens: z.number().min(100).max(4096).optional(),
  preserveFields: z.array(z.string()).optional(),
  fieldMappings: z.record(z.string()).optional(),
});

const seoOptionsSchema = z.object({
  tone: toneSchema.default("professional"),
  targetKeywords: z.array(z.string()).default([]),
  maxTokens: z.number().min(100).max(4096).optional(),
  preserveFields: z.array(z.string()).optional(),
  optimizeTitle: z.boolean().optional(),
  optimizeMeta: z.boolean().optional(),
  improveReadability: z.boolean().optional(),
  boostEeat: z.boolean().optional(),
});

// ─── POST /api/ai/generate ─────────────────────────────────────────────────────

const generateSchema = z.object({
  text: z.string().max(10000),
  fieldName: z.string().min(1),
  options: generateOptionsSchema,
});

aiRouter.post("/generate", async (req: Request, res: Response) => {
  const { fieldName, text, options } = generateSchema.parse(req.body);

  const generated = await openaiService.generateContent(
    fieldName,
    { existingContent: text },
    options
  );

  res.json({
    success: true,
    data: { generated, fieldName },
  });
});

// ─── POST /api/ai/seo-rewrite ──────────────────────────────────────────────────

const seoRewriteSchema = z.object({
  content: z.record(z.unknown()),
  options: seoOptionsSchema,
});

aiRouter.post("/seo-rewrite", async (req: Request, res: Response) => {
  const { content, options } = seoRewriteSchema.parse(req.body);

  const result = await openaiService.seoRewrite(content, options);

  // Score before and after
  const keywords = options.targetKeywords;
  const scoreBefore = seoService.score(
    content as { title?: string; metaDescription?: string; body?: string },
    keywords
  );
  const scoreAfter = seoService.score(
    result.optimized as { title?: string; metaDescription?: string; body?: string },
    keywords
  );

  res.json({
    success: true,
    data: {
      optimized: result.optimized,
      analysis: result.analysis,
      scoreBefore,
      scoreAfter,
      improvement: scoreAfter.overall - scoreBefore.overall,
      tokensUsed: result.tokensUsed,
    },
  });
});

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────

const analyzeSchema = z.object({
  content: z.record(z.unknown()),
  targetKeywords: z.array(z.string()).optional().default([]),
});

aiRouter.post("/analyze", async (req: Request, res: Response) => {
  const { content, targetKeywords } = analyzeSchema.parse(req.body);

  const analysis = seoService.analyze(
    content as Record<string, unknown>,
    targetKeywords
  );

  res.json({ success: true, data: analysis });
});

// ─── POST /api/ai/embedding ───────────────────────────────────────────────────

const embeddingSchema = z.object({
  text: z.string().min(1).max(8000),
});

aiRouter.post("/embedding", async (req: Request, res: Response) => {
  const { text } = embeddingSchema.parse(req.body);
  const embedding = await openaiService.getEmbedding(text);
  res.json({
    success: true,
    data: { dimensions: embedding.length, embedding },
  });
});
