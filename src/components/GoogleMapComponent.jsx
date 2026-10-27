import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiNavigation, FiInfo, FiKey } from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";

// ==============================================================================
// 🔑 GOOGLE MAPS API KEY CONFIGURATION
// ------------------------------------------------------------------------------
// Place your Google Maps API key in your .env file:
//   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
// OR insert your API key directly in the string below:
// ==============================================================================
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Popular city landmarks for quick-tap selection
export const POPULAR_LANDMARKS = [
  { name: "Downtown Grand Plaza", address: "100 Broadway Ave, Downtown", lat: 40.7128, lng: -74.0060 },
  { name: "Central Railway Station", address: "420 Station Blvd, Midtown", lat: 40.7505, lng: -73.9934 },
  { name: "International Airport (T1)", address: "Terminal 1, JFK Airport", lat: 40.6413, lng: -73.7781 },
  { name: "Harbor & Seaside Marina", address: "South Pier 17, Waterfront", lat: 40.7056, lng: -74.0033 },
  { name: "University & Science Park", address: "Washington Square, University District", lat: 40.7295, lng: -73.9965 },
  { name: "City Mall & Tech Center", address: "Columbus Circle, Uptown", lat: 40.7681, lng: -73.9819 },
];

// Calculate Haversine distance in km between two coordinate points
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(1.2, parseFloat(d.toFixed(1)));
}

// Fare calculation formula: Base + Per Km
export function calculateFare(distanceKm) {
  const BASE_FARE = 1000;
  const PER_KM_RATE = 300;
  const calculated = BASE_FARE + distanceKm * PER_KM_RATE;
  return Math.round(calculated * 100) / 100;
}

export default function GoogleMapComponent({
  pickup,
  dropoff,
  onSelectPickup,
  onSelectDropoff,
  selectionMode = "pickup", // "pickup" | "dropoff" | "view"
  carProgress = 0, // 0 to 1 along current phase
  ridePhase = "idle", // "idle" | "driving_to_pickup" | "in_progress" | "completed"
  driverLocation = null,
  interactive = true,
  height = "420px",
}) {
  const mapContainerRef = useRef(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(false);
  const gmapRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);

  // Attempt to load Google Maps script if API key is provided
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
      setGoogleMapsLoaded(false);
      return;
    }

    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const scriptId = "google-maps-script";
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleMapsLoaded(true);
      script.onerror = () => {
        console.warn("Failed to load Google Maps API script with provided key.");
        setGoogleMapsError(true);
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", () => setGoogleMapsLoaded(true));
    }
  }, []);

  // Initialize real Google Map if script loaded
  useEffect(() => {
    if (!googleMapsLoaded || !mapContainerRef.current || !window.google) return;

    try {
      const defaultCenter = pickup
        ? { lat: pickup.lat, lng: pickup.lng }
        : { lat: 40.7128, lng: -74.0060 };

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        ],
      });

      gmapRef.current = map;

      if (interactive) {
        map.addListener("click", (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const coords = {
            name: `${selectionMode === "pickup" ? "Pickup" : "Destination"} Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            address: `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`,
            lat,
            lng,
          };

          if (selectionMode === "pickup" && onSelectPickup) {
            onSelectPickup(coords);
          } else if (selectionMode === "dropoff" && onSelectDropoff) {
            onSelectDropoff(coords);
          }
        });
      }
    } catch (err) {
      console.warn("Error initializing Google Map:", err);
      setGoogleMapsError(true);
    }
  }, [googleMapsLoaded, interactive, selectionMode, onSelectPickup, onSelectDropoff]);

  // Update Google Maps markers & directions
  useEffect(() => {
    if (!googleMapsLoaded || !gmapRef.current || !window.google) return;

    const map = gmapRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m && m.setMap && m.setMap(null));
    markersRef.current = {};

    if (pickup) {
      markersRef.current.pickup = new window.google.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map,
        title: "Pickup: " + pickup.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: "#ffffff",
        },
      });
    }

    if (dropoff) {
      markersRef.current.dropoff = new window.google.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lng },
        map,
        title: "Drop-off: " + dropoff.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: "#ffffff",
        },
      });
    }

    // Draw route line
    if (pickup && dropoff) {
      if (polylineRef.current) polylineRef.current.setMap(null);

      polylineRef.current = new window.google.maps.Polyline({
        path: [
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng },
        ],
        geodesic: true,
        strokeColor: "#059669",
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });

      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(new window.google.maps.LatLng(pickup.lat, pickup.lng));
      bounds.extend(new window.google.maps.LatLng(dropoff.lat, dropoff.lng));
      map.fitBounds(bounds);
    }
  }, [googleMapsLoaded, pickup, dropoff]);

  // Click handler on fallback vector canvas
  function handleCanvasClick(e) {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Map canvas x,y (0-100%) to latitude and longitude bounds
    const minLat = 40.6400;
    const maxLat = 40.7700;
    const minLng = -74.0200;
    const maxLng = -73.7700;

    const normX = x / rect.width;
    const normY = y / rect.height;

    const lat = parseFloat((maxLat - normY * (maxLat - minLat)).toFixed(4));
    const lng = parseFloat((minLng + normX * (maxLng - minLng)).toFixed(4));

    const point = {
      name: `${selectionMode === "pickup" ? "Pickup Point" : "Drop-off Point"} (${lat}, ${lng})`,
      address: `Selected via Interactive Map at [${lat}, ${lng}]`,
      lat,
      lng,
    };

    if (selectionMode === "pickup" && onSelectPickup) {
      onSelectPickup(point);
    } else if (selectionMode === "dropoff" && onSelectDropoff) {
      onSelectDropoff(point);
    }
  }

  // Continuous road route animation loop when idle or searching
  const [previewProgress, setPreviewProgress] = useState(0);

  useEffect(() => {
    if (ridePhase !== "idle" && ridePhase !== "requested") return;
    const interval = setInterval(() => {
      setPreviewProgress((p) => (p >= 1 ? 0 : p + 0.015));
    }, 60);
    return () => clearInterval(interval);
  }, [ridePhase]);

  // Calculate coordinates for animated moving car
  function getCarCanvasPosition() {
    if (!pickup) return { x: 50, y: 50, angle: 0 };

    // Coordinates normalization
    const minLat = 40.6400;
    const maxLat = 40.7700;
    const minLng = -74.0200;
    const maxLng = -73.7700;

    const toCanvas = (pt) => ({
      x: ((pt.lng - minLng) / (maxLng - minLng)) * 100,
      y: ((maxLat - pt.lat) / (maxLat - minLat)) * 100,
    });

    const pickupPos = toCanvas(pickup);
    const dropoffPos = dropoff ? toCanvas(dropoff) : pickupPos;
    const driverPos = driverLocation ? toCanvas(driverLocation) : { x: pickupPos.x - 18, y: pickupPos.y + 12 };

    if (ridePhase === "driving_to_pickup") {
      const curX = driverPos.x + (pickupPos.x - driverPos.x) * carProgress;
      const curY = driverPos.y + (pickupPos.y - driverPos.y) * carProgress;
      const angle = Math.atan2(pickupPos.y - driverPos.y, pickupPos.x - driverPos.x) * (180 / Math.PI);
      return { x: curX, y: curY, angle };
    }

    if (ridePhase === "in_progress") {
      const curX = pickupPos.x + (dropoffPos.x - pickupPos.x) * carProgress;
      const curY = pickupPos.y + (dropoffPos.y - pickupPos.y) * carProgress;
      const angle = Math.atan2(dropoffPos.y - pickupPos.y, dropoffPos.x - pickupPos.x) * (180 / Math.PI);
      return { x: curX, y: curY, angle };
    }

    if (ridePhase === "completed") {
      return { x: dropoffPos.x, y: dropoffPos.y, angle: 0 };
    }

    // Default / Idle / Requested: Car cruises along route between Pickup & Destination!
    if (dropoff) {
      const curX = pickupPos.x + (dropoffPos.x - pickupPos.x) * previewProgress;
      const curY = pickupPos.y + (dropoffPos.y - pickupPos.y) * previewProgress;
      const angle = Math.atan2(dropoffPos.y - pickupPos.y, dropoffPos.x - pickupPos.x) * (180 / Math.PI);
      return { x: curX, y: curY, angle };
    }

    return { x: driverPos.x, y: driverPos.y, angle: 0 };
  }

  const carPos = getCarCanvasPosition();

  // If real Google Maps is active and no error:
  if (googleMapsLoaded && !googleMapsError) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm" style={{ height }}>
        <div ref={mapContainerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-sm">
          Google Maps Live · Click map to choose {selectionMode}
        </div>
      </div>
    );
  }

  // High-Grade Interactive Vector City Map Fallback with Live Route & Moving Car
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-xl" style={{ height }}>
      {/* Top Banner showing Google Maps API Key status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-300 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Interactive City Navigation Map</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
            {interactive ? `Click to set ${selectionMode.toUpperCase()}` : "Live Tracking"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
          <FiKey className="size-3" />
          <span>Google Maps API placeholder ready in code</span>
        </div>
      </div>

      {/* Interactive Map Surface */}
      <div
        onClick={handleCanvasClick}
        className="relative h-full w-full cursor-crosshair overflow-hidden select-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, #1e293b 0%, #0f172a 100%)",
        }}
      >
        {/* City Road Network Grid (SVG) */}
        <svg className="absolute inset-0 h-full w-full opacity-35" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="roadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
              <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#334155" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roadGrid)" />

          {/* Major simulated highways & avenue arterials */}
          <path d="M 0 140 Q 180 120 400 240 T 900 200" fill="none" stroke="#64748b" strokeWidth="5" strokeOpacity="0.4" />
          <path d="M 120 0 Q 220 220 320 450" fill="none" stroke="#64748b" strokeWidth="4" strokeOpacity="0.3" />
          <path d="M 500 0 Q 420 240 600 450" fill="none" stroke="#64748b" strokeWidth="4" strokeOpacity="0.3" />
          <path d="M 0 320 C 300 280 600 360 1000 300" fill="none" stroke="#64748b" strokeWidth="5" strokeOpacity="0.4" />
        </svg>

        {/* Route Line connecting Pickup & Dropoff */}
        {pickup && dropoff && (
          <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            {/* Background Glow */}
            <line
              x1={`${((pickup.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`}
              y1={`${((40.7700 - pickup.lat) / (40.7700 - 40.6400)) * 100}%`}
              x2={`${((dropoff.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`}
              y2={`${((40.7700 - dropoff.lat) / (40.7700 - 40.6400)) * 100}%`}
              stroke="#10b981"
              strokeWidth="6"
              strokeOpacity="0.2"
              strokeLinecap="round"
            />
            {/* Dashed Road Route Bed */}
            <line
              x1={`${((pickup.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`}
              y1={`${((40.7700 - pickup.lat) / (40.7700 - 40.6400)) * 100}%`}
              x2={`${((dropoff.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`}
              y2={`${((40.7700 - dropoff.lat) / (40.7700 - 40.6400)) * 100}%`}
              stroke="#475569"
              strokeWidth="3.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
            />
            {/* Active Moving Line tracing the car's progression */}
            {(ridePhase === "driving_to_pickup" || ridePhase === "in_progress") && (
              <line
                x1={`${((pickup.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`}
                y1={`${((40.7700 - pickup.lat) / (40.7700 - 40.6400)) * 100}%`}
                x2={`${carPos.x}%`}
                y2={`${carPos.y}%`}
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}
          </svg>
        )}

        {/* Pickup Pin 🟢 */}
        {pickup && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center z-20"
            style={{
              left: `${((pickup.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`,
              top: `${((40.7700 - pickup.lat) / (40.7700 - 40.6400)) * 100}%`,
            }}
          >
            <span className="relative flex size-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-white">
                A
              </span>
            </span>
            <span className="mt-1 max-w-32 truncate rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 backdrop-blur-xs">
              {pickup.name.split(",")[0]}
            </span>
          </div>
        )}

        {/* Dropoff Pin 🏁 */}
        {dropoff && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center z-20"
            style={{
              left: `${((dropoff.lng - -74.0200) / (-73.7700 - -74.0200)) * 100}%`,
              top: `${((40.7700 - dropoff.lat) / (40.7700 - 40.6400)) * 100}%`,
            }}
          >
            <span className="relative flex size-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-white">
                B
              </span>
            </span>
            <span className="mt-1 max-w-32 truncate rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 backdrop-blur-xs">
              {dropoff.name.split(",")[0]}
            </span>
          </div>
        )}

        {/* Animated Moving Car 🚗 */}
        {(ridePhase === "driving_to_pickup" || ridePhase === "in_progress" || ridePhase === "completed") && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ease-linear z-30"
            style={{
              left: `${Math.max(5, Math.min(95, carPos.x))}%`,
              top: `${Math.max(5, Math.min(95, carPos.y))}%`,
              transform: `translate(-50%, -50%) rotate(${carPos.angle}deg)`,
            }}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-2xl ring-4 ring-amber-300/60">
              <FaCarSide className="size-5" />
            </div>
          </div>
        )}

        {/* Instructions Overlay on Bottom */}
        <div className="pointer-events-none absolute bottom-3 inset-x-3 flex items-center justify-between rounded-xl bg-slate-950/80 px-3.5 py-2 text-xs text-slate-300 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <FiMapPin className="size-4 text-emerald-400" />
            <span>
              {interactive
                ? `Click map to place ${selectionMode === "pickup" ? "Pickup (Point A)" : "Destination (Point B)"}`
                : "Tracking live ride movement on road route"}
            </span>
          </div>
          {ridePhase !== "idle" && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {ridePhase === "driving_to_pickup" && "Driver en route to pickup"}
              {ridePhase === "in_progress" && "Trip in progress to destination"}
              {ridePhase === "completed" && "Arrived at destination"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
