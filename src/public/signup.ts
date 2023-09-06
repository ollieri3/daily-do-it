const passwordInput = document.getElementById(
  "new-password",
) as HTMLInputElement | null;

const togglePasswordButton = document.getElementById(
  "toggle-password",
) as HTMLButtonElement | null;

if (!togglePasswordButton) {
  throw new Error("Could not find toggle password button");
}

togglePasswordButton.addEventListener("click", togglePassword);

function togglePassword() {
  if (!passwordInput) {
    throw new Error("Could not find password input");
  }

  if (!togglePasswordButton) {
    throw new Error("Could not find toggle password button");
  }

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    togglePasswordButton.textContent = "Hide password";
    togglePasswordButton.setAttribute("aria-label", "Hide password.");
  } else {
    passwordInput.type = "password";
    togglePasswordButton.textContent = "Show password";
    togglePasswordButton.setAttribute(
      "aria-label",
      "Show password as plain text. " +
        "Warning: this will display your password on the screen.",
    );
  }
}
