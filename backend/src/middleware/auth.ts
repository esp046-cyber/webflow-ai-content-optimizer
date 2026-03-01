import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

/**
 * Simple API-key authentication middleware.
 * Checks the X-API-Key header against the configured APP_API_KEY.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth for health check and docs
  const PUBLIC_PATHS = ["/health", "/api/docs", "/api/docs.json"];
  if (PUBLIC_PATHS.includes(req.path)) {
    return next();
  }

  const providedKey =
    req.headers["x-api-key"] ?? req.query["api_key"];

  if (!providedKey) {
    res.status(401).json({
      success: false,
      error: "Missing X-API-Key header",
      message:
        "Provide your API key in the X-API-Key request header.",
    });
    return;
  }

  if (providedKey !== config.auth.apiKey) {
    res.status(403).json({
      success: false,
      error: "Invalid API key",
      message: "The provided API key is not valid.",
    });
    return;
  }

  next();
}
