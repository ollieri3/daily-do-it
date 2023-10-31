import { pool } from "../lib/db.js";

type CreateUserInput = {
  email: string;
  password: string;
  salt: string;
  activationToken: string;
  activationTokenExpiry: string;
};
async function create(
  user: CreateUserInput,
): Promise<{ id: string; email: string }> {
  try {
    // Start a transaction
    await pool.query("BEGIN");

    const userInsertionResult = await pool.query<{ id: string; email: string }>(
      `INSERT INTO users(email, hashed_password, salt) VALUES($1, $2, $3) RETURNING id, email`,
      [user.email, user.password, user.salt],
    );

    const newUser = userInsertionResult.rows[0];

    await pool.query(
      `INSERT INTO activation_tokens (user_id, token, expires) VALUES($1, $2, $3)`,
      [newUser.id, user.activationToken, user.activationTokenExpiry],
    );

    // Commit transaction
    await pool.query("COMMIT");
    return { id: newUser.id, email: newUser.email };
  } catch (err) {
    // Rollback transaction on failure
    await pool.query("ROLLBACK");
    throw err;
  }
}

async function doesExistWithEmail(email: string): Promise<boolean> {
  const emailResult = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email],
  );
  return emailResult.rowCount > 0;
}

async function activate(id: string): Promise<void> {
  await pool.query(`UPDATE users set active = true WHERE id = $1`, [id]);
}

async function isActive(id: string): Promise<boolean> {
  const activeResult = await pool.query(
    `SELECT active FROM USERS WHERE id = $1`,
    [id],
  );
  return activeResult.rowCount > 0;
}

export const user = {
  create,
  activate,
  isActive,
  doesExistWithEmail,
};
