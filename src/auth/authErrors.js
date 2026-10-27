// Firebase errors are converted into friendly messages here.
const messages = {
  "auth/email-already-in-use":
    "An account already exists with this email. Try signing in instead.",

  "auth/invalid-credential":
    "The email or password is incorrect.",

  "auth/invalid-login-credentials":
    "The email or password is incorrect.",

  "auth/invalid-email":
    "Please enter a valid email address.",

  "auth/missing-password":
    "Please enter your password.",

  "auth/weak-password":
    "Choose a password with at least 6 characters.",

  "auth/user-not-found":
    "No account was found with this email address.",

  "auth/wrong-password":
    "The password you entered is incorrect.",

  "auth/requires-recent-login":
    "For security reasons, please sign in again before deleting your account.",

  "auth/too-many-requests":
    "Too many attempts. Please wait a little and try again.",

  "auth/popup-closed-by-user":
    "Google sign-in was cancelled. Please try again if you wish to continue.",

  "auth/popup-blocked":
    "Your browser blocked the sign-in window. Allow pop-ups and try again.",

  "auth/operation-not-allowed":
    "This sign-in method is not enabled yet. Please contact support.",

  "auth/network-request-failed":
    "Please check your internet connection and try again.",

  "auth/internal-error":
    "Something went wrong while signing you in. Please try again.",

  "auth/unauthorized-domain":
    "This website is not yet authorized for sign-in. Please contact support."
};

export function friendlyError(error) {
  const code = error?.code;

  // Match Firebase error codes first.
  if (code && messages[code]) {
    return messages[code];
  }

  // Also recognize Firebase errors when they arrive as text.
  const message = String(error?.message || error || "").toLowerCase();

  if (
    message.includes("auth/network-request-failed") ||
    message.includes("network request failed")
  ) {
    return messages["auth/network-request-failed"];
  }

  if (message.includes("auth/operation-not-allowed")) {
    return messages["auth/operation-not-allowed"];
  }

  return "Something went wrong. Please try again.";
}