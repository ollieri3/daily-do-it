import type { Request, Response, NextFunction } from "express";
import dayjs from "dayjs";
import z from "zod";

import { user } from "../models/user.js";
import { activationToken } from "../models/activation-token.js";

export async function activate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Validate Parameter
    const activateParamsSchema = z.object({
      token: z.string().min(1),
    });
    activateParamsSchema.parse(req.params);

    // Retrieve token from DB
    let token;
    try {
      token = await activationToken.get(req.params.token);
    } catch (err) {
      throw new Error("Invalid activation token");
    }

    // See if it's expired
    if (dayjs() > dayjs(token.expires)) {
      throw new Error("This activation token has expired");
    }

    // Set the user assigned to token as active
    await user.activate(token.userId);

    // Delete the token
    activationToken.remove(token.id);

    return res.render("activation_success");
  } catch (err) {
    return next(err);
  }
}
