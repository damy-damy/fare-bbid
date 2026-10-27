import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../fare-bidweb.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import Logo from "../components/Logo.jsx";
import GoogleMapComponent, {
  POPULAR_LANDMARKS,
  calculateDistanceKm,
  calculateFare,
} from "../components/GoogleMapComponent.jsx";
import CarMotionLayout from "../components/CarMotionLayout.jsx";
import {
  FiMinus,
  FiPlus,
  FiAlertOctagon,
  FiCheckCircle,
  FiStar,
  FiPhone,
  FiNavigation,
  FiArrowLeft,
  FiZap,
} from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";

export default function PassengerBook() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Location picking states
  const [pickup, setPickup] = useState(POPULAR_LANDMARKS[0]);
  const [dropoff, setDropoff] = useState(POPULAR_LANDMARKS[1]);
  const [selectionMode, setSelectionMode] = useState("pickup"); // "pickup" | "dropoff"

  // Bidding & Fare state
  const distanceKm = calculateDistanceKm(pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng);
  const baseCalculatedFare = calculateFare(distanceKm);
  const [offeredFare, setOfferedFare] = useState(baseCalculatedFare);

  // Recalculate fare when locations change (if user hasn't manually adjusted it far away)
  useEffect(() => {
    setOfferedFare(baseCalculatedFare);
  }, [baseCalculatedFare]);

  // Passenger details & Emergency contact
  const [emergencyContact, setEmergencyContact] = useState(
    profile?.emergencyContact || "+1 (555) 911-0199"
  );
  const [passengerPhone, setPassengerPhone] = useState(profile?.phone || "+1 (555) 234-5678");

  // Ride lifecycle state
  const [activeRideId, setActiveRideId] = useState(null);
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Animation & simulation progression
  // Max drop-off time is 90 seconds (can be fast-forwarded for testing)
  const [simSpeed, setSimSpeed] = useState(1); // 1x or 3x speed multiplier
  const [carProgress, setCarProgress] = useState(0); // 0 to 1
  const [ridePhase, setRidePhase] = useState("idle"); // "idle" | "driving_to_pickup" | "in_progress" | "completed"
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // SOS & Rating modals
  const [sosActive, setSosActive] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [selectedTags, setSelectedTags] = useState(["Great Service", "Smooth Ride"]);

  // Listen to active ride updates in Firestore
  useEffect(() => {
    if (!activeRideId) return;

    const unsubscribe = onSnapshot(doc(db, "rides", activeRideId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRideData(data);

        // Synchronize phase with Firestore
        if (data.status === "driving_to_pickup") {
          setRidePhase("driving_to_pickup");
        } else if (data.status === "in_progress") {
          setRidePhase("in_progress");
        } else if (data.status === "completed") {
          setRidePhase("completed");
          setShowRatingModal(true);
        }

        if (data.emergencyAlert?.active) {
          setSosActive(true);
        }
      }
    });

    return () => unsubscribe();
  }, [activeRideId]);

  // Car movement simulation timer along road routes (up to 90 seconds max)
  const animationRef = useRef(null);
  useEffect(() => {
    if (ridePhase !== "driving_to_pickup" && ridePhase !== "in_progress") {
      if (animationRef.current) clearInterval(animationRef.current);
      return;
    }

    // Phase 1 (to pickup): ~30 seconds. Phase 2 (to dropoff): ~60 seconds (Total 90s max)
    const phaseTargetDuration = ridePhase === "driving_to_pickup" ? 30 : 60;
    const intervalMs = 150;
    const stepIncrement = (intervalMs / 1000 / phaseTargetDuration) * simSpeed;

    animationRef.current = setInterval(() => {
      setCarProgress((prev) => {
        const next = prev + stepIncrement;
        if (next >= 1) {
          if (ridePhase === "driving_to_pickup") {
            // Arrived at pickup -> Transition to in_progress
            if (activeRideId) {
              updateDoc(doc(db, "rides", activeRideId), {
                status: "in_progress",
                pickedUpAt: serverTimestamp(),
              }).catch(console.error);
            }
            setRidePhase("in_progress");
            return 0;
          } else if (ridePhase === "in_progress") {
            // Arrived at destination -> Transition to completed
            if (activeRideId) {
              updateDoc(doc(db, "rides", activeRideId), {
                status: "completed",
                completedAt: serverTimestamp(),
              }).catch(console.error);
            }
            setRidePhase("completed");
            setShowRatingModal(true);
            return 1;
          }
        }
        return next;
      });

      setElapsedSeconds((s) => s + (intervalMs / 1000) * simSpeed);
    }, intervalMs);

    return () => clearInterval(animationRef.current);
  }, [ridePhase, simSpeed, activeRideId]);

  // Adjust fare helper
  function adjustFare(amount) {
    setOfferedFare((prev) => Math.max(4.0, Math.round((prev + amount) * 10) / 10));
  }

  // Book / Request Ride
  async function handleBookRide() {
    if (!pickup || !dropoff) {
      setErrorMsg("Please choose both a pickup location and destination.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const newRide = {
        passengerId: user.uid,
        passengerName: profile?.displayName || user.email.split("@")[0],
        passengerEmail: user.email,
        passengerPhone,
        emergencyContact,
        pickup: {
          name: pickup.name,
          address: pickup.address,
          lat: pickup.lat,
          lng: pickup.lng,
        },
        dropoff: {
          name: dropoff.name,
          address: dropoff.address,
          lat: dropoff.lat,
          lng: dropoff.lng,
        },
        distanceKm,
        suggestedFare: baseCalculatedFare,
        offeredFare,
        finalFare: offeredFare,
        status: "requested", // requested -> accepted -> driving_to_pickup -> in_progress -> completed
        bids: [
          {
            bidder: "passenger",
            userId: user.uid,
            name: profile?.displayName || "Passenger",
            amount: offeredFare,
            timestamp: new Date().toISOString(),
          },
        ],
        emergencyAlert: { active: false },
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "rides"), newRide);
      setActiveRideId(docRef.id);
      setRideData({ ...newRide, id: docRef.id });
    } catch (err) {
      console.error("Booking error:", err);
      setErrorMsg("Failed to book ride: " + (err.message || "Please check connection."));
    } finally {
      setLoading(false);
    }
  }

  // Accept a driver's counter-offer
  async function handleAcceptCounterOffer(bid) {
    if (!activeRideId) return;
    try {
      await updateDoc(doc(db, "rides", activeRideId), {
        status: "driving_to_pickup",
        finalFare: bid.amount,
        driverId: bid.driverId,
        driverName: bid.driverName,
        driverVehicle: bid.driverVehicle || "Toyota Camry · Silver · ABC-1234",
        acceptedAt: serverTimestamp(),
      });
      setRidePhase("driving_to_pickup");
      setCarProgress(0);
    } catch (err) {
      console.error("Error accepting counter-offer:", err);
    }
  }

  // Trigger SOS Emergency
  async function handleTriggerSOS() {
    if (!activeRideId) return;
    setSosActive(true);

    const liveCoords = {
      lat: pickup.lat + ((dropoff.lat - pickup.lat) * carProgress || 0),
      lng: pickup.lng + ((dropoff.lng - pickup.lng) * carProgress || 0),
    };

    const mapLink = `https://www.google.com/maps?q=${liveCoords.lat.toFixed(5)},${liveCoords.lng.toFixed(5)}`;
    const smsMessage = encodeURIComponent(
      `FAREBID EMERGENCY ALERT! Passenger ${user?.email} triggered SOS. Current location: ${mapLink}`
    );

    // Update Firestore to notify Admin instantly
    try {
      await updateDoc(doc(db, "rides", activeRideId), {
        emergencyAlert: {
          active: true,
          lat: liveCoords.lat,
          lng: liveCoords.lng,
          mapLink,
          triggeredAt: new Date().toISOString(),
          passengerName: profile?.displayName || user.email,
          passengerPhone,
          emergencyContact,
          driverName: rideData?.driverName || "Assigned Driver",
          vehicle: rideData?.driverVehicle || "Toyota Camry",
        },
      });
    } catch (err) {
      console.error("SOS update error:", err);
    }

    // Open SMS URL protocol for instant dispatch to emergency contact
    const smsUrl = `sms:${emergencyContact}?body=${smsMessage}`;
    window.open(smsUrl, "_blank");
  }

  // Submit Driver Rating
  async function handleSubmitRating() {
    if (!activeRideId) return;
    setLoading(true);

    try {
      const ratingPayload = {
        stars: ratingStars,
        comment: ratingComment,
        tags: selectedTags,
        createdAt: serverTimestamp(),
        passengerId: user.uid,
        passengerName: profile?.displayName || user.email.split("@")[0],
      };

      await updateDoc(doc(db, "rides", activeRideId), {
        rating: ratingPayload,
      });

      // Update driver user document aggregate rating if driverId exists
      if (rideData?.driverId) {
        try {
          const driverRef = doc(db, "users", rideData.driverId);
          const driverSnap = await getDoc(driverRef);
          if (driverSnap.exists()) {
            const dData = driverSnap.data();
            const currentTotal = (dData.ratingAverage || 4.8) * (dData.ratingCount || 10);
            const newCount = (dData.ratingCount || 10) + 1;
            const newAverage = Math.round(((currentTotal + ratingStars) / newCount) * 10) / 10;
            const updatedDistance = (dData.totalDistanceKm || 0) + distanceKm;

            await updateDoc(driverRef, {
              ratingAverage: newAverage,
              ratingCount: newCount,
              totalDistanceKm: updatedDistance,
              completedRidesCount: (dData.completedRidesCount || 0) + 1,
            });
          }
        } catch (ratingErr) {
          console.warn("Could not update driver aggregate:", ratingErr);
        }
      }

      setShowRatingModal(false);
      navigate("/passenger");
    } catch (err) {
      console.error("Rating error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Quick Demo Simulator: simulates driver acceptance or counter-offer for testing
  async function handleSimulateDriverAction(actionType) {
    if (!activeRideId) return;

    if (actionType === "accept") {
      await updateDoc(doc(db, "rides", activeRideId), {
        status: "driving_to_pickup",
        driverId: "sim_driver_01",
        driverName: "Marcus Sterling",
        driverVehicle: "Tesla Model 3 · Pearl White · EV-8899",
        finalFare: offeredFare,
        acceptedAt: serverTimestamp(),
      });
      setRidePhase("driving_to_pickup");
      setCarProgress(0);
    } else if (actionType === "counter") {
      const counterAmount = Math.round((offeredFare * 1.25) * 10) / 10;
      const currentBids = rideData?.bids || [];
      await updateDoc(doc(db, "rides", activeRideId), {
        bids: [
          ...currentBids,
          {
            bidder: "driver",
            driverId: "sim_driver_01",
            driverName: "Marcus Sterling (Rating: 4.95 ★)",
            driverVehicle: "Tesla Model 3 · Pearl White · EV-8899",
            amount: counterAmount,
            message: "Can pickup in 3 mins. Clean car, bottled water & chargers included.",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }

  return (
    <PageTransition className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/passenger")}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FiArrowLeft className="size-4" />
              <span>Dashboard</span>
            </button>
            <Logo to="/passenger" />
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Fare-Bid Passenger Portal
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
        {/* Active Emergency Notice Banner */}
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-200 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-600 text-white animate-pulse">
                <FiAlertOctagon className="size-6" />
              </span>
              <div>
                <p className="font-bold text-white">EMERGENCY SOS ALERT ACTIVATED</p>
                <p className="text-xs text-rose-300">
                  Live GPS beacon broadcasting to emergency contact ({emergencyContact}) & FareBid Admin Ops Hub.
                </p>
              </div>
            </div>
            <a
              href={`tel:911`}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
            >
              <FiPhone className="size-4" />
              <span>Call Emergency Dispatch (911)</span>
            </a>
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Interactive Map & Live Movement */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FiNavigation className="size-5 text-emerald-400" />
                  <h2 className="font-bold text-white">Route & Real-Time Navigation</h2>
                </div>

                {/* Location Selection Toggle Pills */}
                {!activeRideId && (
                  <div className="flex rounded-full border border-white/10 bg-slate-950/70 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectionMode("pickup")}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition ${selectionMode === "pickup"
                        ? "bg-emerald-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                        }`}
                    >
                      <span className="size-2 rounded-full bg-white" />
                      Set Pickup (A)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectionMode("dropoff")}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition ${selectionMode === "dropoff"
                        ? "bg-rose-500 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                        }`}
                    >
                      <span className="size-2 rounded-full bg-white" />
                      Set Destination (B)
                    </button>
                  </div>
                )}

                {/* Simulation Speed & Max Time indicator */}
                {activeRideId && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Max drop-off time: 90s</span>
                    <button
                      onClick={() => setSimSpeed((s) => (s === 1 ? 3 : 1))}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-bold text-amber-300 hover:bg-white/10"
                    >
                      {simSpeed}x Speed
                    </button>
                  </div>
                )}
              </div>

              {/* Map Canvas */}
              <GoogleMapComponent
                pickup={pickup}
                dropoff={dropoff}
                onSelectPickup={(pt) => {
                  setPickup(pt);
                  setSelectionMode("dropoff");
                }}
                onSelectDropoff={(pt) => setDropoff(pt)}
                selectionMode={selectionMode}
                carProgress={carProgress}
                ridePhase={ridePhase}
                interactive={!activeRideId}
                height="460px"
              />

              {/* Landmark Presets for Fast Click Selection */}
              {!activeRideId && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-slate-400">
                    Quick Landmark Presets (tap to set as {selectionMode}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_LANDMARKS.map((lm) => (
                      <button
                        key={lm.name}
                        onClick={() => {
                          if (selectionMode === "pickup") {
                            setPickup(lm);
                            setSelectionMode("dropoff");
                          } else {
                            setDropoff(lm);
                          }
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-white"
                      >
                        {lm.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* In-Transit Road Line Motion in Car Cockpit Layout */}
            {activeRideId && ridePhase !== "idle" && (
              <CarMotionLayout
                pickup={pickup}
                dropoff={dropoff}
                progress={carProgress}
                phase={ridePhase}
                speedKmH={48}
                maxSeconds={90}
                elapsedSeconds={elapsedSeconds}
              />
            )}

            {/* In-Transit Live Control Center (During Active Ride) */}
            {activeRideId && (
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg">
                      <FaCarSide className="size-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {rideData?.driverName || "Driver en route"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rideData?.driverVehicle || "Toyota Camry · Silver · ABC-1234"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Agreed Fare</p>
                    <p className="font-sans text-2xl font-extrabold text-emerald-400">
                      ₦{(rideData?.finalFare || offeredFare).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar towards Max 90s drop-off */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span>
                      {ridePhase === "driving_to_pickup" && "Phase 1: Driver heading to pickup point"}
                      {ridePhase === "in_progress" && "Phase 2: Driving to destination using roads"}
                      {ridePhase === "completed" && "Destination Reached!"}
                    </span>
                    <span>{Math.round(carProgress * 100)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-linear-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-300"
                      style={{ width: `${Math.round(carProgress * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Emergency SOS Button */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="text-xs text-slate-400">
                    <p className="font-semibold text-white">Safety & Emergency Protection</p>
                    <p>Alerts your emergency contact with live map coordinates.</p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTriggerSOS}
                    className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 active:scale-95"
                  >
                    <FiAlertOctagon className="size-5 animate-spin" />
                    <span>TRIGGER SOS EMERGENCY</span>
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Fare-Bid Negotiation & Controls */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* If no ride is active yet: Fare Calculator & Bidding Card */}
            {!activeRideId ? (
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
                <h3 className="mb-4 font-sans text-xl font-bold text-white">Ride Details & Fare Bid</h3>

                {/* Selected Location Summary */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                      A
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Pickup Location</p>
                      <p className="truncate font-semibold text-white">{pickup.name}</p>
                    </div>
                  </div>

                  <div className="ml-3 h-4 border-l-2 border-dashed border-slate-700" />

                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">
                      B
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Destination</p>
                      <p className="truncate font-semibold text-white">{dropoff.name}</p>
                    </div>
                  </div>
                </div>

                {/* Distance & Suggested Estimate */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-xs text-slate-400">Estimated Distance</p>
                    <p className="font-sans text-xl font-bold text-white">{distanceKm} km</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-xs text-slate-400">System Suggested</p>
                    <p className="font-sans text-xl font-bold text-slate-300">
                      ₦{baseCalculatedFare.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Fare Bidding Mechanism (Passenger can increase or reduce price) */}
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Your Offer (Fare-Bid)
                    </span>
                    <span className="text-xs text-slate-400">Tap - / + to adjust</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => adjustFare(-100)}
                      className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                    >
                      <FiMinus className="size-5" />
                    </button>

                    <div className="text-center">
                      <span className="font-sans text-4xl font-extrabold text-white">
                        ₦{offeredFare.toLocaleString("en-NG")}
                      </span>
                      <p className="mt-0.5 text-[11px] text-emerald-300">
                        {offeredFare < baseCalculatedFare
                          ? `Saver Offer (${Math.round(((baseCalculatedFare - offeredFare) / baseCalculatedFare) * 100)}% below suggested)`
                          : offeredFare > baseCalculatedFare
                            ? `Priority Offer (${Math.round(((offeredFare - baseCalculatedFare) / baseCalculatedFare) * 100)}% above suggested)`
                            : "Standard Suggested Rate"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustFare(100)}
                      className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                    >
                      <FiPlus className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Emergency Contact field */}
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Emergency Contact Number (for SOS dispatch):
                  </label>
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {errorMsg && (
                  <p className="mt-3 rounded-xl bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-500/30">
                    {errorMsg}
                  </p>
                )}

                {/* Book Ride Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  onClick={handleBookRide}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 py-4 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:shadow-2xl hover:shadow-emerald-500/40 disabled:opacity-50"
                >
                  <FiZap className="size-5" />
                  <span>{loading ? "Broadcasting Ride..." : "Book Ride · Offer ₦" + offeredFare.toFixed(2)}</span>
                </motion.button>
              </div>
            ) : (
              /* If ride is active: Real-Time Bidding & Driver Responses Feed */
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-sans text-xl font-bold text-white">Live Bidding & Driver Offers</h3>
                    <p className="text-xs text-slate-400">Ride ID: #{activeRideId.slice(0, 8)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    {rideData?.status?.toUpperCase() || "SEARCHING"}
                  </span>
                </div>

                {/* Bids List / Counter Offers */}
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400">Negotiation History:</p>

                  {rideData?.bids?.map((bid, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl border p-4 ${bid.bidder === "driver"
                        ? "border-amber-500/30 bg-amber-950/20"
                        : "border-white/10 bg-slate-950/50"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {bid.bidder === "driver" ? "🚗 " + bid.driverName : "🙋 You (Passenger)"}
                        </span>
                        <span className="font-sans text-lg font-extrabold text-emerald-400">
                          ₦{bid.amount?.toLocaleString("en-NG")}
                        </span>
                      </div>

                      {bid.message && <p className="mt-1 text-xs text-slate-300">{bid.message}</p>}

                      {bid.bidder === "driver" && rideData?.status === "requested" && (
                        <button
                          type="button"
                          onClick={() => handleAcceptCounterOffer(bid)}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <FiCheckCircle className="size-4" />
                          <span>Accept Counter-Offer (₦{bid.amount?.toLocaleString("en-NG")})</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Fast Simulator Controls for Instant Demo Testing */}
                {rideData?.status === "requested" && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Testing Tools (Live Simulated Driver):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSimulateDriverAction("accept")}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                      >
                        Simulate Driver Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateDriverAction("counter")}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                      >
                        Simulate Counter-Offer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Driver Rating Modal (pops up when ride is completed) */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="text-center">
                <span className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400 mb-3">
                  <FiStar className="size-8 fill-amber-400" />
                </span>
                <h3 className="font-sans text-2xl font-bold text-white">Rate Your Driver</h3>
                <p className="mt-1 text-xs text-slate-400">
                  How was your ride with {rideData?.driverName || "Marcus"}?
                </p>
              </div>

              {/* Star Selector */}
              <div className="my-5 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 transition-transform hover:scale-125"
                  >
                    <FiStar
                      className={`size-8 ${star <= ratingStars ? "text-amber-400 fill-amber-400" : "text-slate-600"
                        }`}
                    />
                  </button>
                ))}
              </div>

              {/* Quality Tags */}
              <div className="mb-4 flex flex-wrap justify-center gap-1.5">
                {["Clean Vehicle", "Smooth Route", "Polite & Helpful", "On Time", "Safe Driving"].map(
                  (tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setSelectedTags((prev) =>
                            isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${isSelected
                          ? "bg-amber-400 text-slate-950 font-bold"
                          : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Comment text */}
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Leave a short review for the driver..."
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />

              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitRating}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300"
              >
                <span>Submit Rating & Complete Trip</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
