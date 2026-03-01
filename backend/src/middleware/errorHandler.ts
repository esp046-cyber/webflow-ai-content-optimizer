import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message}`, {
      path: req.path,
      details: err.details,
    });
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Axios / Webflow API errors
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: { status?: number; data?: unknown } }).response
  ) {
    const axiosErr = err as {
      response: { status: number; data: unknown };
      message: string;
    };
    const status = axiosErr.response.status ?? 502;
    logger.error(`Upstream API error [${status}]: ${axiosErr.message}`, {
      data: axiosErr.response.data,
    });
    res.status(status).json({
      success: false,
      error: "Upstream API error",
      message: axiosErr.message,
    });
    return;
  }

  // Generic errors
  const message =
    err instanceof Error ? err.message : "Internal server error";
  logger.error(`Unhandled error: ${message}`, { err, path: req.path });

  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? message
        : "An unexpected error occurred.",
  });
}
