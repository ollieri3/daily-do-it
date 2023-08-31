import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { randomBytes, pbkdf2 } from "crypto";
import { pool } from "../lib/db.js";
import { mail } from "../lib/mail.js";
import dayjs from "dayjs";
import z from "zod";

function signIn(req: Request, res: Response) {
  let errors;
  if ("messages" in req.session && (req.session.messages as []).length > 0) {
    errors = (req.session.messages as []).pop();
  }
  if (req.user) {
    return res.redirect("/");
  }
  res.render("signin", { errors });
}

export const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const handleSignIn = passport.authenticate("local", {
  session: true,
  successRedirect: "/calendar",
  failureRedirect: "/signin",
  failureMessage: true,
});

function signUp(req: Request, res: Response) {
  res.render("signup");
}

function handleSignUp(req: Request, res: Response, next: NextFunction) {
  const salt = randomBytes(16);
  pbkdf2(
    req.body.password,
    salt,
    600_000,
    32,
    "sha256",
    async (err, derivedKey) => {
      if (err) return next(err);
      const hashedPassword = derivedKey.toString("hex");
      const saltString = salt.toString("hex");

      // Account activation stuff
      const token = randomBytes(16).toString("hex");
      console.log("token: ", token);

      const expires = dayjs().add(6, "hours").toISOString();
      console.log("expires: ", expires);

      try {
        console.log("Beginning transaction");
        await pool.query("BEGIN");

        console.log("Inserting user");
        const result = await pool.query(
          `INSERT INTO users(email, hashed_password, salt) VALUES($1, $2, $3) RETURNING id, email`,
          [req.body.email, hashedPassword, saltString],
        );

        console.log("Inserting activation token");
        await pool.query(
          `INSERT INTO activation_tokens (user_id, token, expires) VALUES($1, $2, $3)`,
          [result.rows[0].id, token, expires],
        );
        console.log("Committing transaction");
        await pool.query("COMMIT");
      } catch (err) {
        console.error(err);
        await pool.query("ROLLBACK");
        return next(err);
      }

      // TODO: Construct a proper URL here wih a token link
      // mail.sendAccountConfirmationEmail(req.body.email, token);

      return res.redirect("/");
    },
  );
}

function handleSignOut(req: Request, res: Response, next: NextFunction) {
  req.logout((err) => {
    if (err) return next(err);
    return res.redirect("/");
  });
}

const activateParamsSchema = z.object({
  token: z.string().min(1),
});
async function activate(req: Request, res: Response, next: NextFunction) {
  activateParamsSchema.parse(req.params);

  // Check if token exists
  const tokenResults = await pool.query(
    `SELECT id, user_id, token, expires FROM activation_tokens WHERE token = $1`,
    [req.params.token],
  );

  if (tokenResults.rowCount <= 0) {
    return next(new Error("Invalid activation token"));
  }

  const activationToken = tokenResults.rows[0];
  // See if it's expired
  if (dayjs() > dayjs(activationToken.expires)) {
    // TODO: Figure out what to do here
    next(new Error("This activation token has expired"));
  }

  // TODO: See if the user assigned to the token still exists

  // Set the user assigned to token as active
  const userResults = await pool.query(
    `UPDATE users set active = true WHERE id = $1`,
    [activationToken.user_id],
  );

  // Delete the token
  const deleteResults = await pool.query(
    `DELETE FROM activation_tokens WHERE id = $1`,
    [activationToken.id],
  );

  //TODO: Switch this to a flash message
  res.render("activation_success");
}

export const auth = {
  signIn,
  handleSignIn,
  signUp,
  handleSignUp,
  handleSignOut,
  activate,
};
