const calender = document.getElementById("calendar");
if (!calender) {
  throw new Error("No calendar element found");
}

calender.addEventListener("click", async (event) => {
  if (event.target && (event.target as HTMLButtonElement).tagName !== "BUTTON")
    return;

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

// Sticky jump to day button handling
const jumpToBtn = document.getElementById("jump-to-today");
const jumpToContainer = document.getElementById("jump-to-today-container");

if (!jumpToBtn) {
  throw new Error("Can't find jump to today button");
}

if (!jumpToContainer) {
  throw new Error("Can't find jump to today container");
}

jumpToBtn.addEventListener("click", function handleJumpToTodayClick() {
  const todayBtn = document.querySelector(".today");
  if (todayBtn) {
    todayBtn.scrollIntoView({ block: "center" });
  }
});

const observer = new IntersectionObserver(function callback(entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      jumpToContainer.classList.add("hidden");
    } else {
      console.log("fired");
      jumpToContainer.classList.remove("hidden");
    }
  });
});

const todayBtn = document.querySelector(".today");
if (todayBtn) {
  observer.observe(todayBtn);
}
