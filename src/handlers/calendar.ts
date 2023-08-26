import type { Request, Response } from "express";
import dayjs from "dayjs";

import { pool } from "../lib/db.js";

async function getCalendar(req: Request, res: Response) {
  // Query all days in year for current user
  const { rows: userDays } = await pool.query(
    `SELECT id, date FROM days WHERE user_id = $1`,
    [(req.user as any).id],
  );

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
  res.render("calendar", { months });
}

async function home(req: Request, res: Response) {
  return res.redirect(`/calendar/${new Date().getFullYear()}`);
}

async function submitDay(req: Request, res: Response) {
  if (dayjs(req.body.date).isValid() === false) {
    res.statusCode = 422;
    res.send({
      success: false,
      message: "Invalid date format provided for 'day'",
    });
    return;
  }

  // First check if an entry already exists on that day
  const existingEntryRows = await pool.query(
    `
    SELECT id FROM days WHERE date = $1 AND user_id = $2
  `,
    [req.body.date, (req.user as any).id],
  );

  if (existingEntryRows.rows.length > 0) {
    res.statusCode = 500;
    res.send({ success: false, message: "Date entry already exists" });
    return;
  }

  // Insert it
  const rows = await pool.query(
    `
    INSERT INTO days (user_id, date) VALUES ($1, $2)
  `,
    [(req.user as any).id, req.body.date],
  );

  res.json({ success: true });
}

async function removeDay(req: Request, res: Response) {
  if (dayjs(req.body.date).isValid() === false) {
    res.statusCode = 422;
    res.send({
      success: false,
      message: "Invalid date format provided for 'day'",
    });
    return;
  }

  const existingEntryRows = await pool.query(
    `
      DELETE FROM days WHERE date = $1 AND user_id = $2
    `,
    [req.body.date, (req.user as any).id],
  );

  if (existingEntryRows.rows.length > 0) {
    res.json({ success: true, message: "Day removed" });
    return;
  }

  res.json({ success: false });
  return;
}

export const calendar = {
  getCalendar,
  home,
  submitDay,
  removeDay,
};
