import { describe, it, expect } from "vitest";
import { SeoService } from "../src/services/seoService";

const seo = new SeoService();

describe("SeoService.score", () => {
  it("returns overall 0–100", () => {
    const result = seo.score({ title: "Test", body: "Hello world" }, []);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("scores a well-optimized title highly", () => {
    const title = "Best React Hooks Guide for Beginners 2024";
    const result = seo.score({ title }, ["react hooks"]);
    expect(result.title).toBeGreaterThan(50);
  });

  it("penalizes missing meta description", () => {
    const result = seo.score({ title: "Test Title" });
    expect(result.meta).toBe(0);
  });

  it("scores ideal meta description highly", () => {
    const meta =
      "Learn the best React hooks for beginners in 2024. Discover useState, useEffect, and more with clear examples and best practices today.";
    const result = seo.score({ metaDescription: meta }, ["react hooks"]);
    expect(result.meta).toBeGreaterThan(60);
  });

  it("scores keyword density within 1.5–3% as near-perfect", () => {
    // 2% density: 2 occurrences in 100 words
    const body = Array(98).fill("word").join(" ") + " react hooks react hooks";
    const result = seo.score({ body }, ["react hooks"]);
    expect(result.keywordDensity).toBeGreaterThan(80);
  });

  it("generates suggestions for low scores", () => {
    const result = seo.score({ body: "Short." }, ["keyword"]);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe("SeoService.analyze", () => {
  it("returns word count and reading time", () => {
    const text = Array(200).fill("word").join(" ");
    const result = seo.analyze({ body: text }, []);
    expect(result.wordCount).toBe(200);
    expect(result.readingTime).toBe(1);
  });

  it("computes keyword frequency", () => {
    const result = seo.analyze(
      { body: "The quick brown fox jumps over the lazy dog fox" },
      ["fox"]
    );
    expect(result.keywordFrequency["fox"]).toBe(2);
  });
});
