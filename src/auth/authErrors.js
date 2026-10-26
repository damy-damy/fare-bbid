// Firebase errors come with a code like "auth/invalid-credential".
// This turns those codes into sentences a normal person understands.
const messages = {
  "auth/email-already-in-use": "An account already exists for this email. Try signing in instead.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-login-credentials": "Wrong password,invalid credentials.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
  "auth/user-not-found": "No account found with this email address.",
  "auth/wrong-password": "The password you entered is incorrect.",
  "auth/requires-recent-login": "For security reasons, please re-authenticate before deleting your account.",
  "auth/too-many-requests": "Too many attempts. Wait a minute, then try again.",
  "auth/popup-closed-by-user": "The window was closed before finishing authentication.",
  "auth/popup-blocked": "Your browser blocked the pop-up window. Allow pop-ups and try again.",
};

export function friendlyError(error) {
  return messages[error?.code] || error?.message || "Something went wrong. Please try again.";
}
