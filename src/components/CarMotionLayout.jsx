import { motion } from "motion/react";
import { FiNavigation, FiClock, FiActivity, FiMapPin } from "react-icons/fi";

/**
 * CarMotionLayout
 * A sleek top-down car layout with an animated neon route line moving
 * dynamically INSIDE the car chassis and cabin.
 */
export default function CarMotionLayout({
  pickup,
  dropoff,
  progress = 0, // 0 to 1
  phase = "in_progress", // "driving_to_pickup" | "in_progress" | "completed"
  speedKmH = 48,
  maxSeconds = 60,
  elapsedSeconds = 0,
}) {
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const remainingSeconds = Math.max(0, Math.round(maxSeconds - elapsedSeconds));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl backdrop-blur-2xl">
      {/* HUD Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold tracking-wider uppercase text-emerald-400">
            {phase === "driving_to_pickup"
              ? "Driver Heading to Pickup"
              : phase === "completed"
                ? "Trip Completed"
                : "Trip In Progress"}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">In-Car Telemetry</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold">
            <FiActivity className="size-3.5" />
            <span>{phase === "completed" ? "0" : speedKmH} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 font-mono font-bold">
            <FiClock className="size-3.5 text-slate-400" />
            <span>{remainingSeconds}s ETA (Max 90s)</span>
          </div>
        </div>
      </div>

      {/* CAR LAYOUT CONTAINER WITH ANIMATED LINE MOVING INSIDE */}
      <div className="relative my-4 flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-radial from-slate-900 to-slate-950 p-4">
        {/* Ambient Car Chassis Glow */}
        <div className="pointer-events-none absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent opacity-60" />

        {/* SVG CAR LAYOUT: High-Tech Top-Down Vehicle with Animated Internal Line */}
        <svg
          viewBox="0 0 520 220"
          className="h-full w-full max-w-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradient for neon line moving in the car */}
            <linearGradient id="neonLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#065f46" stopOpacity="0.2" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </linearGradient>

            {/* Glowing filter for internal motion line */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 4 External Wheels (Top-down layout) */}
          <rect x="70" y="16" width="45" height="20" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect x="405" y="16" width="45" height="20" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect x="70" y="184" width="45" height="20" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect x="405" y="184" width="45" height="20" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />

          {/* Wheel Treads */}
          <line x1="85" y1="16" x2="85" y2="36" stroke="#475569" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="420" y1="16" x2="420" y2="36" stroke="#475569" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="85" y1="184" x2="85" y2="204" stroke="#475569" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="420" y1="184" x2="420" y2="204" stroke="#475569" strokeWidth="2" strokeDasharray="3 3" />

          {/* Headlight Beams shining out the front (right side of car layout) */}
          <polygon points="495,65 540,40 540,90 495,80" fill="#fef08a" fillOpacity="0.18" />
          <polygon points="495,140 540,130 540,180 495,155" fill="#fef08a" fillOpacity="0.18" />

          {/* MAIN CAR BODY / CHASSIS OUTLINE */}
          <path
            d="M 50 65 
               C 50 48, 85 40, 140 38 
               L 380 38 
               C 440 40, 485 55, 498 75 
               C 505 85, 505 135, 498 145 
               C 485 165, 440 180, 380 182 
               L 140 182 
               C 85 180, 50 172, 50 155 
               Z"
            fill="#090d16"
            stroke="#10b981"
            strokeWidth="3"
            strokeOpacity="0.85"
          />

          {/* Inner Car Trim Line */}
          <path
            d="M 65 72 
               C 65 58, 95 50, 145 48 
               L 375 48 
               C 430 50, 470 62, 485 82 
               C 490 92, 490 128, 485 138 
               C 470 158, 430 170, 375 172 
               L 145 172 
               C 95 170, 65 162, 65 148 
               Z"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Tinted Front Windshield */}
          <path
            d="M 320 54 L 385 62 C 405 65, 415 75, 418 110 C 415 145, 405 155, 385 158 L 320 166 Z"
            fill="#1e293b"
            fillOpacity="0.9"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Panoramic Glass Roof */}
          <rect x="170" y="58" width="135" height="104" rx="14" fill="#0c1322" stroke="#334155" strokeWidth="1.2" />

          {/* Rear Windshield */}
          <path
            d="M 120 62 L 155 60 L 155 160 L 120 158 C 105 156, 95 145, 92 110 C 95 75, 105 64, 120 62 Z"
            fill="#1e293b"
            fillOpacity="0.9"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Headlights */}
          <ellipse cx="492" cy="72" rx="6" ry="10" fill="#fef08a" />
          <ellipse cx="492" cy="148" rx="6" ry="10" fill="#fef08a" />

          {/* Taillights */}
          <rect x="49" y="68" width="5" height="16" rx="2" fill="#ef4444" />
          <rect x="49" y="136" width="5" height="16" rx="2" fill="#ef4444" />

          {/* Driver & Passenger Seats Outline Inside Cabin */}
          <rect x="310" y="70" width="30" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <rect x="310" y="122" width="30" height="28" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <rect x="190" y="68" width="32" height="32" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <rect x="190" y="120" width="32" height="32" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* ========================================================================= */}
          {/* 🌟 THE ANIMATED LINE MOVING INSIDE THE CAR CHASSIS & CABIN                 */}
          {/* ========================================================================= */}

          {/* 1. Underlying Track Guide running down the car's spine */}
          <path
            d="M 65 110 L 485 110"
            stroke="#1e293b"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* 2. Secondary Cabin Contour Line through the car */}
          <path
            d="M 80 110 Q 180 80, 280 110 T 475 110"
            stroke="#064e3b"
            strokeWidth="6"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />

          {/* 3. Continuously Flowing Moving Line INSIDE the Car */}
          <motion.path
            d="M 70 110 Q 180 85, 290 110 T 480 110"
            stroke="url(#neonLineGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#neonGlow)"
            strokeDasharray="24 12"
            animate={{ strokeDashoffset: [-72, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />

          {/* 4. Active Progress Line filling forward through the car as trip advances */}
          <motion.path
            d="M 70 110 L 480 110"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: Math.max(0.1, progress) }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />

          {/* 5. Glowing Energy Pulse Bead traveling along the line inside the car */}
          <motion.circle
            r="7"
            fill="#a7f3d0"
            filter="url(#neonGlow)"
            animate={{
              cx: [80, 475],
              cy: [110, 110],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.circle
            r="3"
            fill="#ffffff"
            animate={{
              cx: [80, 475],
              cy: [110, 110],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* In-Car Navigation HUD Badge centered inside the cabin */}
          <g transform="translate(260, 110)">
            <circle r="18" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
            <text
              x="0"
              y="4"
              fill="#10b981"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {percent}%
            </text>
          </g>
        </svg>
      </div>

      {/* Waypoint Telemetry Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <FiMapPin className="size-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white">Pickup:</span>
          <span className="max-w-44 truncate text-slate-400">
            {pickup?.name || "Starting Point"}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-emerald-400 font-bold">
          <FiNavigation className="size-3.5 animate-pulse" />
          <span>Line Moving in Car Layout · {percent}% Traveled</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <FiMapPin className="size-4 text-rose-400 shrink-0" />
          <span className="font-semibold text-white">Drop-off:</span>
          <span className="max-w-44 truncate text-slate-400">
            {dropoff?.name || "Destination Point"}
          </span>
        </div>
      </div>
    </div>
  );
}
