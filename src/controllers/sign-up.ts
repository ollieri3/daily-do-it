import type { Request, Response, NextFunction } from "express";
import z from "zod";
import validator from "validator";

import { emailSchema, passwordSchema } from "../helpers/validations.js";
import { user } from "../models/user.js";
import { hashPassword } from "../lib/crypto.js";
import { token } from "../lib/token.js";
import { notify } from "../lib/notify.js";

export function signUpPage(_: Request, res: Response) {
  res.render("signup");
}

export async function signUpForm(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Validate inputs
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
      throw new Error("An unexpected error ocurred when normalizing email");
    }

    // Check if email already in use
    const emailInUse = await user.doesExistWithEmail(emailNormalized);
    if (emailInUse) {
      req.session.flash = {
        email: {
          _errors: [
            "A link to activate your account has been emailed to the address provided.",
          ],
        },
      };
      return req.session.save(() => res.redirect("/signup"));
    }

    // Proceed to create the new user
    const { hashedPassword, salt } = await hashPassword(req.body.password);
    const activationToken = await token.createActivationToken();

    const newUser = await user.create({
      email: emailNormalized,
      password: hashedPassword,
      salt,
      activationToken: activationToken.value,
      activationTokenExpiry: activationToken.expires,
    });

    const AccountConfirmationEmailPromise = notify.sendAccountConfirmationEmail(
      emailNormalized,
      activationToken.value,
    );
    const sendSignupNotificationPromise = notify.onSignup();

    // Send emails
    await Promise.allSettled([
      AccountConfirmationEmailPromise,
      sendSignupNotificationPromise,
    ]);

    // Finally login the user and send them to their calendar!
    return req.login({ id: newUser.id, email: newUser.email }, (err) => {
      if (err) return next(err);
      return res.redirect("/");
    });
  } catch (err) {
    return next(err);
  }
}
