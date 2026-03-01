import type { Job, JobResult } from "../types";

/**
 * Convert a job's results to a CSV string for download.
 */
export function generateCsvReport(job: Job): string {
  const headers = [
    "Item ID",
    "Item Name",
    "Status",
    "Dry Run",
    "SEO Score Before",
    "SEO Score After",
    "SEO Improvement",
    "Processing Time (ms)",
    "Error",
  ];

  const rows = job.results.map((r: JobResult) => {
    const scoreBefore = r.seoScoreBefore?.overall ?? "";
    const scoreAfter = r.seoScoreAfter?.overall ?? "";
    const improvement =
      scoreBefore !== "" && scoreAfter !== ""
        ? (scoreAfter as number) - (scoreBefore as number)
        : "";

    return [
      r.itemId,
      escapeCsv(r.itemName),
      r.success ? "success" : "failed",
      r.dryRun ? "yes" : "no",
      scoreBefore,
      scoreAfter,
      improvement,
      r.processingTimeMs,
      escapeCsv(r.error ?? ""),
    ];
  });

  // Summary row
  const totalImprovement = job.results
    .filter(
      (r) =>
        r.seoScoreBefore?.overall !== undefined &&
        r.seoScoreAfter?.overall !== undefined
    )
    .reduce(
      (sum, r) =>
        sum + (r.seoScoreAfter!.overall - r.seoScoreBefore!.overall),
      0
    );

  const avgImprovement =
    job.results.length > 0
      ? (totalImprovement / job.results.length).toFixed(1)
      : 0;

  const summary = [
    "",
    "SUMMARY",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `Total Items: ${job.results.length}`,
    `Successful: ${job.results.filter((r) => r.success).length}`,
    `Failed: ${job.results.filter((r) => !r.success).length}`,
    `Avg SEO Improvement: ${avgImprovement}pts`,
    `Total Time: ${job.metrics.processingTimeMs}ms`,
  ];

  const lines = [
    headers.join(","),
    ...rows.map((r) => r.join(",")),
    "",
    summary.join(","),
  ];

  return lines.join("\r\n");
}

function escapeCsv(value: string): string {
  if (!value) return "";
  // Wrap in quotes if contains comma, quote, or newline
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
