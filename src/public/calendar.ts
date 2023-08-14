const calender = document.getElementById("calendar");
if (!calender) {
  throw new Error("No calendar element found");
}

calender.addEventListener("click", async (event) => {
  if (event.target && (event.target as HTMLButtonElement).id !== "day") return;

  const btn = event.target as HTMLButtonElement;
  if (!btn) {
    throw new Error("No event target");
  }

  const isDayComplete = btn.getAttribute("data-is-complete") === "true";
  const dayData = btn.getAttribute("data-date");
  if (!dayData) {
    throw new Error("No day data on button `data-date` attribute");
  }

  if (isDayComplete) {
    deleteDay(dayData);
    btn.setAttribute("data-is-complete", "false");
    btn.classList.remove("complete");
  } else {
    submitDay(dayData);
    btn.setAttribute("data-is-complete", "true");
    btn.classList.add("complete");
  }
});

async function submitDay(day: string) {
  try {
    const result = await fetch("/day", {
      method: "POST",
      headers: {
        "x-csrf-token": getCSRFToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: day,
      }),
    });
  } catch (err) {
    console.error(err);
  }
}

async function deleteDay(day: string) {
  try {
    const result = await fetch("/day", {
      method: "DELETE",
      headers: {
        "x-csrf-token": getCSRFToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: day,
      }),
    });
  } catch (err) {
    console.error(err);
  }
}

function getCSRFToken(): string {
  const csrfMeta = document.querySelector("meta[name='csrf-token']");
  if (!csrfMeta) {
    throw new Error("No CSRF meta element found");
  }
  const _csrf = csrfMeta.getAttribute("content");
  if (!_csrf) {
    throw new Error("No CSRF token value");
  }
  return _csrf;
}
