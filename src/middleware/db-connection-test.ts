import type { Request, Response, NextFunction } from "express";
import { pool } from "../lib/db.js";

/**
 * A Simple database connection checker middleware, tests the
 * database can be connected to and handles connection errors.
 */
export async function dbConnectionTest(
  req: Request<{}, {}, {}, { async?: "true" | "false" }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const connection = await pool.connect();
    connection.release();
    next();
  } catch {
    next(new Error("Unable to connect to Database"));
  }
}
