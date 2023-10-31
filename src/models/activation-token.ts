import { pool } from "../lib/db.js";

export async function get(
  token: string,
): Promise<{ id: string; userId: string; expires: string }> {
  const activationTokenResult = await pool.query(
    `SELECT id, user_id, expires FROM activation_tokens WHERE token = $1`,
    [token],
  );
  const activationToken = activationTokenResult.rows[0];
  return {
    id: activationToken.id,
    userId: activationToken.user_id,
    expires: activationToken.expires,
  };
}

async function remove(id: string) {
  await pool.query(`DELETE FROM activation_tokens WHERE id = $1`, [id]);
}

export const activationToken = {
  get,
  remove,
};
