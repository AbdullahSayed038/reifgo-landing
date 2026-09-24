// Checks for the sign-in details on account forms: a real-looking email typed
// twice, and a password of 8+ characters typed twice. The server checks the
// email format and length again; typing twice is only to catch typos here,
// since a mistyped sign-in email locks the person out.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value) => EMAIL.test(String(value ?? "").trim());

const sameEmail = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * Whether the email is being set or changed, so the form asks for it twice.
 * `original` is the saved email (empty for a new account).
 */
export const emailIsChanging = (email, original) => !!String(email ?? "").trim() && !sameEmail(email, original);

/**
 * Field errors for a form's sign-in details, keyed by field name.
 *
 * values:  { email, emailAgain, password, passwordAgain }
 * options: { originalEmail, emailRequired, passwordRequired, checkEmail }
 *   checkEmail: false when the form doesn't send the email (e.g. read-only).
 */
export function credentialErrors(values, { originalEmail = "", emailRequired = false, passwordRequired = false, checkEmail = true } = {}) {
  const errors = {};
  const email = String(values.email ?? "").trim();
  if (checkEmail) {
    if (!email) {
      if (emailRequired) errors.email = "Enter an email address";
    } else if (!isEmail(email)) {
      errors.email = "That doesn't look like an email address, e.g. name@company.com";
    } else if (emailIsChanging(email, originalEmail) && !sameEmail(email, values.emailAgain)) {
      errors.emailAgain = String(values.emailAgain ?? "").trim() ? "The two emails don't match" : "Type the email again to confirm it";
    }
  }

  const password = values.password ?? "";
  if (!password) {
    if (passwordRequired) errors.password = "Set a password";
  } else if (password.length < 8) {
    errors.password = "Use at least 8 characters";
  } else if (password !== (values.passwordAgain ?? "")) {
    errors.passwordAgain = values.passwordAgain ? "The two passwords don't match" : "Type the password again to confirm it";
  }
  return errors;
}
