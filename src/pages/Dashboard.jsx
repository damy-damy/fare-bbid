
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import {
  FiActivity,
  FiArrowUpRight,
  FiCheckCircle,
  FiLogOut,
  FiShield,
  FiTrash2,
} from "react-icons/fi";

import { db } from "../fare-bidweb.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { friendlyError } from "../auth/authErrors.js";
import { normalizeRole, ROLE_LABEL } from "../auth/roles.js";
import PageTransition from "../components/PageTransition.jsx";
import Logo from "../components/Logo.jsx";
import StickyRoleButton from "../components/StickyRoleButton.jsx";

const ROLE_BADGES = {
  admin: "bg-violet-100 text-violet-800",
  driver: "bg-emerald-100 text-emerald-800",
  passenger: "bg-sky-100 text-sky-800",
};

const CONTENT = {
  driver: {
    heading: "Your driving activity at a glance.",
    stats: [
      { label: "Rides today", value: "8" },
      { label: "Today's earnings", value: "₦146,500" },
      { label: "Driver rating", value: "4.9 / 5" },
    ],
    listTitle: "Recent rides",
    list: [
      {
        main: "Jordan Lee",
        sub: "Airport pickup → Downtown",
        side: "₦28,500",
      },
      {
        main: "Sam Taylor",
        sub: "Riverside → Central Station",
        side: "₦17,500",
      },
      {
        main: "Casey Morgan",
        sub: "North Park → Market Square",
        side: "₦12,500",
      },
      {
        main: "Riley Chen",
        sub: "City Centre → Westside",
        side: "₦21,250",
      },
    ],
  },
  passenger: {
    heading: "Your journeys, all in one place.",
    stats: [
      { label: "Next pickup", value: "10:30 AM" },
      { label: "Rides this month", value: "6" },
      { label: "Saved places", value: "3" },
    ],
    listTitle: "Recent trips",
    list: [
      {
        main: "Home → City Centre",
        sub: "Today · Driver: Alex",
        side: "₦14,200",
      },
      {
        main: "Airport → Home",
        sub: "Mon · Driver: Jamie",
        side: "₦32,800",
      },
      {
        main: "Office → Riverside",
        sub: "Fri · Driver: Morgan",
        side: "₦18,400",
      },
      {
        main: "Market Square → Home",
        sub: "Wed · Driver: Taylor",
        side: "₦11,600",
      },
    ],
  },
};

const group = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const rise = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
    },
  },
};

const pageSequence = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.08,
    },
  },
};

export default function Dashboard({ role }) {
  const { user, profile, logOut } = useAuth();
  const navigate = useNavigate();

  const [sosAlertCount, setSosAlertCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  const firstName =
    role === "admin"
      ? "Admin"
      : (profile?.displayName || user?.email || "User").split(" ")[0];

  useEffect(() => {
    if (role !== "admin") return undefined;

    const unsubscribe = onSnapshot(
      collection(db, "rides"),
      (snapshot) => {
        const activeSos = snapshot.docs.filter(
          (item) => item.data().emergencyAlert?.active
        );

        setSosAlertCount(activeSos.length);
      },
      (error) => {
        console.error("Unable to load SOS alerts:", error);
      }
    );

    return unsubscribe;
  }, [role]);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out failed:", error);
      setSigningOut(false);
    }
  }

  return (
    <PageTransition className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <motion.header
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Logo to="/" />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {firstName}
              </p>
              <p className="max-w-52 truncate text-xs text-slate-500">
                {user?.email || ""}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${ROLE_BADGES[role] || "bg-slate-100 text-slate-700"
                }`}
            >
              {ROLE_LABEL[role] || "User"}
            </span>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
            >
              <FiLogOut className="size-4" />
              <span className="hidden sm:inline">
                {signingOut ? "Signing out..." : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <motion.main
        className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-7 sm:px-8 sm:py-10"
        variants={pageSequence}
        initial="hidden"
        animate="show"
      >
        <motion.section
          className="flex flex-wrap items-end justify-between gap-4"
          variants={rise}
        >
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100">
                <FiActivity className="size-4" />
              </span>
              <span>{ROLE_LABEL[role] || "User"} workspace</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {role === "admin" ? "Welcome back." : `Hello, ${firstName}.`}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              {role === "admin"
                ? "Monitor platform activity and manage FareBid accounts."
                : role === "driver"
                  ? "Review your driving activity and manage your work."
                  : "Keep track of your journeys and travel activity."}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600">
            <span className="size-2 rounded-full bg-emerald-500" />
            FareBid workspace
          </div>
        </motion.section>

        {role !== "admin" && (
          <motion.section
            className="relative overflow-hidden rounded-3xl bg-emerald-800 p-6 text-white shadow-sm sm:p-8"
            variants={rise}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[35px] border-white/5"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 right-32 size-56 rounded-full bg-emerald-700/70"
            />

            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
                Welcome to FareBid
              </span>

              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                {role === "driver"
                  ? "Ready for your next ride?"
                  : "Where would you like to go?"}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                {role === "driver"
                  ? "Connect with passengers, negotiate fares, and work on your terms."
                  : "Choose your destination, suggest your fare, and travel your way."}
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold">
                <span>
                  {role === "driver"
                    ? "Your driving workspace"
                    : "Your passenger workspace"}
                </span>
                <FiArrowUpRight className="size-4" />
              </div>
            </div>
          </motion.section>
        )}

        {role === "admin" ? (
          <AdminView currentEmail={user?.email} />
        ) : CONTENT[role] ? (
          <ExampleView content={CONTENT[role]} role={role} />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">Dashboard unavailable</h2>
            <p className="mt-2 text-sm text-slate-500">
              This account does not have a recognised dashboard role.
            </p>
          </section>
        )}

        <motion.section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          variants={rise}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FiShield className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-slate-900">
                Account information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your signed-in account details.
              </p>

              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Account name
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold">
                    {profile?.displayName || firstName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Email address
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </motion.main>

      <StickyRoleButton role={role} alertCount={sosAlertCount} />
    </PageTransition>
  );
}

function ExampleView({ content, role }) {
  return (
    <>
      <motion.p className="max-w-2xl text-base text-slate-600" variants={rise}>
        {content.heading}
      </motion.p>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={group}
      >
        {content.stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={rise}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {stat.value}
                </p>
              </div>

              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${index === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : index === 1
                    ? "bg-sky-50 text-sky-700"
                    : "bg-violet-50 text-violet-700"
                  }`}
              >
                {index === 0 ? "↗" : index === 1 ? "◷" : "★"}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        variants={rise}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {content.listTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your recent ride activity
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Recent activity
          </span>
        </div>

        <motion.ul
          className="m-0 list-none divide-y divide-slate-100 px-5"
          variants={group}
        >
          {content.list.map((item, index) => (
            <motion.li
              key={`${item.main}-${item.sub}`}
              variants={rise}
              className="flex items-center gap-3 py-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-slate-900">
                  {item.main}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-slate-500 sm:text-sm">
                  {item.sub}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-slate-900 sm:text-base">
                  {item.side}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {role === "driver" ? "Fare" : "Trip"}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs text-slate-500">
            Sample activity — connect this section to live ride records when
            ready.
          </p>
        </div>
      </motion.section>
    </>
  );
}

function AdminView({ currentEmail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingUid, setDeletingUid] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    getDocs(collection(db, "users"))
      .then((snapshot) => {
        if (!mounted) return;

        setUsers(
          snapshot.docs.map((document) => ({
            ...document.data(),
            uid: document.data().uid || document.id,
          }))
        );
      })
      .catch((err) => {
        if (mounted) setError(friendlyError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleDeleteUser(account) {
    if (!account.uid) {
      setError("This account does not have a valid user ID.");
      return;
    }

    const displayName = account.displayName || account.email || "this user";

    const confirmed = window.confirm(
      `Delete the database profile for "${displayName}"?\n\nThis removes their Firestore user profile only. It does not delete their Firebase Authentication account.`
    );

    if (!confirmed) return;

    setDeletingUid(account.uid);
    setError("");
    setSuccessMsg("");

    try {
      await deleteDoc(doc(db, "users", account.uid));

      setUsers((previous) =>
        previous.filter((item) => item.uid !== account.uid)
      );

      setSuccessMsg(`Removed the database profile for ${displayName}.`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setDeletingUid(null);
    }
  }

  const count = (targetRole) =>
    users.filter(
      (account) => normalizeRole(account.role) === targetRole
    ).length;

  const stats = [
    { label: "All accounts", value: users.length },
    { label: "Drivers", value: count("driver") },
    { label: "Passengers", value: count("passenger") },
  ];

  return (
    <>
      <p className="text-base text-slate-600">
        Manage FareBid accounts and review the current user directory.
      </p>

      <motion.div className="grid gap-4 sm:grid-cols-3" variants={group}>
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            variants={rise}
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-slate-950">
              {loading ? "—" : stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        variants={rise}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-lg font-bold">FareBid accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Registered users and their assigned roles
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            User directory
          </span>
        </div>

        {successMsg && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <FiCheckCircle className="size-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {error && (
          <p className="m-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading && (
          <p className="px-5 py-6 text-sm text-slate-500">
            Loading accounts...
          </p>
        )}

        {!loading && users.length === 0 && !error && (
          <p className="px-5 py-6 text-sm text-slate-500">
            No accounts found.
          </p>
        )}

        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {users.map((account) => {
            const accountRole = normalizeRole(account.role);
            const isSelf = account.email === currentEmail;

            return (
              <li
                key={account.uid}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-semibold">
                      {account.displayName || "No name"}
                    </p>

                    {isSelf && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        You
                      </span>
                    )}
                  </div>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {account.email || "No email"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_BADGES[accountRole] ||
                      "bg-slate-100 text-slate-700"
                      }`}
                  >
                    {ROLE_LABEL[accountRole] || "Unknown"}
                  </span>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(account)}
                      disabled={deletingUid === account.uid}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                    >
                      <FiTrash2 className="size-3.5" />
                      {deletingUid === account.uid
                        ? "Removing..."
                        : "Remove profile"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </motion.section>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <FiShield className="mt-0.5 size-4 shrink-0" />
        <p>
          Removing a profile here deletes its Firestore document only. It does
          not remove the user's Firebase Authentication account.
        </p>
      </div>
    </>
  );
}
