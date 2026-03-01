import { describe, it, expect } from "vitest";
import { generateCsvReport } from "../src/utils/csvExport";
import type { Job } from "../src/types";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "test-job-1",
    status: "completed",
    config: {
      mode: "seo-rewrite",
      webflowToken: "tok",
      siteId: "site1",
      collectionId: "col1",
      dryRun: false,
      options: { tone: "professional", targetKeywords: [] },
    },
    createdAt: new Date().toISOString(),
    progress: { total: 2, completed: 2, failed: 0, percentage: 100 },
    results: [
      {
        itemId: "item-1",
        itemName: "Article One",
        success: true,
        dryRun: false,
        seoScoreBefore: {
          overall: 55,
          title: 60,
          meta: 40,
          readability: 70,
          keywordDensity: 50,
          eeAt: 40,
          suggestions: [],
        },
        seoScoreAfter: {
          overall: 80,
          title: 85,
          meta: 75,
          readability: 80,
          keywordDensity: 80,
          eeAt: 70,
          suggestions: [],
        },
        processingTimeMs: 1200,
      },
      {
        itemId: "item-2",
        itemName: 'Article with "quotes", commas',
        success: false,
        dryRun: false,
        error: "API timeout",
        processingTimeMs: 5000,
      },
    ],
    logs: [],
    metrics: {
      itemsProcessed: 1,
      itemsFailed: 1,
      avgSeoScoreImprovement: 25,
      totalTokensUsed: 500,
      estimatedTimeSavedMinutes: 5,
      processingTimeMs: 6200,
    },
    ...overrides,
  };
}

describe("generateCsvReport", () => {
  it("produces valid CSV with header + 2 data rows", () => {
    const csv = generateCsvReport(makeJob());
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines[0]).toContain("Item ID");
    expect(lines[0]).toContain("SEO Score Before");
    expect(lines[1]).toContain("item-1");
    expect(lines[1]).toContain("success");
    expect(lines[2]).toContain("failed");
  });

  it("escapes fields with commas and quotes", () => {
    const csv = generateCsvReport(makeJob());
    expect(csv).toContain('"Article with ""quotes"", commas"');
  });

  it("includes SEO improvement calculation", () => {
    const csv = generateCsvReport(makeJob());
    // Improvement: 80 - 55 = 25
    expect(csv).toContain("25");
  });
});
