import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import z from "zod";
import validator from "validator";

import { pool } from "../lib/db.js";
import { emailSchema, passwordSchema } from "./validations.js";
import { verifyPassword } from "../lib/crypto.js";
import { ENV } from "../lib/environment.js";
import { notify } from "../lib/notify.js";

export function configurePassport() {
  setupLocalStrategy();
  setupGoogleStrategy();
  passport.serializeUser((user: any, cb) => {
    return cb(null, { id: user.id, email: user.email });
  });
  passport.deserializeUser((user: any, cb) => {
    return cb(null, user);
  });
}

function setupLocalStrategy() {
  passport.use(
    "local",
    new LocalStrategy({ passReqToCallback: true }, async function verify(
      req,
      email,
      password,
      done,
    ) {
      const signInSchema = z.object({
        email: emailSchema,
        password: passwordSchema,
      });

      const result = signInSchema.safeParse({
        email,
        password,
      });

      if (result.success === false) {
        const { fieldErrors } = result.error.flatten();
        let message = "";
        if (fieldErrors.email) {
          message += `<li>${fieldErrors.email}</li>`;
        }
        if (fieldErrors.password) {
          message += `<li>${fieldErrors.password}</li>`;
        }
        req.session.flash = message;
        return req.session.save(() => {
          done(null);
        });
      }

      // Normalize the email
      const emailNormalized = validator.default.normalizeEmail(email, {
        gmail_remove_subaddress: false,
      });
      if (!emailNormalized) {
        throw new Error("An unexpected error ocurred when normalizing email");
      }

      const { rows } = await pool.query(
        `SELECT id, email, salt, hashed_password FROM users WHERE email = $1`,
        [emailNormalized],
      );

      const row = rows[0];
      if (!row) {
        req.session.flash = `<li>Incorrect email or password.</li>`;
        return req.session.save(() => {
          done(null);
        });
      }

      try {
        const isPasswordValid = await verifyPassword(
          password,
          row.hashed_password,
          row.salt,
        );
        if (isPasswordValid) {
          done(null, row);
        } else {
          req.session.flash = `<li>Incorrect email or password.</li>`;
          return req.session.save(() => {
            done(null);
          });
        }
      } catch (err) {
        done(err);
      }
    }),
  );
}

function setupGoogleStrategy() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.GOOGLE_CLIENT_ID,
        clientSecret: ENV.GOOGLE_CLIENT_SECRET,
        callbackURL: "/oauth2/redirect/google",
        scope: ["email"],
        passReqToCallback: true,
      },
      async function verify(req, _accessToken, _refreshToken, profile, done) {
        try {
          // Check if the user has logged in before
          const federatedCredentialsQuery = await pool.query(
            `SELECT id, user_id FROM federated_credentials WHERE provider = $1 AND provider_user_id = $2`,
            [profile.provider, profile.id],
          );

          if (federatedCredentialsQuery.rowCount > 0) {
            //TODO: Add better error handling
            // User has logged in with Google before
            const userQuery = await pool.query(
              `SELECT id, email FROM users WHERE id = $1`,
              [federatedCredentialsQuery.rows[0].user_id],
            );
            done(null, userQuery.rows[0]);
          } else {
            // Create new federated_credential & user
            await pool.query("BEGIN");
            const userQuery = await pool.query(
              `INSERT INTO users(email, active) VALUES($1, true) RETURNING id, email`,
              [(profile.emails as any)[0].value], //TODO: Improve this
            );
            await pool.query(
              `INSERT INTO federated_credentials(user_id, provider, provider_user_id) VALUES($1, $2, $3)`,
              [userQuery.rows[0].id, profile.provider, profile.id],
            );
            await pool.query("COMMIT");
            await notify.onSignup();
            done(null, userQuery.rows[0]);
          }
        } catch (err) {
          console.log("err: ", err);
        }
      },
    ),
  );
}
