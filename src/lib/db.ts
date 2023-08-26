import pg from "pg";
import { ENV } from "./environment.js";

export const pool = new pg.Pool({
  user: ENV.DB_USER,
  host: ENV.DB_HOST,
  database: "dailydoit",
  password: ENV.DB_PASSWORD,
  port: ENV.DB_PORT,
});
