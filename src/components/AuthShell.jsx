import { motion } from "motion/react";
import PageTransition from "./PageTransition.jsx";
import RideRoute from "./RideRoute.jsx";
import Logo from "./Logo.jsx";

const pageSequence = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.22,
    },
  },
};

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function AuthShell({ title, subtitle, children }) {
  return (
    <PageTransition className="min-h-screen bg-[#f4f9f5] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">

        {/* Left promotional section */}
        <aside className="relative hidden overflow-hidden bg-emerald-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">

          <div className="pointer-events-none absolute -right-24 top-20 size-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={pageSequence}
            className="relative z-10"
          >
            <motion.div variants={rise}>
              <Logo inverted />
            </motion.div>

            <motion.div variants={rise} className="mt-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-200">
                <span className="size-2 rounded-full bg-emerald-400" />
                YOUR JOURNEY, YOUR PRICE
              </span>

              <h2 className="mt-6 max-w-lg text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
                Every journey
                <br />
                starts with
                <span className="text-emerald-400"> FareBid.</span>
              </h2>

              <p className="mt-5 max-w-md text-base leading-7 text-emerald-100/70">
                Connect with drivers, negotiate your fare, and travel on your terms.
              </p>
            </motion.div>

            <motion.div variants={rise} className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10">
              <RideRoute className="mx-auto max-h-56 text-emerald-400" />
              <p className="mt-4 text-center text-sm font-medium text-emerald-100/80">
                My ride. My route. Right on time.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={pageSequence}
            className="relative z-10 mt-12 grid gap-4 sm:grid-cols-2"
          >
            <motion.div
              variants={rise}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                For drivers
              </span>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Find ride requests and earn on your trips.
              </p>
            </motion.div>

            <motion.div
              variants={rise}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                For passengers
              </span>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Offer a fare that works for you.
              </p>
            </motion.div>
          </motion.div>
        </aside>

        {/* Sign-in / sign-up section */}
        <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10 sm:px-8 sm:py-14">

          <div className="pointer-events-none absolute -right-24 top-0 size-72 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-green-200/25 blur-3xl" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={pageSequence}
            className="relative z-10 w-full max-w-md"
          >
            <motion.div variants={rise} className="mb-8 lg:hidden">
              <Logo />
            </motion.div>

            <motion.div
              variants={rise}
              className="mb-7"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                Welcome to FareBid
              </p>

              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                {subtitle}
              </p>
            </motion.div>

            <motion.div
              variants={rise}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-emerald-950/[0.04] sm:p-8"
            >
              {children}
            </motion.div>

            <motion.p
              variants={rise}
              className="mt-6 text-center text-xs leading-5 text-slate-400"
            >
              A smarter way to get where you need to go.
            </motion.p>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}