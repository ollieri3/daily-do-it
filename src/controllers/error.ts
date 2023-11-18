import type { Request, Response, NextFunction } from "express";

/**
 * This handler exists purely to force an error to test error handling.
 */
export function errorTest(
  req: Request<{}, {}, {}, { async?: "true" | "false" }>,
  res: Response,
  next: NextFunction,
) {
  if (req.query.async === "true") {
    return process.nextTick(() => {
      next(new Error("This is a test async error"));
    });
  }
  throw new Error("This is a test error");
}
