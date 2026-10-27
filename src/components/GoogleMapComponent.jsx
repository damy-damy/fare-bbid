
import { useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const POPULAR_LANDMARKS = [
  {
    name: "Post Office",
    address: "Post Office, Ilorin, Kwara State",
    lat: 8.4865,
    lng: 4.5636,
  },
  {
    name: "Challenge",
    address: "Challenge, Ilorin, Kwara State",
    lat: 8.4832,
    lng: 4.5634,
  },
  {
    name: "Tanke",
    address: "Tanke, Ilorin, Kwara State",
    lat: 8.4881,
    lng: 4.6069,
  },
  {
    name: "University of Ilorin",
    address: "University of Ilorin, Ilorin",
    lat: 8.4813,
    lng: 4.6058,
  },
  {
    name: "Gaa Akanbi",
    address: "Gaa Akanbi, Ilorin, Kwara State",
    lat: 8.4637,
    lng: 4.5822,
  },
  {
    name: "Fate",
    address: "Fate Road, Ilorin, Kwara State",
    lat: 8.4973,
    lng: 4.5868,
  },
  {
    name: "Oja Oba",
    address: "Oja Oba, Ilorin, Kwara State",
    lat: 8.4960,
    lng: 4.5420,
  },
  {
    name: "Sango",
    address: "Sango, Ilorin, Kwara State",
    lat: 8.4790,
    lng: 4.5550,
  },
  {
    name: "GRA",
    address: "GRA, Ilorin, Kwara State",
    lat: 8.4900,
    lng: 4.5700,
  },
  {
    name: "Taiwo Road",
    address: "Taiwo Road, Ilorin, Kwara State",
    lat: 8.4970,
    lng: 4.5500,
  },
];

export function calculateDistanceKm(point1, point2) {
  if (!point1 || !point2) return 0;

  const values = [
    point1.lat,
    point1.lng,
    point2.lat,
    point2.lng,
  ].map(Number);

  if (!values.every(Number.isFinite)) return 0;

  const [lat1Value, lng1Value, lat2Value, lng2Value] = values;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;

  const lat1 = toRadians(lat1Value);
  const lat2 = toRadians(lat2Value);
  const latDifference = toRadians(lat2Value - lat1Value);
  const lngDifference = toRadians(lng2Value - lng1Value);

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(lngDifference / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadius * c).toFixed(2));
}

export function calculateFare(distanceKm) {
  const distance = Number(distanceKm);

  if (!Number.isFinite(distance) || distance < 0) {
    return 500;
  }

  return Math.round(500 + distance * 200);
}

function getCoordinates(location) {
  if (!location) return null;

  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

// Draw the route and keep the map view synchronized with the locations.
function RouteLine({ pickup, dropoff, driverLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const pickupPosition = getCoordinates(pickup);
    const dropoffPosition = getCoordinates(dropoff);
    const driverPosition = getCoordinates(driverLocation);

    const path = [
      pickupPosition,
      dropoffPosition,
    ].filter(Boolean);

    if (path.length < 2) return;

    const route = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#047857",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });

    route.setMap(map);

    // Recenter when the driver location changes.
    // Otherwise, show the whole pickup-to-destination route.
    if (driverPosition) {
      map.panTo(driverPosition);
      map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 70);
    }

    return () => {
      route.setMap(null);
    };
  }, [
    map,
    pickup?.lat,
    pickup?.lng,
    dropoff?.lat,
    dropoff?.lng,
    driverLocation?.lat,
    driverLocation?.lng,
  ]);

  return null;
}

export default function GoogleMapComponent({
  pickup,
  dropoff,
  onSelectPickup,
  onSelectDropoff,
  selectionMode = "pickup",
  driverLocation = null,
  interactive = true,
  height = "420px",
}) {
  const ilorinCenter = { lat: 8.5000, lng: 4.5500 };

  const pickupPosition = getCoordinates(pickup);
  const dropoffPosition = getCoordinates(dropoff);
  const driverPosition = getCoordinates(driverLocation);

  const selectLocation = (location) => {
    if (!interactive || !location) return;

    if (selectionMode === "pickup") {
      onSelectPickup?.(location);
    } else {
      onSelectDropoff?.(location);
    }
  };

  const handleMapClick = (event) => {
    if (!interactive) return;

    const latLng = event.detail?.latLng;
    if (!latLng) return;

    const lat =
      typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
    const lng =
      typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    selectLocation({
      name:
        selectionMode === "pickup"
          ? "Selected Pickup"
          : "Selected Destination",
      address: `Selected location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      lat,
      lng,
    });
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <p className="font-semibold text-gray-900">Map unavailable</p>
        <p className="mt-2 text-sm text-gray-500">
          Check VITE_GOOGLE_MAPS_API_KEY in your .env file
          and Vercel environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white text-gray-900">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            style={{ width: "100%", height }}
            defaultCenter={ilorinCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            gestureHandling={interactive ? "greedy" : "cooperative"}
            clickableIcons={false}
            disableDefaultUI={false}
            zoomControl
            onClick={handleMapClick}
          >
            <RouteLine
              pickup={pickup}
              dropoff={dropoff}
              driverLocation={driverLocation}
            />

            {pickupPosition && (
              <AdvancedMarker position={pickupPosition}>
                <div className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-lg">
                  A · Pickup
                </div>
              </AdvancedMarker>
            )}

            {dropoffPosition && (
              <AdvancedMarker position={dropoffPosition}>
                <div className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-lg">
                  B · Destination
                </div>
              </AdvancedMarker>
            )}

            {driverPosition && (
              <AdvancedMarker position={driverPosition}>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg"
                  aria-label="Driver location"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M5 17h14l-1.5-7h-11L5 17Z" />
                    <path d="M7 10l2-4h6l2 4M7 17v2m10-2v2" />
                    <circle cx="8" cy="15" r="1" />
                    <circle cx="16" cy="15" r="1" />
                  </svg>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>

        <div className="flex items-start gap-3 border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {driverPosition
                ? "Driver location"
                : selectionMode === "pickup"
                  ? pickup?.name || "Set your pickup point"
                  : dropoff?.name || "Set your destination"}
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              {driverPosition
                ? "Showing the latest driver coordinates received by FareBid."
                : selectionMode === "pickup"
                  ? pickup?.address || "Choose a suggested pickup location below."
                  : dropoff?.address || "Choose a suggested destination below."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
