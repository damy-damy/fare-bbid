import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../fare-bidweb.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import Logo from "../components/Logo.jsx";
import {
  FiArrowLeft,
  FiShield,
  FiUsers,
  FiNavigation,
  FiAlertOctagon,
  FiCheckCircle,
  FiXCircle,
  FiSlash,
  FiStar,
  FiSearch,
  FiExternalLink,
  FiMapPin,
  FiFileText,
  FiActivity,
} from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";

export default function AdminOps() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadError, setLoadError] = useState("");

  // Listen to users and rides in real time
  useEffect(() => {
    const handleError = (error) => {
      console.error("Admin data loading error:", error);
      setLoadError(
        "Unable to load admin data. Check your Firebase permissions."
      );
    };

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
        setLoadError("");
      },
      handleError
    );

    const unsubRides = onSnapshot(
      collection(db, "rides"),
      (snapshot) => {
        setRides(
          snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            }))
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
            )
        );
        setLoadError("");
      },
      handleError
    );

    return () => {
      unsubUsers();
      unsubRides();
    };
  }, []);

  // User statistics
  const drivers = users.filter((u) => u.role === "driver");
  const passengers = users.filter((u) => u.role === "passenger");
  const onlineDrivers = drivers.filter((d) => d.isOnline);

  // Active SOS alerts
  const activeSosRides = rides.filter(
    (ride) => ride.emergencyAlert?.active
  );

  // Distance recorded on driver profiles
  const totalKmDriven = drivers.reduce(
    (total, driver) => total + (Number(driver.totalDistanceKm) || 0),
    0
  );

  const completedRides = rides.filter(
    (ride) => ride.status === "completed"
  );

  const activeRides = rides.filter(
    (ride) =>
      ride.status === "in_progress" ||
      ride.status === "accepted"
  );

  // Change driver status
  async function handleSetDriverStatus(driverId, newStatus) {
    try {
      await updateDoc(doc(db, "users", driverId), {
        driverStatus: newStatus,
        statusUpdatedAt: serverTimestamp(),
        ...(newStatus === "banned" || newStatus === "suspended"
          ? { isOnline: false }
          : {}),
      });

      alert(`Driver status updated to ${newStatus}.`);
    } catch (error) {
      console.error("Error setting driver status:", error);
      alert(
        "Failed to update driver status. Check your Firebase permissions."
      );
    }
  }

  // Resolve SOS alert
  async function handleResolveSOS(rideId) {
    const confirmed = window.confirm(
      "Are you sure you want to resolve this SOS alert?"
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "rides", rideId), {
        "emergencyAlert.active": false,
        "emergencyAlert.resolvedAt": serverTimestamp(),
      });

      alert("SOS alert resolved.");
    } catch (error) {
      console.error("Error resolving SOS:", error);
      alert(
        "Failed to resolve SOS alert. Check your Firebase permissions."
      );
    }
  }

  // Search and filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      (driver.displayName || "").toLowerCase().includes(query) ||
      (driver.email || "").toLowerCase().includes(query) ||
      (driver.vehicle || "").toLowerCase().includes(query);

    const driverStatus = driver.driverStatus || "approved";

    const matchesFilter =
      statusFilter === "all" ||
      driverStatus === statusFilter ||
      (statusFilter === "online" && driver.isOnline);

    return matchesSearch && matchesFilter;
  });

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: FiActivity,
    },
    {
      id: "drivers",
      label: `Driver Management (${drivers.length})`,
      icon: FaCarSide,
    },
    {
      id: "records",
      label: `Trip Records (${rides.length})`,
      icon: FiFileText,
    },
    {
      id: "ratings",
      label: "Ratings & Reviews",
      icon: FiStar,
    },
    {
      id: "sos",
      label: `SOS Alerts (${activeSosRides.length})`,
      icon: FiAlertOctagon,
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FiArrowLeft className="size-4" />
              <span>Admin Dashboard</span>
            </button>

            <Logo to="/admin" />
          </div>

          <div className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">
            <FiShield className="size-4 text-indigo-400" />
            <span>FareBid Operations Center</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
        {/* Firebase error message */}
        {loadError && (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300">
            {loadError}
          </div>
        )}

        {/* Active SOS emergency banners */}
        {activeSosRides.length > 0 && (
          <div className="mb-6 space-y-3">
            {activeSosRides.map((ride) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-rose-500 bg-gradient-to-r from-rose-950/90 to-red-950/90 p-5 shadow-2xl shadow-rose-900/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-600 text-white">
                    <FiAlertOctagon className="size-7" />
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-extrabold uppercase text-white">
                        Active SOS Alert
                      </span>

                      <span className="text-xs text-rose-300">
                        Ride #{ride.id.slice(0, 8)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-white">
                      Passenger:{" "}
                      {ride.emergencyAlert?.passengerName ||
                        ride.passengerName ||
                        "Unknown"}
                    </p>

                    <p className="text-xs text-rose-200">
                      Phone:{" "}
                      {ride.emergencyAlert?.passengerPhone ||
                        "Not provided"}
                    </p>

                    <p className="text-xs text-rose-200">
                      Driver:{" "}
                      {ride.emergencyAlert?.driverName ||
                        ride.driverName ||
                        "Unassigned"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ride.emergencyAlert?.mapLink && (
                    <a
                      href={ride.emergencyAlert.mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950 hover:bg-slate-200"
                    >
                      <FiExternalLink className="size-4" />
                      Track Location
                    </a>
                  )}

                  <button
                    onClick={() => handleResolveSOS(ride.id)}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
                  >
                    Resolve Alert
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Statistics cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Driver Distance"
            value={totalKmDriven.toFixed(1)}
            suffix="km"
            description="Distance recorded on driver profiles"
            icon={<FiNavigation className="size-4 text-emerald-400" />}
          />

          <StatCard
            title="Registered Drivers"
            value={drivers.length}
            description={`${onlineDrivers.length} online right now`}
            icon={<FaCarSide className="size-4 text-amber-400" />}
          />

          <StatCard
            title="Registered Passengers"
            value={passengers.length}
            description="Passenger accounts"
            icon={<FiUsers className="size-4 text-sky-400" />}
          />

          <StatCard
            title="Total Trips"
            value={rides.length}
            description={`${completedRides.length} completed`}
            icon={<FiActivity className="size-4 text-indigo-400" />}
          />
        </div>

        {/* Navigation tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition-all ${isSelected
                    ? "bg-white text-slate-950 shadow-lg"
                    : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
              <h2 className="mb-5 text-lg font-bold text-white">
                Platform Overview
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "All users", value: users.length },
                  { label: "Online drivers", value: onlineDrivers.length },
                  {
                    label: "Pending driver applications",
                    value: drivers.filter(
                      (d) => (d.driverStatus || "approved") === "pending"
                    ).length,
                  },
                  {
                    label: "Completed rides",
                    value: completedRides.length,
                  },
                  {
                    label: "Active rides",
                    value: activeRides.length,
                  },
                  {
                    label: "Active SOS alerts",
                    value: activeSosRides.length,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                  >
                    <p className="text-xs text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
              <h2 className="mb-5 text-lg font-bold text-white">
                Recent Rides
              </h2>

              {rides.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No rides have been recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {rides.slice(0, 5).map((ride) => (
                    <div
                      key={ride.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {ride.passengerName || "Passenger"} →{" "}
                          {ride.driverName || "Unassigned driver"}
                        </p>

                        <p className="truncate text-xs text-slate-400">
                          {ride.pickup?.name || "Pickup unavailable"} →{" "}
                          {ride.dropoff?.name || "Drop-off unavailable"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
                        {ride.status || "unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* DRIVER MANAGEMENT TAB */}
        {activeTab === "drivers" && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="relative min-w-64 flex-1">
                <FiSearch className="absolute left-3.5 top-3.5 size-4 text-slate-400" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search driver by name, email, vehicle..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "all",
                  "approved",
                  "pending",
                  "suspended",
                  "banned",
                  "online",
                ].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold uppercase transition ${statusFilter === status
                        ? "bg-indigo-500 text-white"
                        : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredDrivers.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No drivers match this filter.
                </p>
              ) : (
                filteredDrivers.map((driver) => {
                  const status = driver.driverStatus || "approved";

                  return (
                    <div
                      key={driver.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-white/20"
                    >
                      <div className="flex min-w-48 items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                          <FaCarSide className="size-5" />
                        </div>

                        <div>
                          <p className="font-bold text-white">
                            {driver.displayName || "Driver"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {driver.email || "No email"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {driver.vehicle || "Standard vehicle"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 text-xs">
                        <div>
                          <p className="text-slate-400">
                            Distance Driven
                          </p>
                          <p className="font-bold text-emerald-400">
                            {(Number(driver.totalDistanceKm) || 0).toFixed(1)} km
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Driver Rating</p>
                          <p className="font-bold text-amber-400">
                            ★ {driver.ratingAverage ?? "N/A"}{" "}
                            ({driver.ratingCount || 0})
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Online Status</p>
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold ${driver.isOnline
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                              }`}
                          >
                            {driver.isOnline ? "ONLINE" : "OFFLINE"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${status === "approved"
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                              : status === "pending"
                                ? "border-amber-500/30 bg-amber-500/20 text-amber-400"
                                : "border-rose-500/30 bg-rose-500/20 text-rose-400"
                            }`}
                        >
                          {status}
                        </span>

                        {status === "pending" ? (
                          <>
                            <button
                              onClick={() =>
                                handleSetDriverStatus(driver.id, "approved")
                              }
                              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                            >
                              <FiCheckCircle className="size-4" />
                              Accept
                            </button>

                            <button
                              onClick={() =>
                                handleSetDriverStatus(driver.id, "declined")
                              }
                              className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500"
                            >
                              <FiXCircle className="size-4" />
                              Decline
                            </button>
                          </>
                        ) : status === "approved" ? (
                          <>
                            <button
                              onClick={() =>
                                handleSetDriverStatus(driver.id, "suspended")
                              }
                              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                            >
                              Suspend
                            </button>

                            <button
                              onClick={() =>
                                handleSetDriverStatus(driver.id, "banned")
                              }
                              className="flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                            >
                              <FiSlash className="size-4" />
                              Ban
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              handleSetDriverStatus(driver.id, "approved")
                            }
                            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TRIP RECORDS TAB */}
        {activeTab === "records" && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold text-white">
              Trip Records & History
            </h2>

            {rides.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No rides have been recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                  >
                    <div className="min-w-48">
                      <p className="font-bold text-white">
                        Driver: {ride.driverName || "Unassigned"}
                      </p>

                      <p className="text-xs text-emerald-400">
                        Passenger: {ride.passengerName || "Unknown"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <FiMapPin className="size-3.5 text-emerald-400" />
                        <span>{ride.pickup?.name || "Pickup unavailable"}</span>
                        <span>→</span>
                        <span>{ride.dropoff?.name || "Drop-off unavailable"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 text-xs">
                      <div>
                        <p className="text-slate-400">Distance</p>
                        <p className="font-bold text-white">
                          {ride.distanceKm ?? 0} km
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Final Fare</p>
                        <p className="text-base font-extrabold text-emerald-400">
                          ₦
                          {(
                            Number(ride.finalFare ?? ride.offeredFare) || 0
                          ).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${ride.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : ride.status === "in_progress"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-white/10 text-slate-300"
                          }`}
                      >
                        {ride.status || "unknown"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RATINGS AND REVIEWS TAB */}
        {activeTab === "ratings" && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold text-white">
              Driver Ratings & Passenger Reviews
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {rides
                .filter((ride) => ride.rating)
                .map((ride) => (
                  <div
                    key={ride.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">
                          Driver: {ride.driverName || "Unknown driver"}
                        </p>

                        <p className="text-xs text-slate-400">
                          Rated by{" "}
                          {ride.rating.passengerName || "Passenger"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({
                          length: Math.max(
                            0,
                            Math.min(5, Number(ride.rating.stars) || 0)
                          ),
                        }).map((_, index) => (
                          <FiStar
                            key={index}
                            className="size-4 fill-amber-400"
                          />
                        ))}
                      </div>
                    </div>

                    {ride.rating.tags?.length > 0 && (
                      <div className="my-3 flex flex-wrap gap-1.5">
                        {ride.rating.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {ride.rating.comment && (
                      <p className="mt-2 text-sm italic text-slate-300">
                        "{ride.rating.comment}"
                      </p>
                    )}

                    <p className="mt-3 text-[10px] text-slate-500">
                      Trip #{ride.id.slice(0, 8)}:{" "}
                      {ride.pickup?.name || "Pickup"} →{" "}
                      {ride.dropoff?.name || "Drop-off"}
                    </p>
                  </div>
                ))}
            </div>

            {rides.filter((ride) => ride.rating).length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No passenger ratings have been submitted yet.
              </p>
            )}
          </div>
        )}

        {/* SOS ALERTS TAB */}
        {activeTab === "sos" && (
          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-white">
              <FiAlertOctagon className="text-rose-400" />
              Emergency SOS Alerts
            </h2>

            {activeSosRides.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                There are no active SOS alerts.
              </p>
            ) : (
              <div className="space-y-3">
                {activeSosRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4"
                  >
                    <div>
                      <p className="font-bold text-white">
                        Ride #{ride.id.slice(0, 8)}
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        Passenger:{" "}
                        {ride.emergencyAlert?.passengerName ||
                          ride.passengerName ||
                          "Unknown"}
                      </p>

                      <p className="text-sm text-slate-300">
                        Phone:{" "}
                        {ride.emergencyAlert?.passengerPhone ||
                          "Not provided"}
                      </p>

                      <p className="text-xs text-slate-400">
                        Driver:{" "}
                        {ride.emergencyAlert?.driverName ||
                          ride.driverName ||
                          "Unassigned"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Emergency contact:{" "}
                        {ride.emergencyAlert?.emergencyContact ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ride.emergencyAlert?.mapLink && (
                        <a
                          href={ride.emergencyAlert.mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950 hover:bg-slate-200"
                        >
                          Track Location
                        </a>
                      )}

                      <button
                        onClick={() => handleResolveSOS(ride.id)}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500"
                      >
                        Resolve Alert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </PageTransition>
  );
}

// Reusable statistics card
function StatCard({ title, value, suffix, description, icon }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider">
          {title}
        </span>
        {icon}
      </div>

      <p className="mt-2 text-3xl font-extrabold text-white">
        {value}{" "}
        {suffix && (
          <span className="text-base font-medium text-emerald-400">
            {suffix}
          </span>
        )}
      </p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}