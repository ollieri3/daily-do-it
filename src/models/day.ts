import { pool } from "../lib/db.js";

async function exists(date: string, userId: string): Promise<boolean> {
  const existingEntryRows = await pool.query(
    ` SELECT id FROM days WHERE date = $1 AND user_id = $2`,
    [date, userId],
  );
  return existingEntryRows.rows.length > 0;
}

async function create(date: string, userId: string): Promise<void> {
  await pool.query(`INSERT INTO days (date, user_id) VALUES ($1, $2)`, [
    date,
    userId,
  ]);
}

async function remove(date: string, userId: string): Promise<void> {
  await pool.query(`DELETE FROM days WHERE date = $1 AND user_id = $2`, [
    date,
    userId,
  ]);
}

async function getAllForUserInYear(
  userId: string,
  year: string,
): Promise<{ id: number; date: string }[]> {
  const { rows } = await pool.query(
    `SELECT id, date FROM days WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2`,
    [userId, year],
  );
  return rows;
}

export const day = {
  exists,
  create,
  remove,
  getAllForUserInYear,
};
