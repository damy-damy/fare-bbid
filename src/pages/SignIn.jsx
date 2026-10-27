import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiMail,
  FiLock,
  FiShield,
} from "react-icons/fi";

import { useAuth } from "../auth/AuthContext.jsx";
import { friendlyError } from "../auth/authErrors.js";
import { ROLE_HOME } from "../auth/roles.js";
import AuthShell from "../components/AuthShell.jsx";
import {
  ErrorMessage,
  Field,
  GoogleButton,
  SubmitButton,
} from "../components/FormBits.jsx";

const formSequence = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.14,
    },
  },
};

const formItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function SignIn() {
  const {
    user,
    role,
    authError,
    signIn,
    signInWithGoogle,
    resetPassword,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (user && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError("");
    setResetSent(false);

    if (!email.trim()) {
      setError("Please enter your account email address.");
      return;
    }

    setBusy(true);

    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (showForgotPassword) {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Enter your account email and we'll send you a secure reset link."
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={formSequence}
          className="grid gap-5"
        >
          <motion.div variants={formItem}>
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              {resetSent ? (
                <FiCheckCircle className="size-6" />
              ) : (
                <FiLock className="size-6" />
              )}
            </div>

            <ErrorMessage message={error || authError} />
          </motion.div>

          {resetSent ? (
            <motion.div
              variants={formItem}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
            >
              <div className="flex items-center gap-2 font-semibold">
                <FiCheckCircle className="size-5 text-emerald-600" />
                <span>Check your inbox</span>
              </div>

              <p className="mt-2 break-words text-sm leading-6 text-emerald-800">
                If an account exists for{" "}
                <strong>{email.trim()}</strong>, you should receive a
                password reset email. Check your spam folder too.
              </p>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setError("");
                }}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 transition hover:text-emerald-950"
              >
                <FiArrowLeft />
                Back to sign in
              </button>
            </motion.div>
          ) : (
            <motion.form
              variants={formItem}
              className="grid gap-4"
              onSubmit={handleResetPassword}
            >
              <Field
                id="reset-email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <SubmitButton busy={busy}>
                Send reset link
              </SubmitButton>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setShowForgotPassword(false);
                  setError("");
                }}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
              >
                <FiArrowLeft className="size-4" />
                Back to sign in
              </button>
            </motion.form>
          )}
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in securely to continue your journey with FareBid."
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={formSequence}
        className="grid gap-5"
      >
        <motion.div
          variants={formItem}
          className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
            <FiShield className="size-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              Welcome to your next journey
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Sign in to access your FareBid account.
            </p>
          </div>
        </motion.div>

        <motion.div variants={formItem}>
          <ErrorMessage message={error || authError} />
        </motion.div>

        <motion.form
          variants={formItem}
          className="grid gap-4"
          onSubmit={handleSubmit}
        >
          <Field
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <div>
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError("");
                  setResetSent(false);
                }}
                className="rounded-md text-xs font-bold text-emerald-700 transition hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <SubmitButton busy={busy}>
            {busy ? "Signing in..." : "Sign in to FareBid"}
          </SubmitButton>
        </motion.form>

        <motion.div
          variants={formItem}
          className="flex items-center gap-3 text-xs font-medium text-slate-400"
        >
          <span className="h-px flex-1 bg-slate-200" />
          <span>OR CONTINUE WITH</span>
          <span className="h-px flex-1 bg-slate-200" />
        </motion.div>

        <motion.div variants={formItem}>
          <GoogleButton onClick={handleGoogle} disabled={busy} />
        </motion.div>

        <motion.div
          variants={formItem}
          className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-center"
        >
          <p className="text-sm text-slate-600">
            New to FareBid?{" "}
            <Link
              className="font-bold text-emerald-700 transition hover:text-emerald-900"
              to="/signup"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AuthShell>
  );
}