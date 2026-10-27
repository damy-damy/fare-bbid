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
  FiAlertTriangle,
  FiCheckCircle,
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
import DeleteAccountModal from "../components/DeleteAccountModal.jsx";

const ROLE_BADGES = {
  admin: "bg-violet-100 text-violet-800",
  driver: "bg-emerald-100 text-emerald-800",
  passenger: "bg-sky-100 text-sky-800",
};

const CONTENT = {
  driver: {
    heading: "Your next fare is just around the corner.",
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
    heading: "Where to next? Your ride is a tap away.",
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

// Animations
const group = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const rise = {
  hidden: {
    opacity: 0,
    y: 22,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const pageSequence = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.25,
      staggerChildren: 0.18,
    },
  },
};

export default function Dashboard({ role }) {
  const { user, profile, logOut } = useAuth();
  const navigate = useNavigate();

  const firstName =
    role === "admin"
      ? "Admin"
      : (profile?.displayName || user?.email || "").split(" ")[0];

  const [sosAlertCount, setSosAlertCount] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (role !== "admin") return;

    const unsub = onSnapshot(collection(db, "rides"), (snapshot) => {
      const activeSos = snapshot.docs.filter(
        (d) => d.data().emergencyAlert?.active
      );

      setSosAlertCount(activeSos.length);
    });

    return () => unsub();
  }, [role]);

  async function handleSignOut() {
    await logOut();
    navigate("/");
  }

  function handleAccountDeleted() {
    setShowDeleteModal(false);
    navigate("/");
  }

  return (
    <PageTransition className="min-h-screen bg-[#f4f9f4] pb-24 text-slate-900">
      {/* Navbar appears first */}
      <motion.header
        className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur-xl"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex min-h-18 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Logo to="/" />

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_BADGES[role] || "bg-slate-100 text-slate-700"
                }`}
            >
              {ROLE_LABEL[role] || "User"}
            </span>

            <span className="max-w-56 break-all text-sm text-slate-500">
              {role === "admin" ? "Admin" : user?.email}
            </span>

            <button
              className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              type="button"
              onClick={() => setShowDeleteModal(true)}
            >
              <FiTrash2 className="size-3.5" />
              <span>Delete account</span>
            </button>

            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:border-emerald-600 hover:bg-emerald-50"
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main content loads section by section */}
      <motion.main
        className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-8 sm:py-12"
        variants={pageSequence}
        initial="hidden"
        animate="show"
      >
        <motion.p
          className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700"
          variants={rise}
        >
          {ROLE_LABEL[role]} dashboard
        </motion.p>

        <motion.h1
          className="font-sans text-4xl font-extrabold tracking-tight sm:text-5xl"
          variants={rise}
        >
          {role === "admin" ? "Welcome, Admin." : `Hi, ${firstName}.`}
        </motion.h1>

        {/* Green welcome banner */}
        {role !== "admin" && (
          <motion.section
            className="relative overflow-hidden rounded-3xl bg-emerald-700 p-6 text-white shadow-lg shadow-emerald-900/10 sm:p-9"
            variants={rise}
          >
            <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-emerald-500/40" />
            <div className="pointer-events-none absolute -bottom-24 right-20 size-48 rounded-full bg-emerald-600/60" />

            <div className="relative z-10 max-w-xl">
              <p className="text-sm font-semibold text-emerald-100">
                Welcome to FareBid
              </p>

              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                {role === "driver"
                  ? "Your next ride starts here."
                  : "Your next journey starts here."}
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50">
                {role === "driver"
                  ? "Connect with passengers, negotiate fares, and earn on your terms."
                  : "Choose your destination, suggest your fare, and travel your way."}
              </p>
            </div>
          </motion.section>
        )}

        {role === "admin" ? (
          <AdminView currentEmail={user?.email} />
        ) : (
          <ExampleView content={CONTENT[role]} role={role} />
        )}

        {/* Passenger account settings */}
        {role === "passenger" && (
          <motion.section
            className="mt-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            variants={rise}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold">
                  Passenger Account & Privacy
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage your profile and account credentials.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-500" />
                Account Active
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Passenger Name
                </p>
                <p className="mt-1 text-sm font-bold">
                  {profile?.displayName || "FareBid Passenger"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Registered Email
                </p>
                <p className="mt-1 break-all text-sm font-bold">
                  {user?.email || "—"}
                </p>
              </div>
            </div>

            <DangerZone
              title="Danger Zone: Delete Account"
              description="Permanently delete your FareBid passenger account. This action cannot be undone."
              onDelete={() => setShowDeleteModal(true)}
            />
          </motion.section>
        )}

        {/* Administrator account settings */}
        {role === "admin" && (
          <motion.section
            className="mt-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            variants={rise}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold">
                  Administrator Credentials & Danger Zone
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage your administrator account security.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
                <FiShield className="size-3.5 text-violet-600" />
                Platform Admin Authority
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Administrator Email
                </p>
                <p className="mt-1 break-all text-sm font-bold">
                  {user?.email || "admin@farebid.com"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Security Clearance
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  Full Operational Controls
                </p>
              </div>
            </div>

            <DangerZone
              title="Danger Zone: Delete Admin Account"
              description="Permanently delete your administrator account from FareBid. This will revoke account access."
              onDelete={() => setShowDeleteModal(true)}
            />
          </motion.section>
        )}
      </motion.main>

      <StickyRoleButton role={role} alertCount={sosAlertCount} />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={handleAccountDeleted}
        userRole={role}
      />
    </PageTransition>
  );
}

function ExampleView({ content, role }) {
  return (
    <>
      <motion.p
        className="max-w-2xl text-lg text-slate-600"
        variants={rise}
      >
        {content.heading}
      </motion.p>

      {/* Statistics cards appear one after another */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={group}
      >
        {content.stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={rise}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <p className="mt-3 break-words font-sans text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {stat.value}
                </p>
              </div>

              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold transition-transform duration-300 group-hover:scale-105 ${index === 0
                    ? "bg-emerald-50 text-emerald-700"
                    : index === 1
                      ? "bg-sky-50 text-sky-700"
                      : "bg-violet-50 text-violet-700"
                  }`}
              >
                {index === 0 ? "↗" : index === 1 ? "◷" : "★"}
              </span>
            </div>

            <div className="mt-5 h-1 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`h-full w-1/2 rounded-full ${index === 0
                    ? "bg-emerald-500"
                    : index === 1
                      ? "bg-sky-500"
                      : "bg-violet-500"
                  }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{ transformOrigin: "left" }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent rides section */}
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

        {/* Ride rows appear one after another */}
        <motion.ul
          className="m-0 list-none divide-y divide-slate-100 px-5"
          variants={group}
        >
          {content.list.map((row, index) => (
            <motion.li
              key={row.main + row.sub}
              variants={rise}
              className="flex items-center gap-3 py-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold text-slate-900">
                  {row.main}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-slate-500 sm:text-sm">
                  {row.sub}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-slate-900 sm:text-base">
                  {row.side}
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
            Sample activity — live trip history can be connected later.
          </p>
        </div>
      </motion.section>
    </>
  );
}

function DangerZone({ title, description, onDelete }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
          <FiAlertTriangle className="size-4 text-rose-600" />
          <span>{title}</span>
        </div>

        <p className="mt-1 max-w-xl text-xs leading-5 text-rose-700">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-700"
      >
        <FiTrash2 className="size-3.5" />
        <span>Delete Account</span>
      </button>
    </div>
  );
}

function AdminView({ currentEmail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingUid, setDeletingUid] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snapshot) =>
        setUsers(snapshot.docs.map((document) => document.data()))
      )
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handleDeleteUser(account) {
    const displayName =
      account.displayName || account.email || "this user";

    const confirmed = window.confirm(
      `Are you sure you want to delete the account for "${displayName}"?\n\nThis will remove their profile from the FareBid database.`
    );

    if (!confirmed) return;

    setDeletingUid(account.uid);

    try {
      await deleteDoc(doc(db, "users", account.uid));

      setUsers((prev) =>
        prev.filter((u) => u.uid !== account.uid)
      );

      setSuccessMsg(`Successfully deleted account for ${displayName}.`);

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError("Failed to delete user: " + friendlyError(err));
    } finally {
      setDeletingUid(null);
    }
  }

  const count = (role) =>
    users.filter(
      (account) => normalizeRole(account.role) === role
    ).length;

  const stats = [
    { label: "All accounts", value: users.length },
    { label: "Drivers", value: count("driver") },
    { label: "Passengers", value: count("passenger") },
  ];

  return (
    <>
      <motion.p
        className="max-w-2xl text-lg text-slate-600"
        variants={rise}
      >
        A quick look at everyone using the FareBid ride-hailing platform.
      </motion.p>

      <motion.div
        className="grid gap-4 sm:grid-cols-3"
        variants={group}
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            variants={rise}
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="font-sans text-2xl font-bold tabular-nums">
              {loading ? "–" : stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className="rounded-2xl border border-slate-200 bg-white px-5 pb-3 pt-2 shadow-sm"
        variants={rise}
      >
        <div className="flex items-center justify-between gap-3 py-4">
          <h2 className="font-sans text-xl font-bold">
            FareBid accounts
          </h2>

          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span
              className="size-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            Live from Firestore
          </span>
        </div>

        {successMsg && (
          <div className="my-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
            <FiCheckCircle className="size-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <p className="my-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading && (
          <p className="py-3 text-slate-500">Loading accounts…</p>
        )}

        {!loading && !error && users.length === 0 && (
          <p className="py-3 text-slate-500">No accounts yet.</p>
        )}

        <motion.ul
          className="m-0 list-none p-0"
          variants={group}
          key={users.length}
        >
          {users.map((account) => {
            const accountRole = normalizeRole(account.role);
            const isSelf = account.email === currentEmail;

            return (
              <motion.li
                key={account.uid}
                variants={rise}
                className="flex items-center justify-between gap-4 border-t border-slate-100 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {account.displayName || "No name"}
                    </p>

                    {isSelf && (
                      <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        You
                      </span>
                    )}
                  </div>

                  <p className="break-all text-sm text-slate-500">
                    {account.email}
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
                      className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50"
                      title="Delete account from database"
                    >
                      <FiTrash2 className="size-3" />
                      <span>
                        {deletingUid === account.uid
                          ? "Deleting…"
                          : "Delete"}
                      </span>
                    </button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </motion.section>
    </>
  );
}