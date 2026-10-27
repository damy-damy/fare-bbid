import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../fare-bidweb.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import Logo from "../components/Logo.jsx";
import GoogleMapComponent from "../components/GoogleMapComponent.jsx";
import CarMotionLayout from "../components/CarMotionLayout.jsx";
import {
  FiArrowLeft,
  FiPower,
  FiRadio,
  FiCheckCircle,
  FiNavigation,
  FiAlertTriangle,
  FiPlus,
  FiMinus,
} from "react-icons/fi";

export default function DriverConsole() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Driver Online status
  const [isOnline, setIsOnline] = useState(profile?.isOnline || false);
  const [driverStatus, setDriverStatus] = useState(profile?.driverStatus || "approved"); // "approved" | "pending" | "suspended" | "banned"
  const [loadingToggle, setLoadingToggle] = useState(false);

  // Incoming ride requests from Firestore
  const [availableRides, setAvailableRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);

  // Counter-offer modal / controls
  const [counterRideId, setCounterRideId] = useState(null);
  const [counterAmount, setCounterAmount] = useState(25.0);
  const [counterNote, setCounterNote] = useState("");

  // Car simulation progression (up to 90s max drop-off)
  const [carProgress, setCarProgress] = useState(0);
  const [ridePhase, setRidePhase] = useState("idle"); // "idle" | "driving_to_pickup" | "in_progress" | "completed"
  const [simSpeed, setSimSpeed] = useState(1);

  // Synchronize driver profile from Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isOnline !== undefined) setIsOnline(data.isOnline);
        if (data.driverStatus) setDriverStatus(data.driverStatus);
      }
    });
    return () => unsub();
  }, [user]);

  // Listen for real-time ride requests while online
  useEffect(() => {
    if (!isOnline) {
      setAvailableRides([]);
      return;
    }

    // Query rides that are requested or assigned to this driver
    const q = collection(db, "rides");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRides = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Find if this driver is assigned to an active ride
      const myActive = allRides.find(
        (r) =>
          r.driverId === user.uid &&
          ["driving_to_pickup", "in_progress"].includes(r.status)
      );

      if (myActive) {
        setActiveRide(myActive);
        setRidePhase(myActive.status);
      } else {
        setActiveRide(null);
        // Find unassigned requested rides
        const pending = allRides.filter((r) => r.status === "requested");
        setAvailableRides(pending);
      }
    });

    return () => unsubscribe();
  }, [isOnline, user]);

  // Handle Driver "Be Online / Go Offline" toggle
  async function handleToggleOnline() {
    if (driverStatus === "banned" || driverStatus === "suspended") {
      alert(`Access restricted: Your driver account is ${driverStatus.toUpperCase()} by FareBid Admin. Please contact operations.`);
      return;
    }

    setLoadingToggle(true);
    const newOnline = !isOnline;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        isOnline: newOnline,
        lastOnlineAt: serverTimestamp(),
        driverStatus: driverStatus || "approved",
        vehicle: profile?.vehicle || "Toyota Camry · Silver · ABC-1234",
      });
      setIsOnline(newOnline);
    } catch (err) {
      console.error("Toggle online error:", err);
    } finally {
      setLoadingToggle(false);
    }
  }

  // Accept a passenger's initial offered fare
  async function handleAcceptRide(ride) {
    try {
      await updateDoc(doc(db, "rides", ride.id), {
        status: "driving_to_pickup",
        driverId: user.uid,
        driverName: profile?.displayName || user.email.split("@")[0],
        driverVehicle: profile?.vehicle || "Toyota Camry · Silver · ABC-1234",
        driverPhone: profile?.phone || "+1 (555) 789-0123",
        finalFare: ride.offeredFare,
        acceptedAt: serverTimestamp(),
      });
      setActiveRide({ ...ride, status: "driving_to_pickup" });
      setRidePhase("driving_to_pickup");
      setCarProgress(0);
    } catch (err) {
      console.error("Error accepting ride:", err);
    }
  }

  // Propose a Counter-Offer
  async function handleSubmitCounterOffer() {
    if (!counterRideId) return;

    try {
      const rideRef = doc(db, "rides", counterRideId);
      const rideSnap = await getDoc(rideRef);
      if (rideSnap.exists()) {
        const curBids = rideSnap.data().bids || [];
        await updateDoc(rideRef, {
          bids: [
            ...curBids,
            {
              bidder: "driver",
              driverId: user.uid,
              driverName: profile?.displayName || "Driver (" + (profile?.ratingAverage || 4.9) + " ★)",
              driverVehicle: profile?.vehicle || "Toyota Camry · Silver",
              amount: counterAmount,
              message: counterNote || "Ready nearby. Premium service with air conditioning.",
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }
      setCounterRideId(null);
      setCounterNote("");
    } catch (err) {
      console.error("Counter-offer error:", err);
    }
  }

  // Advance ride phases (Pickup arrived -> Start ride -> Dropoff complete)
  async function handleAdvanceRideStatus(nextStatus) {
    if (!activeRide) return;

    try {
      const updates = { status: nextStatus };
      if (nextStatus === "in_progress") {
        updates.pickedUpAt = serverTimestamp();
        setRidePhase("in_progress");
        setCarProgress(0);
      } else if (nextStatus === "completed") {
        updates.completedAt = serverTimestamp();
        setRidePhase("completed");
        setActiveRide(null);

        // Update driver's total distance in profile
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const currentKm = userSnap.data().totalDistanceKm || 0;
            await updateDoc(userRef, {
              totalDistanceKm: currentKm + (activeRide.distanceKm || 5.2),
              completedRidesCount: (userSnap.data().completedRidesCount || 0) + 1,
            });
          }
        } catch (e) {
          console.warn(e);
        }
      }

      await updateDoc(doc(db, "rides", activeRide.id), updates);
    } catch (err) {
      console.error("Advance ride error:", err);
    }
  }

  // Animation loop for driver road navigation (up to 90s max drop-off)
  const animRef = useRef(null);
  useEffect(() => {
    if (!activeRide || (ridePhase !== "driving_to_pickup" && ridePhase !== "in_progress")) {
      if (animRef.current) clearInterval(animRef.current);
      return;
    }

    const duration = ridePhase === "driving_to_pickup" ? 30 : 60; // 90s total max
    const step = (0.2 / duration) * simSpeed;

    animRef.current = setInterval(() => {
      setCarProgress((p) => {
        if (p >= 1) return 1;
        return p + step;
      });
    }, 200);

    return () => clearInterval(animRef.current);
  }, [activeRide, ridePhase, simSpeed]);

  return (
    <PageTransition className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver")}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FiArrowLeft className="size-4" />
              <span>Dashboard</span>
            </button>
            <Logo to="/driver" />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Pill */}
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${isOnline
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-white/10 bg-white/5 text-slate-400"
                }`}
            >
              <span
                className={`size-2 rounded-full ${isOnline ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                  }`}
              />
              {isOnline ? "ACTIVE ON FARE-BID" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
        {/* Banner if driver account is suspended or banned by Admin */}
        {(driverStatus === "suspended" || driverStatus === "banned") && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-200">
            <FiAlertTriangle className="size-6 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-white">ACCOUNT {driverStatus.toUpperCase()} BY ADMIN</p>
              <p className="text-xs text-rose-300">
                You cannot go online or accept ride bookings until your account status is reactivated in the Admin Ops Hub.
              </p>
            </div>
          </div>
        )}

        {/* Top Control Bar: "Be Online" Big Toggle & Telemetry */}
        <div className="mb-6 grid gap-4 sm:grid-cols-12">
          {/* Online Toggle Hero Button */}
          <div className="sm:col-span-6 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">Driver Radar Status</p>
                <h2 className="text-xl font-bold text-white">
                  {isOnline ? "You are Online & Receiving Bids" : "You are Currently Offline"}
                </h2>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loadingToggle || driverStatus === "banned"}
                onClick={handleToggleOnline}
                className={`flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-extrabold shadow-xl transition-all ${isOnline
                  ? "bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-500"
                  : "bg-linear-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400"
                  }`}
              >
                <FiPower className="size-5" />
                <span>{isOnline ? "Go Offline" : "Be Online (Active)"}</span>
              </motion.button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="sm:col-span-6 grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-center">
              <p className="text-xs text-slate-400">Total Distance</p>
              <p className="font-sans text-xl font-bold text-white">
                {(profile?.totalDistanceKm || 128.4).toFixed(1)} km
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-center">
              <p className="text-xs text-slate-400">Driver Rating</p>
              <p className="font-sans text-xl font-bold text-amber-400">
                ★ {profile?.ratingAverage || 4.9}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-center">
              <p className="text-xs text-slate-400">Completed</p>
              <p className="font-sans text-xl font-bold text-emerald-400">
                {profile?.completedRidesCount || 14} rides
              </p>
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Active Ride Navigation or Radar Map */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiNavigation className="size-5 text-amber-400" />
                  <h3 className="font-bold text-white">
                    {activeRide ? "Live Turn-by-Turn Road Route" : "Driver Dispatch Radar"}
                  </h3>
                </div>

                {activeRide && (
                  <button
                    onClick={() => setSimSpeed((s) => (s === 1 ? 3 : 1))}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-amber-300"
                  >
                    {simSpeed}x Speed
                  </button>
                )}
              </div>

              {/* Navigation Map */}
              <GoogleMapComponent
                pickup={activeRide?.pickup || { lat: 40.7128, lng: -74.0060, name: "City Center" }}
                dropoff={activeRide?.dropoff || { lat: 40.7505, lng: -73.9934, name: "Midtown" }}
                ridePhase={ridePhase}
                carProgress={carProgress}
                interactive={false}
                height="440px"
              />
            </div>

            {/* Road Line Motion in Car Cockpit Layout */}
            {activeRide && (
              <CarMotionLayout
                pickup={activeRide.pickup}
                dropoff={activeRide.dropoff}
                progress={carProgress}
                phase={ridePhase}
                speedKmH={52}
                maxSeconds={90}
                elapsedSeconds={carProgress * 90}
              />
            )}

            {/* Active Ride Control Panel */}
            {activeRide && (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-xl backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      CURRENT MISSION · {ridePhase.toUpperCase()}
                    </span>
                    <h4 className="mt-1 text-lg font-bold text-white">
                      Passenger: {activeRide.passengerName}
                    </h4>
                    <p className="text-xs text-slate-300">
                      Pickup: {activeRide.pickup?.name} → Drop-off: {activeRide.dropoff?.name}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Locked Fare</p>
                    <p className="font-sans text-3xl font-extrabold text-emerald-400">
                      ₦{activeRide.finalFare?.toLocaleString("en-NG")}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>
                      {ridePhase === "driving_to_pickup"
                        ? "Approaching Passenger Pickup Point"
                        : "En route to destination (Max 90s drop-off)"}
                    </span>
                    <span>{Math.round(carProgress * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${Math.round(carProgress * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Driver Action Buttons */}
                <div className="mt-5 flex flex-wrap gap-3">
                  {ridePhase === "driving_to_pickup" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceRideStatus("in_progress")}
                      className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
                    >
                      ✓ I Have Arrived & Picked Up Passenger
                    </button>
                  )}

                  {ridePhase === "in_progress" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceRideStatus("completed")}
                      className="flex-1 rounded-2xl bg-linear-to-r from-amber-400 to-orange-400 py-3 text-sm font-bold text-slate-950 shadow-lg hover:brightness-110"
                    >
                      🏁 Arrived at Destination · Complete Ride
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Incoming Ride Bids & Requests */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <FiRadio className="size-5 text-emerald-400 animate-pulse" />
                  <h3 className="font-sans text-xl font-bold text-white">Live Ride Radar</h3>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  {availableRides.length} available
                </span>
              </div>

              {!isOnline ? (
                <div className="py-12 text-center">
                  <span className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-white/5 text-slate-500 mb-3">
                    <FiPower className="size-7" />
                  </span>
                  <p className="font-bold text-white">You are Currently Offline</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                    Click "Be Online" above to enable radar and receive passenger ride bookings.
                  </p>
                </div>
              ) : availableRides.length === 0 && !activeRide ? (
                <div className="py-12 text-center">
                  <span className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 animate-spin">
                    <FiRadio className="size-7" />
                  </span>
                  <p className="font-bold text-white">Scanning for Nearby Ride Requests...</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                    New passenger bookings will appear here instantly with option to Accept or Counter-Offer.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {availableRides.map((ride) => (
                    <motion.div
                      key={ride.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-white/15 bg-slate-950/70 p-5 shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-white">{ride.passengerName}</p>
                          <p className="text-xs text-slate-400">Distance: {ride.distanceKm} km</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Offered Fare</p>
                          <span className="font-sans text-2xl font-extrabold text-emerald-400">
                            ₦{ride.offeredFare?.toLocaleString("en-NG")}
                          </span>
                        </div>
                      </div>

                      {/* Route Waypoints */}
                      <div className="my-3 space-y-1.5 rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          <span className="truncate">Pickup: {ride.pickup?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-rose-400" />
                          <span className="truncate">Drop: {ride.dropoff?.name}</span>
                        </div>
                      </div>

                      {/* Action buttons: Accept or Counter-Offer */}
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => handleAcceptRide(ride)}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <FiCheckCircle className="size-4" />
                          <span>Accept ₦{ride.offeredFare?.toLocaleString("en-NG")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCounterRideId(ride.id);
                            setCounterAmount(Math.round(ride.offeredFare * 1.2 * 10) / 10);
                          }}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
                        >
                          <span className="text-sm font-bold">₦</span>
                          <span>Counter-Offer</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Counter-Offer Modal */}
      <AnimatePresence>
        {counterRideId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
            >
              <h3 className="font-sans text-2xl font-bold text-white">Propose Counter-Offer</h3>
              <p className="mt-1 text-xs text-slate-400">
                Offer a higher price for this trip. The passenger will receive this in real-time.
              </p>

              {/* Price Stepper */}
              <div className="my-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCounterAmount((a) => Math.max(1000, a - 100))}
                    className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20"
                  >
                    <FiMinus className="size-5" />
                  </button>

                  <div className="text-center">
                    <span className="font-sans text-4xl font-extrabold text-amber-400">
                      ₦{counterAmount.toLocaleString("en-NG")}
                    </span>
                    <p className="text-[11px] text-slate-400">Proposed Fare</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCounterAmount((a) => a + 100)}
                    className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20"
                  >
                    <FiPlus className="size-5" />
                  </button>
                </div>
              </div>

              {/* Message Note */}
              <input
                type="text"
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder="Optional note: e.g. 2 mins away, clean car"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCounterRideId(null)}
                  className="rounded-xl border border-white/10 py-3 text-xs font-semibold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCounterOffer}
                  className="rounded-xl bg-amber-400 py-3 text-xs font-bold text-slate-950 hover:bg-amber-300"
                >
                  Send Counter-Offer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
