
import { useState, useEffect } from "react";
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
import {
  FiMinus,
  FiPlus,
  FiAlertOctagon,
  FiCheckCircle,
  FiStar,
  FiPhone,
  FiNavigation,
  FiArrowLeft,
  FiMapPin,
  FiClock,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";

const statusLabels = {
  requested: "Finding drivers",
  driving_to_pickup: "Driver heading to pickup",
  in_progress: "Ride in progress",
  completed: "Trip completed",
  cancelled: "Ride cancelled",
};

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG")}`;

export default function PassengerBook() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState(POPULAR_LANDMARKS[0]);
  const [dropoff, setDropoff] = useState(POPULAR_LANDMARKS[1]);
  const [selectionMode, setSelectionMode] = useState("pickup");

  const distanceKm = calculateDistanceKm(pickup, dropoff);
  const baseCalculatedFare = calculateFare(distanceKm);

  const [offeredFare, setOfferedFare] = useState(baseCalculatedFare);
  const [passengerPhone, setPassengerPhone] = useState(profile?.phone || "");
  const [emergencyContact, setEmergencyContact] = useState(
    profile?.emergencyContact || ""
  );

  const [activeRideId, setActiveRideId] = useState(null);
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sosActive, setSosActive] = useState(false);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([
    "Smooth Route",
    "Safe Driving",
  ]);

  useEffect(() => {
    setOfferedFare(baseCalculatedFare);
  }, [baseCalculatedFare]);

  useEffect(() => {
    if (profile?.phone) setPassengerPhone(profile.phone);
    if (profile?.emergencyContact) {
      setEmergencyContact(profile.emergencyContact);
    }
  }, [profile]);

  // Listen to the real ride document in Firebase.
  useEffect(() => {
    if (!activeRideId) return;

    const unsubscribe = onSnapshot(
      doc(db, "rides", activeRideId),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        setRideData(data);
        setSosActive(Boolean(data.emergencyAlert?.active));

        if (data.status === "completed" && !data.rating) {
          setShowRatingModal(true);
        } else {
          setShowRatingModal(false);
        }
      },
      (error) => {
        console.error("Ride listener error:", error);
        setErrorMsg("Unable to receive ride updates. Please check your connection.");
      }
    );

    return () => unsubscribe();
  }, [activeRideId]);

  const rideStatus = rideData?.status || "requested";
  const isRideActive = Boolean(activeRideId);
  const driverOffers = (rideData?.bids || []).filter(
    (bid) => bid.bidder === "driver"
  );

  function handleLandmarkSelect(landmark, type) {
    if (isRideActive) return;

    if (type === "pickup") {
      setPickup(landmark);
      setSelectionMode("dropoff");
    } else {
      setDropoff(landmark);
    }

    setErrorMsg("");
  }

  function adjustFare(amount) {
    setOfferedFare((previous) => Math.max(500, Math.round(previous + amount)));
  }

  async function handleBookRide() {
    if (!pickup || !dropoff) {
      setErrorMsg("Please choose your pickup and destination.");
      return;
    }

    if (pickup.lat === dropoff.lat && pickup.lng === dropoff.lng) {
      setErrorMsg("Choose a different destination from your pickup.");
      return;
    }

    if (!user) {
      setErrorMsg("Please sign in before booking a ride.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const passengerName =
        profile?.displayName || user.email?.split("@")[0] || "Passenger";

      const newRide = {
        passengerId: user.uid,
        passengerName,
        passengerEmail: user.email || "",
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
        status: "requested",
        bids: [
          {
            bidder: "passenger",
            userId: user.uid,
            name: passengerName,
            amount: offeredFare,
            timestamp: new Date().toISOString(),
          },
        ],
        emergencyAlert: { active: false },
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "rides"), newRide);

      setRideData({ ...newRide, id: docRef.id });
      setActiveRideId(docRef.id);
    } catch (error) {
      console.error("Booking error:", error);
      setErrorMsg("Your ride could not be booked. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptCounterOffer(bid) {
    if (!activeRideId || !bid.driverId) {
      setErrorMsg("This offer is missing the driver's information.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await updateDoc(doc(db, "rides", activeRideId), {
        status: "driving_to_pickup",
        finalFare: bid.amount,
        driverId: bid.driverId,
        driverName: bid.driverName || "Your driver",
        driverVehicle: bid.driverVehicle || "",
        acceptedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error accepting offer:", error);
      setErrorMsg("Could not accept this offer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerSOS() {
    if (!activeRideId) return;

    setLoading(true);
    setErrorMsg("");

    // Use actual driver GPS coordinates if the driver app writes them.
    // Otherwise, use the pickup location rather than inventing movement.
    const liveCoords = rideData?.driverLocation
      ? {
        lat: rideData.driverLocation.lat,
        lng: rideData.driverLocation.lng,
      }
      : {
        lat: pickup.lat,
        lng: pickup.lng,
      };

    const mapLink = `https://www.google.com/maps?q=${liveCoords.lat},${liveCoords.lng}`;

    const smsMessage = encodeURIComponent(
      `FAREBID EMERGENCY ALERT! Passenger ${user?.email || ""} needs assistance. Location: ${mapLink}`
    );

    try {
      await updateDoc(doc(db, "rides", activeRideId), {
        emergencyAlert: {
          active: true,
          lat: liveCoords.lat,
          lng: liveCoords.lng,
          mapLink,
          triggeredAt: new Date().toISOString(),
          passengerName:
            profile?.displayName || user?.email || "Passenger",
          passengerPhone,
          emergencyContact,
          driverName: rideData?.driverName || "Assigned Driver",
          vehicle: rideData?.driverVehicle || "",
        },
      });

      setSosActive(true);

      if (emergencyContact.trim()) {
        window.location.href = `sms:${emergencyContact}?body=${smsMessage}`;
      }
    } catch (error) {
      console.error("SOS update error:", error);
      setErrorMsg("The SOS alert could not be saved. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRating() {
    if (!activeRideId || !user) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const ratingPayload = {
        stars: ratingStars,
        comment: ratingComment,
        tags: selectedTags,
        createdAt: serverTimestamp(),
        passengerId: user.uid,
        passengerName:
          profile?.displayName || user.email?.split("@")[0] || "Passenger",
      };

      await updateDoc(doc(db, "rides", activeRideId), {
        rating: ratingPayload,
      });

      if (rideData?.driverId) {
        try {
          const driverRef = doc(db, "users", rideData.driverId);
          const driverSnap = await getDoc(driverRef);

          if (driverSnap.exists()) {
            const driverData = driverSnap.data();
            const oldCount = driverData.ratingCount || 0;
            const oldAverage = driverData.ratingAverage || 0;
            const newCount = oldCount + 1;

            const newAverage =
              Math.round(
                ((oldAverage * oldCount + ratingStars) / newCount) * 10
              ) / 10;

            await updateDoc(driverRef, {
              ratingAverage: newAverage,
              ratingCount: newCount,
              totalDistanceKm:
                (driverData.totalDistanceKm || 0) + distanceKm,
              completedRidesCount:
                (driverData.completedRidesCount || 0) + 1,
            });
          }
        } catch (ratingError) {
          console.warn("Could not update driver rating summary:", ratingError);
        }
      }

      setShowRatingModal(false);
      navigate("/passenger");
    } catch (error) {
      console.error("Rating error:", error);
      setErrorMsg("Your rating could not be submitted. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition className="min-h-screen bg-slate-50 text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/passenger")}
              aria-label="Back to dashboard"
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
            >
              <FiArrowLeft className="size-5" />
            </button>
            <Logo to="/passenger" />
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            Passenger
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
        {/* Heading */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              Your journey, your price
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Where are you going?
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Choose your route, offer your fare, and compare offers from
              drivers before agreeing on a price.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:self-auto">
            <FiShield className="size-4 text-emerald-700" />
            Ride safety tools included
          </div>
        </div>

        {/* SOS notice */}
        <AnimatePresence>
          {sosActive && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                  <FiAlertOctagon className="size-5" />
                </span>
                <div>
                  <p className="font-bold text-rose-900">
                    Emergency alert activated
                  </p>
                  <p className="mt-1 text-xs text-rose-700">
                    Contact: {emergencyContact || "No emergency contact added"}
                  </p>
                </div>
              </div>

              <a
                href="tel:112"
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
              >
                Call emergency services
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* Map and route */}
          <section className="min-w-0 space-y-5 lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    <FiNavigation className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-bold">Your route</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {isRideActive
                        ? "Your selected pickup and destination"
                        : "Choose locations on the map"}
                    </p>
                  </div>
                </div>

                {!isRideActive && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectionMode("pickup")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${selectionMode === "pickup"
                          ? "bg-emerald-800 text-white"
                          : "border border-slate-200 bg-white text-slate-600"
                        }`}
                    >
                      Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectionMode("dropoff")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${selectionMode === "dropoff"
                          ? "bg-emerald-800 text-white"
                          : "border border-slate-200 bg-white text-slate-600"
                        }`}
                    >
                      Destination
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4">
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <span className="size-2 shrink-0 rounded-full bg-emerald-600" />
                  {isRideActive
                    ? `Ride status: ${statusLabels[rideStatus] || rideStatus}`
                    : `Select a ${selectionMode === "pickup" ? "pickup point" : "destination"} on the map or below.`}
                </div>

                <GoogleMapComponent
                  pickup={pickup}
                  dropoff={dropoff}
                  onSelectPickup={(location) => {
                    setPickup(location);
                    setSelectionMode("dropoff");
                    setErrorMsg("");
                  }}
                  onSelectDropoff={(location) => {
                    setDropoff(location);
                    setErrorMsg("");
                  }}
                  selectionMode={selectionMode}
                  interactive={!isRideActive}
                  height="440px"
                />
              </div>

              <div className="grid grid-cols-2 border-t border-slate-100">
                <div className="border-r border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <FiMapPin className="text-emerald-700" />
                    Estimated distance
                  </div>
                  <p className="mt-2 text-xl font-black">
                    {Number(distanceKm).toFixed(2)} km
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <FiClock className="text-emerald-700" />
                    Trip estimate
                  </div>
                  <p className="mt-2 text-xl font-black">
                    {formatNaira(baseCalculatedFare)}
                  </p>
                </div>
              </div>
            </div>

            {/* Suggested locations */}
            {!isRideActive && (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold">Pickup locations</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Select where your driver should meet you.
                      </p>
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">
                      A · Pickup
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {POPULAR_LANDMARKS.map((landmark) => {
                      const selected =
                        pickup?.name === landmark.name &&
                        pickup?.lat === landmark.lat &&
                        pickup?.lng === landmark.lng;

                      return (
                        <button
                          key={`pickup-${landmark.name}-${landmark.lat}-${landmark.lng}`}
                          type="button"
                          onClick={() => handleLandmarkSelect(landmark, "pickup")}
                          aria-pressed={selected}
                          className={`rounded-xl border p-3 text-left transition ${selected
                              ? "border-emerald-700 bg-emerald-50"
                              : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold">
                              {landmark.name}
                            </span>
                            {selected && (
                              <FiCheckCircle className="size-4 shrink-0 text-emerald-700" />
                            )}
                          </div>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {landmark.address}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold">Destinations</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Where would you like to go?
                      </p>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                      B · Destination
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {POPULAR_LANDMARKS.map((landmark) => {
                      const selected =
                        dropoff?.name === landmark.name &&
                        dropoff?.lat === landmark.lat &&
                        dropoff?.lng === landmark.lng;

                      return (
                        <button
                          key={`destination-${landmark.name}-${landmark.lat}-${landmark.lng}`}
                          type="button"
                          onClick={() => handleLandmarkSelect(landmark, "dropoff")}
                          aria-pressed={selected}
                          className={`rounded-xl border p-3 text-left transition ${selected
                              ? "border-emerald-700 bg-emerald-50"
                              : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold">
                              {landmark.name}
                            </span>
                            {selected && (
                              <FiCheckCircle className="size-4 shrink-0 text-emerald-700" />
                            )}
                          </div>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {landmark.address}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Active ride and safety */}
            {isRideActive && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                      <FaCarSide className="size-6" />
                    </span>
                    <div>
                      <p className="font-bold">
                        {rideData?.driverName || "Waiting for driver"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rideData?.driverVehicle || "Driver details will appear here"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Agreed fare</p>
                    <p className="mt-1 text-2xl font-black text-emerald-800">
                      {formatNaira(rideData?.finalFare ?? offeredFare)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${rideStatus === "completed"
                          ? "bg-emerald-600"
                          : rideStatus === "cancelled"
                            ? "bg-rose-500"
                            : "animate-pulse bg-amber-500"
                        }`}
                    />
                    <p className="text-sm font-bold">
                      {statusLabels[rideStatus] || rideStatus}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Ride updates appear here when your driver updates the ride
                    status.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div>
                    <p className="font-bold">Safety assistance</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Send an emergency alert during your trip.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loading || rideStatus === "completed"}
                    onClick={handleTriggerSOS}
                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    <FiAlertOctagon className="size-5" />
                    Trigger SOS
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Booking and fare negotiation */}
          <aside className="min-w-0 lg:col-span-5">
            {!isRideActive ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-emerald-950 p-5 text-white sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                    Fare negotiation
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Make your offer
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    You suggest a price. Drivers can respond with their offers.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-black text-white">
                        A
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Pickup</p>
                        <p className="mt-1 break-words text-sm font-bold">
                          {pickup?.name || "Select pickup"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {pickup?.address}
                        </p>
                      </div>
                    </div>

                    <div className="ml-4 h-5 border-l-2 border-dashed border-slate-300" />

                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-800">
                        B
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Destination</p>
                        <p className="mt-1 break-words text-sm font-bold">
                          {dropoff?.name || "Select destination"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {dropoff?.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500">Distance</p>
                      <p className="mt-1 font-extrabold">
                        {Number(distanceKm).toFixed(2)} km
                      </p>
                    </div>
                    <div className="h-9 border-l border-slate-200" />
                    <div>
                      <p className="text-xs text-slate-500">Suggested fare</p>
                      <p className="mt-1 font-extrabold text-emerald-800">
                        {formatNaira(baseCalculatedFare)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">Your proposed fare</p>
                      <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                        NGN
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        aria-label="Decrease fare by 100 naira"
                        onClick={() => adjustFare(-100)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100"
                      >
                        <FiMinus className="size-5" />
                      </button>

                      <div className="min-w-0 text-center">
                        <p className="break-words text-3xl font-black tracking-tight sm:text-4xl">
                          {formatNaira(offeredFare)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">
                          {offeredFare < baseCalculatedFare
                            ? "Below suggested fare"
                            : offeredFare > baseCalculatedFare
                              ? "Above suggested fare"
                              : "Suggested price"}
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-label="Increase fare by 100 naira"
                        onClick={() => adjustFare(100)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100"
                      >
                        <FiPlus className="size-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="passenger-phone"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Phone number
                    </label>
                    <input
                      id="passenger-phone"
                      type="tel"
                      value={passengerPhone}
                      onChange={(event) => setPassengerPhone(event.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emergency-contact"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Emergency contact
                    </label>
                    <input
                      id="emergency-contact"
                      type="tel"
                      value={emergencyContact}
                      onChange={(event) => setEmergencyContact(event.target.value)}
                      placeholder="Emergency contact number"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  {errorMsg && (
                    <p
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                    >
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleBookRide}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-4 text-sm font-extrabold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Submitting request..." : "Find a driver"}
                    {!loading && <FiArrowRight className="size-5" />}
                  </button>

                  <p className="text-center text-xs leading-5 text-slate-500">
                    No driver is assigned until a valid driver offer is accepted.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                        FareBid
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        Driver offers
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Request ID: {activeRideId.slice(0, 8)}
                      </p>
                    </div>

                    <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                      {statusLabels[rideStatus] || rideStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Your offer
                      </p>
                      <p className="text-lg font-black">
                        {formatNaira(rideData?.offeredFare ?? offeredFare)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <FiMapPin className="shrink-0 text-emerald-700" />
                      <span className="min-w-0 break-words">
                        {rideData?.pickup?.name || pickup.name}
                      </span>
                      <FiArrowRight className="shrink-0" />
                      <span className="min-w-0 break-words">
                        {rideData?.dropoff?.name || dropoff.name}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">Offers from drivers</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {driverOffers.length}
                      </span>
                    </div>

                    {driverOffers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                          <FaCarSide className="size-6" />
                        </span>
                        <p className="mt-3 font-bold">
                          Waiting for driver offers
                        </p>
                        <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">
                          Your request is saved. Driver offers will appear here
                          when drivers submit them through the app.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {driverOffers.map((bid, index) => {
                          const canAccept =
                            rideStatus === "requested" &&
                            Boolean(bid.driverId) &&
                            !loading;

                          return (
                            <div
                              key={`${bid.driverId || bid.timestamp || index}-${index}`}
                              className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <FaCarSide className="size-5" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="break-words font-bold">
                                      {bid.driverName || "FareBid driver"}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                      {bid.driverVehicle || "Vehicle details pending"}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className="text-lg font-black text-emerald-800">
                                    {formatNaira(bid.amount)}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    Driver offer
                                  </p>
                                </div>
                              </div>

                              {bid.message && (
                                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                                  {bid.message}
                                </p>
                              )}

                              {rideStatus === "requested" && (
                                <button
                                  type="button"
                                  disabled={!canAccept}
                                  onClick={() => handleAcceptCounterOffer(bid)}
                                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FiCheckCircle className="size-4" />
                                  {!bid.driverId
                                    ? "Driver details unavailable"
                                    : "Accept this offer"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <p
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                    >
                      {errorMsg}
                    </p>
                  )}

                  {rideStatus === "completed" && rideData?.rating && (
                    <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                      Your trip is complete. Thank you for riding with FareBid.
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Driver rating modal */}
      <AnimatePresence>
        {showRatingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <FiStar className="size-7 fill-emerald-200" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Trip completed
                </p>
                <h2 className="mt-2 text-2xl font-black">Rate your driver</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  How was your ride with {rideData?.driverName || "your driver"}?
                </p>
              </div>

              <div className="my-5 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                    aria-pressed={ratingStars === star}
                    onClick={() => setRatingStars(star)}
                    className="rounded-lg p-1 transition hover:scale-110"
                  >
                    <FiStar
                      className={`size-8 ${star <= ratingStars
                          ? "fill-amber-400 text-amber-500"
                          : "text-slate-300"
                        }`}
                    />
                  </button>
                ))}
              </div>

              <div className="mb-4 flex flex-wrap justify-center gap-2">
                {[
                  "Clean Vehicle",
                  "Smooth Route",
                  "Polite & Helpful",
                  "On Time",
                  "Safe Driving",
                ].map((tag) => {
                  const isSelected = selectedTags.includes(tag);

                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelectedTags((previous) =>
                          isSelected
                            ? previous.filter((item) => item !== tag)
                            : [...previous, tag]
                        )
                      }
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${isSelected
                          ? "bg-emerald-800 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <label
                htmlFor="driver-review"
                className="mb-2 block text-sm font-semibold"
              >
                Your review (optional)
              </label>
              <textarea
                id="driver-review"
                value={ratingComment}
                onChange={(event) => setRatingComment(event.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />

              {errorMsg && (
                <p role="alert" className="mt-3 text-sm text-rose-700">
                  {errorMsg}
                </p>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitRating}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:opacity-50"
              >
                <FiCheckCircle className="size-5" />
                {loading ? "Submitting..." : "Submit rating"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
