import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config";
import { requireApiKey } from "./middleware/auth";
import { generalRateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { webflowRouter } from "./routes/webflow";
import { aiRouter } from "./routes/ai";
import { jobsRouter } from "./routes/jobs";
import { logger } from "./utils/logger";

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // frontend handles CSP
  })
);

app.use(
  cors({
    origin: [config.frontendUrl, "http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-API-Key",
      "X-Webflow-Token",
      "Authorization",
    ],
    credentials: true,
  })
);

// ─── Parsing & Logging ────────────────────────────────────────────────────────

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(config.env === "development" ? "dev" : "combined", {
    skip: (req) => req.path === "/health",
  })
);

// ─── Health Check (public) ────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    uptime: Math.floor(process.uptime()),
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Docs (public) ────────────────────────────────────────────────────────

app.get("/api/docs", (_req, res) => {
  res.json({
    name: "Webflow AI Content Optimizer API",
    version: "1.0.0",
    authentication: "X-API-Key header required for all /api/* routes",
    webflowToken: "X-Webflow-Token header required for Webflow routes",
    endpoints: {
      health: "GET /health",
      webflow: {
        sites: "GET /api/webflow/sites",
        site: "GET /api/webflow/sites/:siteId",
        collections: "GET /api/webflow/sites/:siteId/collections",
        collection: "GET /api/webflow/collections/:collectionId",
        items: "GET /api/webflow/collections/:collectionId/items",
        item: "GET /api/webflow/collections/:collectionId/items/:itemId",
      },
      ai: {
        generate: "POST /api/ai/generate",
        seoRewrite: "POST /api/ai/seo-rewrite",
        analyze: "POST /api/ai/analyze",
        embedding: "POST /api/ai/embedding",
      },
      jobs: {
        create: "POST /api/jobs",
        list: "GET /api/jobs",
        get: "GET /api/jobs/:id",
        stream: "GET /api/jobs/:id/stream",
        rollback: "POST /api/jobs/:id/rollback",
        report: "GET /api/jobs/:id/report",
      },
    },
  });
});

// ─── Protected API Routes ─────────────────────────────────────────────────────

app.use("/api", generalRateLimiter, requireApiKey);
app.use("/api/webflow", webflowRouter);
app.use("/api/ai", aiRouter);
app.use("/api/jobs", jobsRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  logger.info(`🚀 Server running on http://localhost:${config.port}`);
  logger.info(`📖 API docs: http://localhost:${config.port}/api/docs`);
  logger.info(`🏥 Health: http://localhost:${config.port}/health`);
  logger.info(`   Environment: ${config.env}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received — shutting down");
  server.close(() => process.exit(0));
});

export { app };
