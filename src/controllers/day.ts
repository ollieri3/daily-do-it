import type { Request, Response, NextFunction } from "express";
import dayjs from "dayjs";
import { day } from "../models/day.js";

export async function submitDay(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (dayjs(req.body.date).isValid() === false) {
      res.statusCode = 422;
      res.json({
        success: false,
        message: "Invalid date format provided for 'day'",
      });
      return;
    }

    if (dayjs(req.body.date).isAfter(dayjs(), "day")) {
      res.statusCode = 422;
      res.json({
        success: false,
        message: "Date is in the future",
      });
      return;
    }

    if (await day.exists(req.body.date, (req.user as any).id)) {
      res.statusCode = 500;
      res.json({ success: false, message: "Date entry already exists" });
      return;
    }

    await day.create(req.body.date, (req.user as any).id);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function removeDay(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (dayjs(req.body.date).isValid() === false) {
      res.statusCode = 422;
      res.json({
        success: false,
        message: "Invalid date format provided for 'day'",
      });
      return;
    }

    await day.remove(req.body.date, (req.user as any).id);
    return res.json({ success: true, message: "Day removed" });
  } catch (err) {
    next(err);
  }
}
