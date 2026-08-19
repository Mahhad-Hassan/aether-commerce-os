import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("[Backend Error Handler]:", err.message || err);

  const statusCode = err.statusCode || err.response?.status || 500;
  const message = err.message || err.response?.data?.message || "Internal Server Error";
  const details = err.response?.data || undefined;

  res.status(statusCode).json({
    error: true,
    message,
    ...(details ? { details } : {}),
  });
}
