// ─── Webflow Types ────────────────────────────────────────────────────────────

export interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
  lastPublished: string | null;
  previewUrl: string | null;
  timeZone: string;
  customDomains: Array<{ url: string }>;
}

export interface WebflowCollection {
  id: string;
  displayName: string;
  singularName: string;
  slug: string;
  createdOn: string;
  lastUpdated: string;
  fields: WebflowField[];
}

export interface WebflowField {
  id: string;
  isEditable: boolean;
  isRequired: boolean;
  type: string;
  slug: string;
  displayName: string;
  helpText?: string;
}

export interface WebflowItem {
  id: string;
  cmsLocaleId?: string;
  lastPublished: string | null;
  lastUpdated: string;
  createdOn: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: Record<string, unknown>;
}

export interface WebflowItemsResponse {
  items: WebflowItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// ─── AI / SEO Types ───────────────────────────────────────────────────────────

export type OperationMode = "generate" | "seo-rewrite" | "auto-bulk";

export type ContentTone =
  | "professional"
  | "casual"
  | "technical"
  | "friendly"
  | "authoritative"
  | "conversational";

export interface GenerateOptions {
  tone: ContentTone;
  targetKeywords: string[];
  promptTemplate?: string;
  maxTokens?: number;
  preserveFields?: string[];
  fieldMappings?: Record<string, string>; // fieldSlug → instruction
}

export interface SeoRewriteOptions {
  targetKeywords: string[];
  tone: ContentTone;
  maxTokens?: number;
  preserveFields?: string[];
  optimizeTitle?: boolean;
  optimizeMeta?: boolean;
  improveReadability?: boolean;
  boostEeat?: boolean;
}

export interface SeoScore {
  overall: number; // 0–100
  title: number;
  meta: number;
  readability: number;
  keywordDensity: number;
  eeAt: number;
  suggestions: string[];
}

export interface ContentAnalysis {
  originalScore: SeoScore;
  optimizedScore?: SeoScore;
  wordCount: number;
  readingTime: number; // minutes
  fleschKincaid: number;
  keywordFrequency: Record<string, number>;
}

// ─── Job Types ────────────────────────────────────────────────────────────────

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "rolled_back";

export interface JobConfig {
  mode: OperationMode;
  webflowToken: string;
  siteId: string;
  collectionId: string;
  itemIds?: string[]; // empty = all items
  dryRun: boolean;
  concurrency?: number;
  options: GenerateOptions | SeoRewriteOptions;
}

export interface JobResult {
  itemId: string;
  itemName: string;
  success: boolean;
  error?: string;
  dryRun: boolean;
  originalData?: Record<string, unknown>;
  updatedData?: Record<string, unknown>;
  seoScoreBefore?: SeoScore;
  seoScoreAfter?: SeoScore;
  processingTimeMs: number;
}

export interface JobLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  itemId?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  config: JobConfig;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  results: JobResult[];
  logs: JobLog[];
  metrics: JobMetrics;
  rollbackData?: Array<{
    itemId: string;
    originalData: Record<string, unknown>;
  }>;
}

export interface JobMetrics {
  itemsProcessed: number;
  itemsFailed: number;
  avgSeoScoreImprovement: number;
  totalTokensUsed: number;
  estimatedTimeSavedMinutes: number;
  processingTimeMs: number;
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateJobRequest {
  mode: OperationMode;
  webflowToken: string;
  siteId: string;
  collectionId: string;
  itemIds?: string[];
  dryRun?: boolean;
  concurrency?: number;
  options: GenerateOptions | SeoRewriteOptions;
}

export interface GenerateContentRequest {
  text: string;
  fieldName: string;
  options: GenerateOptions;
}

export interface SeoRewriteRequest {
  content: {
    title?: string;
    metaDescription?: string;
    body?: string;
    [key: string]: unknown;
  };
  options: SeoRewriteOptions;
}

export interface AnalyzeContentRequest {
  text: string;
  targetKeywords?: string[];
}
