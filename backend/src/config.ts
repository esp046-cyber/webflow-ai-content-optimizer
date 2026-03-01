import dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  env: optional("NODE_ENV", "development"),
  port: parseInt(optional("PORT", "3001"), 10),
  frontendUrl: optional("FRONTEND_URL", "http://localhost:5173"),

  auth: {
    apiKey: required("APP_API_KEY"),
  },

  openai: {
    apiKey: required("OPENAI_API_KEY"),
    model: optional("OPENAI_MODEL", "gpt-4o"),
    embeddingModel: optional("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    maxTokens: parseInt(optional("OPENAI_MAX_TOKENS", "2048"), 10),
  },

  webflow: {
    defaultToken: optional("WEBFLOW_API_TOKEN", ""),
    apiUrl: optional("WEBFLOW_API_URL", "https://api.webflow.com/v2"),
  },

  rateLimit: {
    max: parseInt(optional("RATE_LIMIT_MAX", "100"), 10),
    windowMs: parseInt(optional("RATE_LIMIT_WINDOW_MS", "900000"), 10),
  },

  bulk: {
    concurrency: parseInt(optional("BULK_CONCURRENCY", "5"), 10),
  },

  jobs: {
    maxHistory: parseInt(optional("MAX_JOB_HISTORY", "50"), 10),
  },

  logging: {
    level: optional("LOG_LEVEL", "info"),
  },
} as const;

export type Config = typeof config;
