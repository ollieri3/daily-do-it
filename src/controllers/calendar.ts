import type { NextFunction, Request, Response } from "express";
import dayjs from "dayjs";
import z from "zod";

import { user } from "../models/user.js";
import { day } from "../models/day.js";

export async function getCalendar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Validate inputs
    const paramSchema = z.string().refine((val) => dayjs(val).isValid(), {
      message: "Year parameter is not a valid date",
    });
    paramSchema.parse(req.params.year);

    const [userActivated, userDays, previousYearDays, nextYearDays] =
      await Promise.all([
        user.isActive((req.user as any).id),
        day.getAllForUserInYear((req.user as any).id, req.params.year),
        day.getAllForUserInYear(
          (req.user as any).id,
          `${parseInt(req.params.year) - 1}`,
        ),
        day.getAllForUserInYear(
          (req.user as any).id,
          `${parseInt(req.params.year) + 1}`,
        ),
      ]);

    const months = dayjs.monthsShort().map((month, index) => {
      const monthDate = dayjs(new Date(+req.params.year, index));
      const numberOfDays = monthDate.daysInMonth();
      const today = dayjs();
      return {
        month,
        days: [...Array(numberOfDays).keys()].map((i) => {
          return {
            day: i + 1,
            date: monthDate.date(i + 1).format("YYYY-MM-DD"),
            isComplete: userDays.some((day) =>
              dayjs(day.date).isSame(monthDate.date(i + 1)),
            ),
            isToday: today.isSame(monthDate.date(i + 1), "day"),
          };
        }),
      };
    });

    res.render("calendar", {
      months,
      userNotActive: userActivated === false,
      userHasNoDaysComplete: userDays.length === 0,
      today: dayjs().format("YYYY-MM-DD"),
      year: req.params.year,
      prevYear: parseInt(req.params.year) - 1,
      nextYear: parseInt(req.params.year) + 1,
      showYearNav: previousYearDays.length > 0 || nextYearDays.length > 0,
      hidePrevYearLink: previousYearDays.length < 1,
      hideNextYearLink: nextYearDays.length < 1,
    });
  } catch (err) {
    next(err);
  }
}

export async function redirectToLatestCalendar(_: Request, res: Response) {
  return res.redirect(`/calendar/${new Date().getFullYear()}`);
}
