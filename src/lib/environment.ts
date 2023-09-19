/**
 * Environment Variables
 *
 * Loaded at the start of the application, provides type safe access
 * to environment variables.
 *
 * The `ENV` object should be used in favour of `process.env`
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DEPLOYMENT: z.union([z.literal("dev"), z.literal("prod")]),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.number(),
  SESSION_SECRET: z.string(),
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.number(),
  EMAIL_USER: z.string(),
  EMAIL_PASSWORD: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
});

type Env = z.infer<typeof envSchema>;

export const ENV: Env = {
  DEPLOYMENT: process.env.DEPLOYMENT as "dev" | "prod",
  DB_USER: process.env.DB_USER as string,
  DB_PASSWORD: process.env.DB_PASSWORD as string,
  DB_HOST: process.env.DB_HOST as string,
  DB_PORT: Number(process.env.DB_PORT as string),
  SESSION_SECRET: process.env.SESSION_SECRET as string,
  EMAIL_HOST: process.env.EMAIL_HOST as string,
  EMAIL_PORT: Number(process.env.EMAIL_PORT as string),
  EMAIL_USER: process.env.EMAIL_USER as string,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD as string,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
} as const;

envSchema.parse(ENV);
