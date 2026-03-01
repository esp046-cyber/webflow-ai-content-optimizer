import rateLimit from "express-rate-limit";
import { config } from "../config";

/** General rate limiter for all API routes */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests",
    message: `Rate limit exceeded. Max ${config.rateLimit.max} requests per ${
      config.rateLimit.windowMs / 60000
    } minutes.`,
  },
  skip: (req) => req.path === "/health",
});

/** Stricter limiter for expensive AI operations */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "AI rate limit exceeded",
    message: "Maximum 20 AI requests per minute. Please wait before retrying.",
  },
});

/** Limiter for bulk job creation */
export const jobRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Job rate limit exceeded",
    message: "Maximum 10 bulk jobs per 5 minutes.",
  },
});
