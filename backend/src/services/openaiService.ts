import OpenAI from "openai";
import { config } from "../config";
import type {
  GenerateOptions,
  SeoRewriteOptions,
  ContentTone,
} from "../types";
import { logger } from "../utils/logger";

const openai = new OpenAI({ apiKey: config.openai.apiKey });

// ─── Tone Descriptors ─────────────────────────────────────────────────────────

const TONE_DESCRIPTIONS: Record<ContentTone, string> = {
  professional:
    "formal, polished, business-appropriate language with precise vocabulary",
  casual: "relaxed, conversational, approachable — like talking to a friend",
  technical:
    "precise, detailed, jargon-appropriate for an expert technical audience",
  friendly: "warm, encouraging, positive, inclusive language",
  authoritative:
    "confident, expert, backed by clear reasoning and expertise",
  conversational:
    "natural, direct, easy-to-read flow with short sentences",
};

// ─── System Prompts ───────────────────────────────────────────────────────────

function buildGenerateSystemPrompt(options: GenerateOptions): string {
  const toneDesc =
    TONE_DESCRIPTIONS[options.tone] ?? TONE_DESCRIPTIONS.professional;
  const keywords =
    options.targetKeywords.length > 0
      ? `Target keywords to naturally incorporate: ${options.targetKeywords.join(", ")}.`
      : "";

  return `You are an expert content writer specializing in web copy for Webflow CMS sites.
Your writing style is: ${toneDesc}.
${keywords}

Rules:
- Write compelling, original content optimized for both readers and search engines.
- Naturally incorporate target keywords at a density of 1.5–3% without stuffing.
- Vary sentence structure; avoid repetitive phrasing.
- Match the requested tone precisely.
- Respond ONLY with the requested content — no preamble, explanations, or meta-commentary.
- Output clean text without markdown unless specifically requested.`;
}

function buildSeoSystemPrompt(options: SeoRewriteOptions): string {
  const toneDesc =
    TONE_DESCRIPTIONS[options.tone] ?? TONE_DESCRIPTIONS.professional;
  const keywords =
    options.targetKeywords.length > 0
      ? `Primary keywords: ${options.targetKeywords.join(", ")}.`
      : "";

  return `You are an elite SEO content strategist and copywriter with deep expertise in:
- Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) framework
- On-page SEO optimization (title tags, meta descriptions, header structure)
- Readability optimization (Flesch-Kincaid, sentence length, active voice)
- Semantic keyword usage and NLP-friendly content patterns
- Conversion copywriting and user intent alignment

Tone: ${toneDesc}.
${keywords}

Optimization objectives:
1. Title: 50–60 chars, primary keyword near start, compelling click-through
2. Meta description: 150–160 chars, includes keyword + CTA, summarizes value
3. Body: Short paragraphs (2–4 sentences), active voice, keyword in first 100 words
4. E-E-A-T: Include experience signals, authoritative language, trust indicators
5. Readability: Target Flesch score 60–70 (easy to read for general audience)

IMPORTANT: Return a valid JSON object only. No markdown, no explanation outside JSON.`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class OpenAIService {
  // ─── Content Generation ─────────────────────────────────────────────────────

  /**
   * Generate new content for a specific field.
   * Uses the provided template or auto-creates a prompt from field name + context.
   */
  async generateContent(
    fieldName: string,
    context: Record<string, unknown>,
    options: GenerateOptions
  ): Promise<string> {
    const template =
      options.promptTemplate ??
      `Write compelling ${fieldName} content for a Webflow CMS item.
Context about this item: ${JSON.stringify(context, null, 2)}
Generate high-quality ${fieldName} content.`;

    logger.debug(`OpenAI.generateContent field=${fieldName}`);

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      max_tokens: options.maxTokens ?? config.openai.maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: buildGenerateSystemPrompt(options) },
        { role: "user", content: template },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  // ─── SEO Rewrite ─────────────────────────────────────────────────────────────

  /**
   * SEO-optimize existing content.
   * Returns structured JSON with optimized fields + analysis.
   */
  async seoRewrite(
    content: Record<string, unknown>,
    options: SeoRewriteOptions
  ): Promise<{
    optimized: Record<string, unknown>;
    analysis: {
      changes: string[];
      keywordsAdded: string[];
      readabilityImprovements: string[];
      eeAtSignals: string[];
    };
    tokensUsed: number;
  }> {
    logger.debug("OpenAI.seoRewrite");

    const userPrompt = `Analyze and SEO-optimize the following Webflow CMS content.

ORIGINAL CONTENT:
${JSON.stringify(content, null, 2)}

${
  options.targetKeywords.length > 0
    ? `TARGET KEYWORDS: ${options.targetKeywords.join(", ")}`
    : ""
}

OPTIMIZATION TARGETS:
${options.optimizeTitle !== false ? "✓ Title optimization" : ""}
${options.optimizeMeta !== false ? "✓ Meta description optimization" : ""}
${options.improveReadability !== false ? "✓ Readability improvement" : ""}
${options.boostEeat !== false ? "✓ E-E-A-T signal enhancement" : ""}

Return a JSON object with this exact structure:
{
  "optimized": { /* same keys as input, with optimized values */ },
  "analysis": {
    "changes": ["change description 1", ...],
    "keywordsAdded": ["keyword 1", ...],
    "readabilityImprovements": ["improvement 1", ...],
    "eeAtSignals": ["signal added 1", ...]
  }
}`;

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      max_tokens: options.maxTokens ?? config.openai.maxTokens,
      temperature: 0.3, // Lower temp for consistent SEO rewrites
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSeoSystemPrompt(options) },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawContent);

    return {
      optimized: parsed.optimized ?? content,
      analysis: parsed.analysis ?? {
        changes: [],
        keywordsAdded: [],
        readabilityImprovements: [],
        eeAtSignals: [],
      },
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }

  // ─── Embeddings ──────────────────────────────────────────────────────────────

  /**
   * Generate an embedding vector for a text.
   * Used for semantic SEO similarity comparisons.
   */
  async getEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text.slice(0, 8191), // token limit
    });
    return response.data[0]?.embedding ?? [];
  }

  /**
   * Cosine similarity between two embedding vectors.
   * Returns 0–1 where 1 = identical.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i]!, 0);
    const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }
}

export const openaiService = new OpenAIService();
