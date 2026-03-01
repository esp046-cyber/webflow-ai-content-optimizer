import type { SeoScore, ContentAnalysis } from "../types";

/**
 * SeoService — heuristic SEO scoring engine.
 *
 * Scores content across 5 dimensions:
 *  1. Title optimization     (25%)
 *  2. Meta description       (20%)
 *  3. Readability            (20%)
 *  4. Keyword density        (15%)
 *  5. E-E-A-T signals        (20%)
 */
export class SeoService {
  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Score a piece of content. Pass title, meta, and/or body.
   * targetKeywords: keywords to check frequency for.
   */
  score(
    content: {
      title?: string;
      metaDescription?: string;
      body?: string;
      [key: string]: unknown;
    },
    targetKeywords: string[] = []
  ): SeoScore {
    const title = (content.title as string) ?? "";
    const meta = (content.metaDescription as string) ?? "";
    // Combine all string fields as "body" if not explicitly provided
    const body =
      (content.body as string) ??
      Object.values(content)
        .filter((v): v is string => typeof v === "string")
        .join(" ");

    const titleScore = this.scoreTitleTag(title, targetKeywords);
    const metaScore = this.scoreMetaDescription(meta, targetKeywords);
    const readabilityScore = this.scoreReadability(body);
    const keywordScore = this.scoreKeywordDensity(body, targetKeywords);
    const eeAtScore = this.scoreEeat(title, meta, body);

    const overall = Math.round(
      titleScore * 0.25 +
        metaScore * 0.2 +
        readabilityScore * 0.2 +
        keywordScore * 0.15 +
        eeAtScore * 0.2
    );

    const suggestions = this.generateSuggestions(
      { title, meta, body },
      { titleScore, metaScore, readabilityScore, keywordScore, eeAtScore },
      targetKeywords
    );

    return {
      overall,
      title: titleScore,
      meta: metaScore,
      readability: readabilityScore,
      keywordDensity: keywordScore,
      eeAt: eeAtScore,
      suggestions,
    };
  }

  /**
   * Full content analysis including word count, reading time, FK grade.
   */
  analyze(
    content: Record<string, unknown>,
    targetKeywords: string[] = []
  ): ContentAnalysis {
    const allText = Object.values(content)
      .filter((v): v is string => typeof v === "string")
      .join(" ");

    const wordCount = this.countWords(allText);
    const readingTime = Math.max(1, Math.round(wordCount / 200));
    const fleschKincaid = this.fleschKincaidGrade(allText);

    const keywordFrequency: Record<string, number> = {};
    for (const kw of targetKeywords) {
      keywordFrequency[kw] = this.keywordFrequency(allText, kw);
    }

    const originalScore = this.score(
      content as { title?: string; metaDescription?: string; body?: string },
      targetKeywords
    );

    return {
      originalScore,
      wordCount,
      readingTime,
      fleschKincaid,
      keywordFrequency,
    };
  }

  // ─── Scoring Dimensions ──────────────────────────────────────────────────────

  private scoreTitleTag(title: string, keywords: string[]): number {
    if (!title) return 0;

    let score = 50; // base
    const len = title.length;

    // Length: 50–60 is ideal
    if (len >= 50 && len <= 60) score += 30;
    else if (len >= 40 && len < 50) score += 20;
    else if (len > 60 && len <= 70) score += 15;
    else if (len > 0) score += 5;

    // Keyword in title
    const titleLower = title.toLowerCase();
    if (keywords.length > 0) {
      const primaryKw = keywords[0]!.toLowerCase();
      if (titleLower.startsWith(primaryKw)) score += 20;
      else if (titleLower.includes(primaryKw)) score += 12;
    } else {
      score += 10; // no keyword requirement
    }

    return Math.min(100, score);
  }

  private scoreMetaDescription(meta: string, keywords: string[]): number {
    if (!meta) return 0;

    let score = 40;
    const len = meta.length;

    // Length: 150–160 is ideal
    if (len >= 150 && len <= 160) score += 30;
    else if (len >= 120 && len < 150) score += 20;
    else if (len > 160 && len <= 180) score += 15;
    else if (len > 0) score += 5;

    // Keyword presence
    const metaLower = meta.toLowerCase();
    if (keywords.length > 0 && metaLower.includes(keywords[0]!.toLowerCase())) {
      score += 15;
    }

    // CTA indicators
    const ctaWords = [
      "learn",
      "discover",
      "get",
      "find",
      "explore",
      "start",
      "try",
      "read",
      "download",
      "sign up",
    ];
    if (ctaWords.some((cta) => metaLower.includes(cta))) score += 15;

    return Math.min(100, score);
  }

  private scoreReadability(text: string): number {
    if (!text || text.length < 50) return 30;

    const flesch = this.fleschReadingEase(text);

    // Flesch 60–70 = "Standard" (ideal for web)
    if (flesch >= 60 && flesch <= 80) return 90;
    if (flesch >= 50 && flesch < 60) return 75;
    if (flesch >= 80 && flesch <= 90) return 80;
    if (flesch >= 40 && flesch < 50) return 60;
    if (flesch >= 90) return 65; // too simple
    return 40;
  }

  private scoreKeywordDensity(text: string, keywords: string[]): number {
    if (!text || keywords.length === 0) return 50; // neutral if no keywords

    const wordCount = this.countWords(text);
    if (wordCount < 20) return 30;

    const primaryKw = keywords[0]!;
    const freq = this.keywordFrequency(text, primaryKw);
    const density = (freq / wordCount) * 100;

    // Ideal: 1.5–3%
    if (density >= 1.5 && density <= 3) return 95;
    if (density >= 1 && density < 1.5) return 75;
    if (density > 3 && density <= 4) return 65;
    if (density >= 0.5 && density < 1) return 55;
    if (density > 4) return 30; // keyword stuffing
    return 20;
  }

  private scoreEeat(title: string, meta: string, body: string): number {
    const fullText = `${title} ${meta} ${body}`.toLowerCase();
    let score = 40;

    // Experience signals
    const experienceTerms = [
      "years of experience",
      "we've helped",
      "our clients",
      "case study",
      "results",
      "proven",
      "tested",
    ];
    score += experienceTerms.filter((t) => fullText.includes(t)).length * 5;

    // Expertise signals
    const expertiseTerms = [
      "expert",
      "specialist",
      "certified",
      "professional",
      "industry",
      "research",
      "study",
      "data",
      "according to",
    ];
    score += expertiseTerms.filter((t) => fullText.includes(t)).length * 4;

    // Authority signals
    const authorityTerms = [
      "award",
      "recognized",
      "featured in",
      "trusted",
      "partner",
      "official",
      "leader",
    ];
    score += authorityTerms.filter((t) => fullText.includes(t)).length * 5;

    // Trust signals
    const trustTerms = [
      "guarantee",
      "secure",
      "privacy",
      "transparent",
      "honest",
      "authentic",
      "verified",
    ];
    score += trustTerms.filter((t) => fullText.includes(t)).length * 4;

    return Math.min(100, score);
  }

  // ─── Suggestions Engine ──────────────────────────────────────────────────────

  private generateSuggestions(
    content: { title: string; meta: string; body: string },
    scores: Record<string, number>,
    keywords: string[]
  ): string[] {
    const suggestions: string[] = [];

    if (scores["titleScore"]! < 70) {
      if (!content.title) {
        suggestions.push("Add a title tag (50–60 characters recommended)");
      } else if (content.title.length < 40) {
        suggestions.push(
          `Expand title (currently ${content.title.length} chars; target 50–60)`
        );
      } else if (content.title.length > 65) {
        suggestions.push(
          `Shorten title (currently ${content.title.length} chars; target 50–60)`
        );
      }
      if (keywords.length > 0 && !content.title.toLowerCase().includes(keywords[0]!.toLowerCase())) {
        suggestions.push(`Include primary keyword "${keywords[0]}" in title`);
      }
    }

    if (scores["metaScore"]! < 70) {
      if (!content.meta) {
        suggestions.push("Add a meta description (150–160 characters)");
      } else if (content.meta.length < 120) {
        suggestions.push(
          `Expand meta description to 150–160 characters (currently ${content.meta.length})`
        );
      }
    }

    if (scores["readabilityScore"]! < 70) {
      suggestions.push(
        "Improve readability: use shorter sentences and simpler vocabulary"
      );
      suggestions.push(
        "Break up long paragraphs into 2–3 sentence chunks"
      );
    }

    if (scores["keywordScore"]! < 70 && keywords.length > 0) {
      suggestions.push(
        `Increase usage of "${keywords[0]}" to achieve 1.5–3% keyword density`
      );
    }

    if (scores["eeAtScore"]! < 70) {
      suggestions.push(
        "Add E-E-A-T signals: mention experience, credentials, or proven results"
      );
      suggestions.push(
        "Include trust indicators: guarantees, certifications, or client testimonials"
      );
    }

    return suggestions;
  }

  // ─── Text Analysis Utilities ─────────────────────────────────────────────────

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private countSentences(text: string): number {
    return (text.match(/[.!?]+/g) ?? []).length || 1;
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /** Flesch Reading Ease score (0–100, higher = easier) */
  private fleschReadingEase(text: string): number {
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = text
      .split(/\s+/)
      .reduce((sum, w) => sum + this.countSyllables(w), 0);

    if (words === 0 || sentences === 0) return 50;

    return (
      206.835 -
      1.015 * (words / sentences) -
      84.6 * (syllables / words)
    );
  }

  /** Flesch-Kincaid Grade Level */
  fleschKincaidGrade(text: string): number {
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = text
      .split(/\s+/)
      .reduce((sum, w) => sum + this.countSyllables(w), 0);

    if (words === 0 || sentences === 0) return 8;

    return (
      0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    );
  }

  /** Count occurrences of a keyword (case-insensitive, whole-word) */
  private keywordFrequency(text: string, keyword: string): number {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    return (text.match(regex) ?? []).length;
  }
}

export const seoService = new SeoService();
