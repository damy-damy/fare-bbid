
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
  FiMapPin,
  FiClock,
  FiActivity,
} from "react-icons/fi";

export default function DriverConsole() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(profile?.isOnline || false);
  const [driverStatus, setDriverStatus] = useState(
    profile?.driverStatus || "approved"
  );
  const [loadingToggle, setLoadingToggle] = useState(false);

  const [availableRides, setAvailableRides] = useState([]);
  const [hiddenRideIds, setHiddenRideIds] = useState([]);
  const [activeRide, setActiveRide] = useState(null);

  const [counterRideId, setCounterRideId] = useState(null);
  const [counterAmount, setCounterAmount] = useState(1000);
  const [counterNote, setCounterNote] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState(null);
  const [updatingRideStatus, setUpdatingRideStatus] = useState(false);

  const [carProgress, setCarProgress] = useState(0);
  const [ridePhase, setRidePhase] = useState("idle");
  const [simSpeed, setSimSpeed] = useState(1);

  const animRef = useRef(null);

  const driverName =
    profile?.displayName || user?.email?.split("@")[0] || "Driver";

  const driverVehicle =
    profile?.vehicle || "Vehicle details not provided";

  const formatFare = (amount) =>
    Number(amount || 0).toLocaleString("en-NG");

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        if (data.isOnline !== undefined) {
          setIsOnline(data.isOnline);
        }

        if (data.driverStatus) {
          setDriverStatus(data.driverStatus);
        }
      },
      (error) => console.error("Driver profile listener:", error)
    );

    return () => unsubscribe();
  }, [user]);

  // Listen for passenger requests and the driver's active ride.
  useEffect(() => {
    if (!user || !isOnline) {
      setAvailableRides([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "rides"),
      (snapshot) => {
        const allRides = snapshot.docs.map((rideDoc) => ({
          id: rideDoc.id,
          ...rideDoc.data(),
        }));

        const myActiveRide = allRides.find(
          (ride) =>
            ride.driverId === user.uid &&
            ["driving_to_pickup", "in_progress"].includes(ride.status)
        );

        if (myActiveRide) {
          setActiveRide(myActiveRide);
          setRidePhase(myActiveRide.status);
          setAvailableRides([]);
          return;
        }

        setActiveRide(null);
        setRidePhase("idle");

        const pendingRides = allRides.filter(
          (ride) =>
            ride.status === "requested" &&
            (!ride.driverId || ride.driverId === user.uid) &&
            !hiddenRideIds.includes(ride.id)
        );

        setAvailableRides(pendingRides);
      },
      (error) => console.error("Ride request listener:", error)
    );

    return () => unsubscribe();
  }, [user, isOnline, hiddenRideIds]);

  async function handleToggleOnline() {
    if (!user) return;

    if (driverStatus === "banned" || driverStatus === "suspended") {
      alert(
        `Access restricted: your driver account is ${driverStatus}. Please contact FareBid support.`
      );
      return;
    }

    setLoadingToggle(true);

    try {
      const newOnlineStatus = !isOnline;

      await updateDoc(doc(db, "users", user.uid), {
        isOnline: newOnlineStatus,
        lastOnlineAt: serverTimestamp(),
        driverStatus: driverStatus || "approved",
        vehicle: profile?.vehicle || "",
      });

      setIsOnline(newOnlineStatus);
    } catch (error) {
      console.error("Online status error:", error);
      alert("Unable to update your online status. Please try again.");
    } finally {
      setLoadingToggle(false);
    }
  }

  async function handleAcceptRide(ride) {
    if (!user || acceptingRideId) return;

    setAcceptingRideId(ride.id);

    try {
      const rideRef = doc(db, "rides", ride.id);
      const rideSnapshot = await getDoc(rideRef);

      if (!rideSnapshot.exists()) {
        alert("This ride request is no longer available.");
        return;
      }

      const currentRide = rideSnapshot.data();

      if (
        currentRide.status !== "requested" ||
        (currentRide.driverId && currentRide.driverId !== user.uid)
      ) {
        alert(
          "This ride has already been accepted or is no longer available."
        );
        return;
      }

      await updateDoc(rideRef, {
        status: "driving_to_pickup",
        driverId: user.uid,
        driverName,
        driverVehicle,
        driverPhone: profile?.phone || "",
        finalFare: currentRide.offeredFare,
        acceptedAt: serverTimestamp(),
      });

      setActiveRide({
        ...currentRide,
        id: ride.id,
        status: "driving_to_pickup",
        driverId: user.uid,
        driverName,
        driverVehicle,
        finalFare: currentRide.offeredFare,
      });

      setRidePhase("driving_to_pickup");
      setCarProgress(0);
    } catch (error) {
      console.error("Accept ride error:", error);
      alert("Unable to accept this ride. Please try again.");
    } finally {
      setAcceptingRideId(null);
    }
  }

  async function handleSubmitCounterOffer() {
    if (!user || !counterRideId || sendingOffer) return;

    if (
      !Number.isFinite(Number(counterAmount)) ||
      Number(counterAmount) <= 0
    ) {
      alert("Enter a valid fare.");
      return;
    }

    setSendingOffer(true);

    try {
      const rideRef = doc(db, "rides", counterRideId);
      const rideSnapshot = await getDoc(rideRef);

      if (!rideSnapshot.exists()) {
        alert("This ride request is no longer available.");
        return;
      }

      const ride = rideSnapshot.data();

      if (ride.status !== "requested") {
        alert("This ride is no longer accepting offers.");
        return;
      }

      const currentBids = ride.bids || [];

      const existingOffer = currentBids.some(
        (bid) => bid.bidder === "driver" && bid.driverId === user.uid
      );

      if (existingOffer) {
        alert("You have already sent an offer for this ride.");
        return;
      }

      await updateDoc(rideRef, {
        bids: [
          ...currentBids,
          {
            bidder: "driver",
            driverId: user.uid,
            driverName,
            driverVehicle,
            amount: Number(counterAmount),
            message: counterNote.trim(),
            timestamp: new Date().toISOString(),
          },
        ],
      });

      setCounterRideId(null);
      setCounterNote("");

      alert("Counter-offer sent to the passenger.");
    } catch (error) {
      console.error("Counter-offer error:", error);
      alert("Unable to send your offer. Please try again.");
    } finally {
      setSendingOffer(false);
    }
  }

  async function handleAdvanceRideStatus(nextStatus) {
    if (!activeRide || !user || updatingRideStatus) return;

    setUpdatingRideStatus(true);

    try {
      const rideRef = doc(db, "rides", activeRide.id);
      const rideSnapshot = await getDoc(rideRef);

      if (!rideSnapshot.exists()) {
        alert("This ride could not be found.");
        return;
      }

      const currentRide = rideSnapshot.data();

      if (currentRide.driverId !== user.uid) {
        alert("This ride is no longer assigned to your account.");
        return;
      }

      if (
        nextStatus === "in_progress" &&
        currentRide.status !== "driving_to_pickup"
      ) {
        return;
      }

      if (
        nextStatus === "completed" &&
        currentRide.status !== "in_progress"
      ) {
        return;
      }

      const updates = { status: nextStatus };

      if (nextStatus === "in_progress") {
        updates.pickedUpAt = serverTimestamp();
      }

      if (nextStatus === "completed") {
        updates.completedAt = serverTimestamp();
      }

      await updateDoc(rideRef, updates);

      if (nextStatus === "in_progress") {
        setRidePhase("in_progress");
        setCarProgress(0);
      }

      if (nextStatus === "completed") {
        setRidePhase("completed");
        setActiveRide(null);
        setAvailableRides([]);

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const driverData = userSnapshot.data();

          await updateDoc(userRef, {
            totalDistanceKm:
              (driverData.totalDistanceKm || 0) +
              (currentRide.distanceKm || 0),
            completedRidesCount:
              (driverData.completedRidesCount || 0) + 1,
          });
        }
      }
    } catch (error) {
      console.error("Ride status error:", error);
      alert("Unable to update the ride status. Please try again.");
    } finally {
      setUpdatingRideStatus(false);
    }
  }

  // Simulated progress only, not real GPS tracking.
  useEffect(() => {
    if (
      !activeRide ||
      !["driving_to_pickup", "in_progress"].includes(ridePhase)
    ) {
      if (animRef.current) clearInterval(animRef.current);
      return;
    }

    const duration = ridePhase === "driving_to_pickup" ? 30 : 60;
    const step = (0.2 / duration) * simSpeed;

    animRef.current = setInterval(() => {
      setCarProgress((progress) => Math.min(1, progress + step));
    }, 200);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [activeRide, ridePhase, simSpeed]);

  return (
    <PageTransition className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate("/driver")}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-lime-400 hover:bg-lime-100"
            >
              <FiArrowLeft className="size-4" />
              <span>Dashboard</span>
            </button>

            <Logo to="/driver" />
          </div>

          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold sm:text-xs ${isOnline
              ? "border-lime-400 bg-lime-100 text-slate-900"
              : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
          >
            <span
              className={`size-2 rounded-full ${isOnline ? "animate-pulse bg-lime-500" : "bg-slate-300"
                }`}
            />
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-col gap-2 text-slate-900 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
              FareBid Driver
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Welcome back, {driverName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Manage your availability, review passenger offers, and keep your
              trips organised from one place.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <FiActivity className="size-4 text-emerald-800" />
            Driver control centre
          </div>
        </div>

        {(driverStatus === "suspended" || driverStatus === "banned") && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm">
            <FiAlertTriangle className="mt-0.5 size-6 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">
                ACCOUNT {driverStatus.toUpperCase()}
              </p>
              <p className="mt-1 text-sm text-rose-700">
                You cannot go online or accept rides until your account is
                reactivated by FareBid Admin.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-12">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-6 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${isOnline
                      ? "bg-lime-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    <FiPower className="size-5" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Driver availability
                  </p>
                </div>

                <h2 className="mt-4 text-xl font-extrabold text-slate-900">
                  {isOnline
                    ? "You're ready for requests"
                    : "You're currently offline"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isOnline
                    ? "Passenger requests will appear below while you're online."
                    : "Go online when you're ready to receive passenger requests."}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={
                  loadingToggle ||
                  driverStatus === "banned" ||
                  driverStatus === "suspended"
                }
                onClick={handleToggleOnline}
                className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${isOnline
                  ? "bg-slate-800 text-white hover:bg-slate-900"
                  : "bg-lime-400 text-slate-950 hover:bg-lime-300"
                  }`}
              >
                <FiPower className="size-5" />
                {loadingToggle
                  ? "Updating..."
                  : isOnline
                    ? "Go Offline"
                    : "Go Online"}
              </motion.button>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-3 sm:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-5">
              <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-lime-100 text-emerald-800">
                <FiNavigation className="size-4" />
              </span>
              <p className="mt-3 text-[11px] font-semibold text-slate-500 sm:text-xs">
                Distance
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 sm:text-2xl">
                {(Number(profile?.totalDistanceKm) || 0).toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">km</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-5">
              <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <span className="text-lg">★</span>
              </span>
              <p className="mt-3 text-[11px] font-semibold text-slate-500 sm:text-xs">
                Rating
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-800 sm:text-2xl">
                {profile?.ratingAverage || "—"}
              </p>
              <p className="text-xs text-slate-500">driver</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-5">
              <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-lime-100 text-emerald-800">
                <FiCheckCircle className="size-4" />
              </span>
              <p className="mt-3 text-[11px] font-semibold text-slate-500 sm:text-xs">
                Completed
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 sm:text-2xl">
                {profile?.completedRidesCount || 0}
              </p>
              <p className="text-xs text-slate-500">rides</p>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <section className="flex min-w-0 flex-col gap-5 lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-lime-100 text-emerald-800">
                    <FiNavigation className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900">
                      {activeRide ? "Your passenger's route" : "Driver map"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeRide
                        ? "Pickup and destination"
                        : "Your ride route will appear here after you accept a request."}
                    </p>
                  </div>
                </div>

                {activeRide && (
                  <button
                    type="button"
                    onClick={() =>
                      setSimSpeed((speed) => (speed === 1 ? 3 : 1))
                    }
                    className="rounded-xl border border-lime-300 bg-lime-50 px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-lime-100"
                  >
                    {simSpeed}× simulation
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <GoogleMapComponent
                  pickup={activeRide?.pickup || null}
                  dropoff={activeRide?.dropoff || null}
                  driverLocation={null}
                  ridePhase={ridePhase}
                  carProgress={carProgress}
                  interactive={false}
                  height="440px"
                />
              </div>

              {!activeRide && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-lime-50 p-4">
                  <FiMapPin className="mt-0.5 size-5 shrink-0 text-emerald-800" />
                  <p className="text-xs leading-5 text-slate-700">
                    Accept a passenger request to display the pickup and
                    destination on your map. No fake route is shown while you
                    have no active ride.
                  </p>
                </div>
              )}
            </div>

            {activeRide && (
              <>
                <CarMotionLayout
                  pickup={activeRide.pickup}
                  dropoff={activeRide.dropoff}
                  progress={carProgress}
                  phase={ridePhase}
                  speedKmH={52}
                  maxSeconds={90}
                  elapsedSeconds={carProgress * 90}
                />

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1.5 text-xs font-bold text-slate-900">
                        <span className="size-2 rounded-full bg-emerald-700" />
                        {ridePhase === "driving_to_pickup"
                          ? "GOING TO PICKUP"
                          : "PASSENGER ON BOARD"}
                      </span>
                      <h4 className="mt-4 text-xl font-extrabold text-slate-900">
                        {activeRide.passengerName || "Passenger"}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Your current passenger
                      </p>
                    </div>

                    <div className="rounded-2xl bg-lime-400 px-4 py-3 text-slate-950">
                      <p className="text-xs font-medium text-slate-700">
                        Agreed fare
                      </p>
                      <p className="mt-1 text-2xl font-extrabold">
                        ₦{formatFare(activeRide.finalFare)}
                      </p>
                    </div>
                  </div>

                  <div className="my-5 h-px bg-slate-100" />

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-emerald-800">
                        <FiMapPin className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Pickup location
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                          {activeRide.pickup?.name ||
                            activeRide.pickup?.address ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="ml-4 h-4 border-l-2 border-dashed border-lime-400" />

                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <FiNavigation className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Destination
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                          {activeRide.dropoff?.name ||
                            activeRide.dropoff?.address ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <FiClock className="size-4 text-emerald-800" />
                        Trip progress
                      </div>
                      <span className="text-sm font-extrabold text-emerald-800">
                        {Math.round(carProgress * 100)}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-lime-400 transition-all duration-300"
                        style={{
                          width: `${Math.round(carProgress * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Progress is simulated for demonstration and does not
                      represent your actual GPS position.
                    </p>
                  </div>

                  <div className="mt-5">
                    {ridePhase === "driving_to_pickup" && (
                      <button
                        type="button"
                        disabled={updatingRideStatus}
                        onClick={() =>
                          handleAdvanceRideStatus("in_progress")
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-4 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiCheckCircle className="size-5" />
                        {updatingRideStatus
                          ? "Updating ride..."
                          : "Passenger Picked Up — Start Ride"}
                      </button>
                    )}

                    {ridePhase === "in_progress" && (
                      <button
                        type="button"
                        disabled={updatingRideStatus}
                        onClick={() =>
                          handleAdvanceRideStatus("completed")
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-4 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiCheckCircle className="size-5" />
                        {updatingRideStatus
                          ? "Completing ride..."
                          : "Arrived — Complete Ride"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Passenger requests */}
          <section className="min-w-0 lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-white p-5 text-slate-900 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-lime-100 text-slate-900">
                      <FiRadio className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-extrabold">
                        Passenger Requests
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Review fares and choose your next trip
                      </p>
                    </div>
                  </div>

                  {/* Request count and Clear button */}
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-full bg-lime-400 px-3 py-1.5 text-xs font-extrabold text-slate-950">
                      {availableRides.length}
                    </span>

                    {availableRides.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setHiddenRideIds((ids) => [
                            ...new Set([
                              ...ids,
                              ...availableRides.map((ride) => ride.id),
                            ]),
                          ]);
                          setAvailableRides([]);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {!isOnline ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <FiPower className="size-7" />
                    </span>
                    <p className="font-extrabold text-slate-900">
                      You're offline
                    </p>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      Go online to receive passenger ride requests.
                    </p>
                    <button
                      type="button"
                      onClick={handleToggleOnline}
                      disabled={
                        loadingToggle ||
                        driverStatus === "banned" ||
                        driverStatus === "suspended"
                      }
                      className="mt-5 rounded-xl bg-lime-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-300 disabled:opacity-50"
                    >
                      {loadingToggle ? "Updating..." : "Go Online"}
                    </button>
                  </div>
                ) : activeRide ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-lime-100 text-emerald-800">
                      <FiNavigation className="size-7" />
                    </span>
                    <p className="font-extrabold text-slate-900">
                      You have an active ride
                    </p>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      Complete your current trip before accepting another
                      passenger request.
                    </p>
                  </div>
                ) : availableRides.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-lime-100 text-emerald-800">
                      <FiRadio className="size-7" />
                    </span>
                    <p className="font-extrabold text-slate-900">
                      No visible requests
                    </p>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      New passenger requests will appear here when available.
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-2 text-xs font-bold text-slate-800">
                      <span className="size-2 animate-pulse rounded-full bg-lime-500" />
                      Listening for rides
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableRides.map((ride) => (
                      <motion.article
                        key={ride.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-lime-400 hover:shadow-md sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900">
                              {ride.passengerName || "Passenger"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Ride request
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-800">
                            Available
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-lime-50 p-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-600">
                              Passenger's offer
                            </p>
                            <p className="mt-1 text-2xl font-extrabold text-slate-950">
                              ₦{formatFare(ride.offeredFare)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Distance</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {ride.distanceKm ?? "—"} km
                            </p>
                          </div>
                        </div>

                        <div className="my-4 space-y-4 rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-emerald-800">
                              <FiMapPin className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Pickup
                              </p>
                              <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">
                                {ride.pickup?.name ||
                                  ride.pickup?.address ||
                                  "Pickup location not provided"}
                              </p>
                            </div>
                          </div>

                          <div className="ml-3.5 h-4 border-l-2 border-dashed border-lime-400" />

                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                              <FiMapPin className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Drop-off
                              </p>
                              <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">
                                {ride.dropoff?.name ||
                                  ride.dropoff?.address ||
                                  "Drop-off location not provided"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={!!acceptingRideId}
                            onClick={() => handleAcceptRide(ride)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-3 py-3.5 text-xs font-extrabold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FiCheckCircle className="size-4" />
                            {acceptingRideId === ride.id
                              ? "Accepting..."
                              : "Accept ride"}
                          </button>

                          <button
                            type="button"
                            disabled={!!acceptingRideId}
                            onClick={() => {
                              setCounterRideId(ride.id);
                              setCounterAmount(
                                Math.max(
                                  1000,
                                  Math.round(
                                    Number(ride.offeredFare || 1000) * 1.2
                                  )
                                )
                              );
                            }}
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-xs font-extrabold text-slate-800 transition hover:border-lime-400 hover:bg-lime-50 disabled:opacity-50"
                          >
                            <span className="text-sm">₦</span>
                            Counter-offer
                          </button>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-8 pb-3 text-center text-xs text-slate-500">
          FareBid Driver Console · Drive safely and treat every passenger with
          respect.
        </footer>
      </main>

      <AnimatePresence>
        {counterRideId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
            >
              <span className="inline-flex rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-slate-900">
                FARE NEGOTIATION
              </span>
              <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
                Make a counter-offer
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Propose your fare. The passenger can review your offer.
              </p>

              <div className="my-6 rounded-2xl bg-lime-400 p-5 text-slate-950">
                <p className="text-xs font-semibold text-slate-700">
                  Your proposed fare
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCounterAmount((amount) =>
                        Math.max(1000, amount - 100)
                      )
                    }
                    disabled={sendingOffer}
                    aria-label="Decrease fare by 100 naira"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-950/15 bg-white/40 transition hover:bg-white/70 disabled:opacity-50"
                  >
                    <FiMinus className="size-5" />
                  </button>
                  <div className="min-w-0 text-center">
                    <p className="break-words text-3xl font-extrabold">
                      ₦{formatFare(counterAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      Nigerian naira
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCounterAmount((amount) => amount + 100)
                    }
                    disabled={sendingOffer}
                    aria-label="Increase fare by 100 naira"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-950/15 bg-white/40 transition hover:bg-white/70 disabled:opacity-50"
                  >
                    <FiPlus className="size-5" />
                  </button>
                </div>
              </div>

              <label
                htmlFor="counter-note"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Message to passenger{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <input
                id="counter-note"
                type="text"
                value={counterNote}
                onChange={(event) => setCounterNote(event.target.value)}
                placeholder="e.g. I'm nearby"
                maxLength={150}
                disabled={sendingOffer}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-lime-500 focus:ring-2 focus:ring-lime-100 disabled:opacity-60"
              />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCounterRideId(null);
                    setCounterNote("");
                  }}
                  disabled={sendingOffer}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCounterOffer}
                  disabled={sendingOffer}
                  className="rounded-xl bg-lime-400 px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingOffer ? "Sending..." : "Send offer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
