import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { randomBytes, pbkdf2 } from "crypto";
import dayjs from "dayjs";
import z from "zod";
import validator from "validator";

import { pool } from "../lib/db.js";
import { user } from "../lib/user.js";
import { emailSchema, passwordSchema } from "../helpers/validations.js";
import { ENV } from "../lib/environment.js";

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
  windowMs: 60 * 60 * 1000, // 1Hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.DEPLOYMENT === "dev",
});

const handleSignIn = passport.authenticate("local", {
  session: true,
  failureRedirect: "/signin",
  passReqToCallback: true,
});

const googleSignIn = passport.authenticate("google");

const googleSignInRedirect = passport.authenticate("google", {
  session: true,
  failureRedirect: "/signin",
  successRedirect: "/calendar",
  passReqToCallback: true,
});

function signUp(req: Request, res: Response) {
  res.render("signup");
}

export const signUpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1Hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.DEPLOYMENT === "dev",
});

async function handleSignUp(req: Request, res: Response, next: NextFunction) {
  // Validate the email first
  const signUpSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
  });

  const result = signUpSchema.safeParse({
    email: req.body.email,
    password: req.body.password,
  });

  if (result.success === false) {
    // For some reason .save is needed to actually save the message to session
    req.session.flash = result.error.format();
    return req.session.save(() => {
      res.redirect("/signup");
    });
  }

  // Normalize the email
  const emailNormalized = validator.default.normalizeEmail(req.body.email, {
    gmail_remove_subaddress: false,
  });
  if (!emailNormalized) {
    return next(
      new Error("An unexpected error ocurred when normalizing email"),
    );
  }

  //Check email doesn't already exist
  const emailResult = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [emailNormalized],
  );
  if (emailResult.rowCount > 0) {
    req.session.flash = {
      email: {
        _errors: [
          "A link to activate your account has been emailed to the address provided.",
        ],
      },
    };
    return req.session.save(() => {
      res.redirect("/signup");
    });
  }

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

      // Account activation
      const token = randomBytes(16).toString("hex");
      const expires = dayjs().add(6, "hours").toISOString();

      try {
        await pool.query("BEGIN");

        const result = await pool.query(
          `INSERT INTO users(email, hashed_password, salt) VALUES($1, $2, $3) RETURNING id, email`,
          [emailNormalized, hashedPassword, saltString],
        );

        await pool.query(
          `INSERT INTO activation_tokens (user_id, token, expires) VALUES($1, $2, $3)`,
          [result.rows[0].id, token, expires],
        );
        await pool.query("COMMIT");
      } catch (err) {
        console.error(err);
        await pool.query("ROLLBACK");
        return next(err);
      }

      await user.sendAccountConfirmationEmail(emailNormalized, token);

      // Query user and sign them in
      const userResult = await pool.query(
        `SELECT id, email FROM users WHERE email = $1`,
        [emailNormalized],
      );
      if (!userResult.rows[0]) {
        return next(
          new Error(
            "An unexpected error ocurred when signing you in, please try sign in again.",
          ),
        );
      }

      // Finally login the user and send them to their calendar!
      return req.login(
        { id: userResult.rows[0].id, email: userResult.rows[0].email },
        (err) => {
          if (err) return next(err);
          return res.redirect("/");
        },
      );
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
  googleSignIn,
  googleSignInRedirect,
};
