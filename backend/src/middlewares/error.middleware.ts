import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("[Backend Error Handler]:", err.message || err);

  const statusCode = err.statusCode || err.response?.status || 500;
  const details = err.response?.data || undefined;
  const message =
    details?.message ||
    details?.exception ||
    details?.exc_type ||
    err.message ||
    "Internal Server Error";

  res.status(statusCode).json({
    error: true,
    message,
    ...(details ? { details } : {}),
  });
}
