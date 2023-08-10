const _csrf = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");

document.getElementById("calendar").addEventListener("click", async (ev) => {
  if (event.target.id !== "day") return;
  const btn = event.target;
  const isDayComplete = btn.getAttribute("data-is-complete") === "true";
  if (isDayComplete) {
    deleteDay(btn.getAttribute("data-date"));
    btn.setAttribute("data-is-complete", false);
    btn.classList.remove("complete");
  } else {
    submitDay(btn.getAttribute("data-date"));
    btn.setAttribute("data-is-complete", true);
    btn.classList.add("complete");
  }
});

async function submitDay(day) {
  try {
    const result = await fetch("/day", {
      method: "POST",
      headers: {
        "x-csrf-token": _csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: event.target.getAttribute("data-date"),
      }),
    });
  } catch (err) {
    console.error(err);
  }
}

async function deleteDay(day) {
  try {
    const result = await fetch("/day", {
      method: "DELETE",
      headers: {
        "x-csrf-token": _csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: event.target.getAttribute("data-date"),
      }),
    });
  } catch (err) {
    console.error(err);
  }
}
