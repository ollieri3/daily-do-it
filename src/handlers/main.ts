import type { Request, Response } from "express";
import dayjs from "dayjs";

function home(req: Request, res: Response) {
  if (req.user) {
    res.redirect("/calendar");
    return;
  }

  // For generating the calendar animation
  // TODO: Extract the day generation to a seperate lib function
  let daysCount = 0;
  const months = dayjs.monthsShort().map((month, index) => {
    const today = dayjs();
    const currentYear = dayjs().get("year");
    const monthDate = dayjs(new Date(currentYear, index));
    const numberOfDays = monthDate.daysInMonth();
    return {
      month,
      days: [...Array(numberOfDays).keys()].map((i) => {
        return {
          day: i + 1,
          animationOrder: daysCount++,
          // Uncomment below to limit animation to current day
          // isComplete: today.isAfter(dayjs(new Date(currentYear, index, i + 1))),
          isComplete: true,
        };
      }),
    };
  });

  res.render("home", {
    username: (req.user as any)?.email,
    months,
  });
}

function privacyPolicy(_: Request, res: Response) {
  return res.render("privacy-policy");
}

export const main = {
  home,
  privacyPolicy,
};
