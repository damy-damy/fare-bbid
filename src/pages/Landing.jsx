import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import PageTransition from "../components/PageTransition.jsx";
import Logo from "../components/Logo.jsx";

const roles = [
  {
    title: "Passengers",
    detail: "Get where you're going with a ride that fits your plans and budget.",
    bullets: [
      "Request a ride in moments",
      "See your fare before you go",
      "Follow your driver to pickup",
    ],
    badge: "bg-sky-100 text-sky-800",
  },
  {
    title: "Drivers",
    detail: "Choose trips that work for you and make every mile count.",
    bullets: [
      "See ride requests nearby",
      "Know the fare before accepting",
      "Track your trip earnings",
    ],
    badge: "bg-amber-100 text-amber-800",
  },
  {
    title: "Admins",
    detail: "Keep the FareBid community moving and manage platform accounts.",
    bullets: [
      "View driver and passenger accounts",
      "Monitor platform activity",
      "Manage account access",
    ],
    badge: "bg-violet-100 text-violet-800",
  },
];

const steps = [
  [
    "01",
    "Choose your role",
    "Join FareBid as a passenger looking for a ride or a driver ready to earn.",
  ],
  [
    "02",
    "Set your destination",
    "Passengers share where they're going; drivers can review ride requests.",
  ],
  [
    "03",
    "Ride with confidence",
    "Connect, follow the route, and get there with FareBid.",
  ],
];

const reveal = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function RideSlideshow() {
  const images = [
    "/uber1.jpg",
    "/uber2.jpg",
    "/uber3.jpg",
  ];

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((previous) => (previous + 1) % images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-slate-900">
      {images.map((image, index) => (
        <img
          key={image}
          src={image}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${currentImage === index
              ? "opacity-100"
              : "opacity-0"
            }`}
          style={{
            objectPosition: "center center",
            filter: "brightness(1.12) contrast(1.08) saturate(1.08)",
          }}
        />
      ))}

      {/* Subtle dark overlay for readable white text */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-slate-950/20 to-transparent" />

      {/* Slideshow indicators */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setCurrentImage(index)}
            aria-label={`Show background image ${index + 1}`}
            aria-pressed={currentImage === index}
            className={`h-2.5 rounded-full transition-all duration-300 ${currentImage === index
                ? "w-7 bg-emerald-400"
                : "w-2.5 bg-white/70 hover:bg-white"
              }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <PageTransition className="min-h-screen bg-white text-slate-950">
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />

          <nav
            className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex"
            aria-label="Main navigation"
          >
            <a
              className="transition hover:text-emerald-700"
              href="#how"
            >
              How it works
            </a>

            <a
              className="transition hover:text-emerald-700"
              href="#roles"
            >
              For drivers and passengers
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
              to="/signin"
            >
              Sign in
            </Link>

            <Link
              className="inline-flex rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600"
              to="/signup"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO WITH BACKGROUND SLIDESHOW */}
        <section className="relative isolate min-h-[680px] overflow-hidden bg-slate-950 text-white lg:min-h-[750px]">
          <RideSlideshow />

          <div className="relative z-10 mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:min-h-[750px] lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <motion.div
              className="grid gap-6"
              initial="hidden"
              animate="show"
              variants={{
                show: {
                  transition: { staggerChildren: 0.12 },
                },
              }}
            >
              <motion.p
                className="w-fit rounded-full border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100"
                variants={reveal}
              >
                <span className="mr-2 text-emerald-400">●</span>
                Your city. Your ride. Your FareBid.
              </motion.p>

              <motion.h1
                className="max-w-2xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
                variants={reveal}
              >
                A better way to
                <span className="block text-emerald-400">
                  get moving.
                </span>
              </motion.h1>

              <motion.p
                className="max-w-xl text-lg leading-8 text-slate-100 sm:text-xl"
                variants={reveal}
              >
                Find a ride, meet your driver, and get to your destination.
                FareBid brings passengers and drivers together for smoother trips.
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-3"
                variants={reveal}
              >
                <Link
                  to="/signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-500 px-6 font-bold text-white transition hover:bg-emerald-400"
                >
                  Ride with FareBid →
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/70 px-6 font-bold text-white transition hover:bg-white hover:text-slate-950"
                >
                  Drive and earn
                </Link>
              </motion.div>

              <motion.div
                className="flex flex-wrap gap-8 pt-3 text-sm text-slate-100"
                variants={reveal}
              >
                <span>
                  <strong className="block text-3xl text-white">
                    2
                  </strong>
                  ways to ride
                </span>

                <span>
                  <strong className="block text-3xl text-white">
                    1
                  </strong>
                  easy app
                </span>

                <span>
                  <strong className="block text-3xl text-white">
                    24/7
                  </strong>
                  your schedule
                </span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ROLES */}
        <section
          className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24"
          id="roles"
        >
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
              One platform, two ways to move
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              A ride-hailing app that works for everyone.
            </h2>
          </div>

          <motion.div
            className="grid gap-5 md:grid-cols-3"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.12 },
              },
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {roles.map((role) => (
              <motion.article
                key={role.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-8"
                variants={reveal}
              >
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${role.badge}`}
                >
                  {role.title}
                </span>

                <p className="mt-5 text-slate-600">
                  {role.detail}
                </p>

                <ul className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm font-medium">
                  {role.bullets.map((bullet) => (
                    <li
                      className="flex items-center gap-3"
                      key={bullet}
                    >
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50" id="how">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
                Easy as 1, 2, 3
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                From here to there, made simple.
              </h2>
            </div>

            <ol className="grid gap-8 md:grid-cols-3">
              {steps.map(([number, title, detail]) => (
                <li
                  className="border-t-2 border-slate-900 pt-5"
                  key={number}
                >
                  <span className="text-sm font-extrabold text-emerald-700">
                    {number}
                  </span>

                  <h3 className="mt-3 text-xl font-bold">
                    {title}
                  </h3>

                  <p className="mt-2 leading-7 text-slate-600">
                    {detail}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-400">
                Ready when you are
              </p>

              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                Make your next move with FareBid.
              </h2>

              <p className="mt-3 text-slate-300">
                Sign up as a passenger or driver and get on your way.
              </p>
            </div>

            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 font-bold text-slate-950 transition hover:bg-emerald-300"
              to="/signup"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_2fr] md:items-start">
          <div>
            <Logo inverted />
            <p className="mt-4 text-sm text-slate-400">
              A simpler way to get there.
            </p>
          </div>

          <section aria-labelledby="creator-contacts-heading">
            <h2
              id="creator-contacts-heading"
              className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-400"
            >
              Contact the creators
            </h2>

            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>Oyeniyi Adenike</p>
              <p>Owolabi Daniel</p>
            </div>

            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">
                  Email
                </h3>

                <ul className="mt-2 grid gap-2">
                  <li>
                    <a
                      className="break-all text-sm text-white transition hover:text-emerald-300"
                      href="mailto:dannyares3107@gmail.com"
                    >
                      dannyares3107@gmail.com
                    </a>
                  </li>

                  <li>
                    <a
                      className="break-all text-sm text-white transition hover:text-emerald-300"
                      href="mailto:doyin2555@gmail.com"
                    >
                      doyin2555@gmail.com
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300">
                  Phone
                </h3>

                <ul className="mt-2 grid gap-2">
                  <li>
                    <a
                      className="text-sm text-white transition hover:text-emerald-300"
                      href="tel:07077793869"
                    >
                      07077793869
                    </a>
                  </li>

                  <li>
                    <a
                      className="text-sm text-white transition hover:text-emerald-300"
                      href="tel:07026819495"
                    >
                      07026819495
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </footer>
    </PageTransition>
  );
}