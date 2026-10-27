
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { FiMenu, FiX, FiArrowUpRight } from "react-icons/fi";
import PageTransition from "../components/PageTransition.jsx";
import Logo from "../components/Logo.jsx";

const roles = [
  {
    number: "01",
    title: "Passengers",
    heading: "Your journey. Your choice.",
    detail:
      "Suggest a fare for your journey, review available driver offers, and choose the option that works for you.",
    bullets: [
      "Request a ride",
      "Compare driver offers",
      "Choose your preferred ride",
    ],
  },
  {
    number: "02",
    title: "Drivers",
    heading: "Make every trip count.",
    detail:
      "Explore ride requests, review proposed fares, and choose trips that work for you.",
    bullets: [
      "Review ride requests",
      "Respond with an offer",
      "Choose suitable trips",
    ],
  },
  {
    number: "03",
    title: "Admins",
    heading: "Keep things moving.",
    detail:
      "Manage platform accounts and oversee FareBid operations.",
    bullets: [
      "Manage user accounts",
      "Review platform activity",
      "Manage account access",
    ],
  },
];

const steps = [
  {
    number: "01",
    title: "Request a ride",
    detail:
      "Enter your pickup point and destination, then propose the fare for your journey.",
  },
  {
    number: "02",
    title: "Review offers",
    detail:
      "Drivers can review available requests and respond with their offers.",
  },
  {
    number: "03",
    title: "Choose your ride",
    detail:
      "Compare available options and select the driver that works for you.",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

function RideSlideshow() {
  const images = ["/uber1.jpg", "/uber2.jpg", "/uber3.jpg"];
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((previous) => (previous + 1) % images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950">
      {images.map((image, index) => (
        <img
          key={image}
          src={image}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${currentImage === index ? "opacity-100" : "opacity-0"
            }`}
          style={{ objectPosition: "center", filter: "brightness(0.65)" }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setCurrentImage(index)}
            aria-label={`Show background image ${index + 1}`}
            aria-pressed={currentImage === index}
            className={`h-2 rounded-full transition-all ${currentImage === index
                ? "w-8 bg-lime-400"
                : "w-2 bg-white/70"
              }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <PageTransition className="min-h-screen bg-white text-slate-950">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <Logo />
          </Link>

          <nav
            className="hidden items-center gap-8 text-sm font-semibold md:flex"
            aria-label="Main navigation"
          >
            <a href="#how" className="hover:text-emerald-700">
              How it works
            </a>
            <a href="#roles" className="hover:text-emerald-700">
              Passengers & drivers
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/signin"
              className="rounded-full px-4 py-3 text-sm font-bold hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-5 py-3 text-sm font-extrabold hover:bg-lime-300"
            >
              Get started <FiArrowUpRight />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-11 items-center justify-center rounded-full border border-slate-200 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <FiX className="size-6" />
            ) : (
              <FiMenu className="size-6" />
            )}
          </button>
        </div>

        {menuOpen && (
          <nav
            className="grid gap-1 border-t border-slate-200 bg-white p-4 md:hidden"
            aria-label="Mobile navigation"
          >
            <a
              href="#how"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-100"
            >
              How it works
            </a>
            <a
              href="#roles"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-100"
            >
              Passengers & drivers
            </a>
            <Link
              to="/signin"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-lime-400 px-4 py-3 text-center text-sm font-extrabold"
            >
              Get started
            </Link>
          </nav>
        )}
      </header>

      <main>
        {/* HERO */}
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <RideSlideshow />

          <div className="relative z-10 mx-auto flex min-h-[650px] max-w-7xl items-center px-5 py-20 sm:px-8 lg:min-h-[740px]">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.12 } },
              }}
              className="max-w-4xl"
            >
              <motion.p
                variants={reveal}
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest sm:text-sm"
              >
                <span className="size-2 rounded-full bg-lime-400" />
                A different way to move
              </motion.p>

              <motion.h1
                variants={reveal}
                className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl"
              >
                Your ride.
                <span className="block text-lime-400">Your fare.</span>
                Your choice.
              </motion.h1>

              <motion.p
                variants={reveal}
                className="mt-7 max-w-2xl text-base leading-7 text-white/85 sm:text-xl sm:leading-8"
              >
                Set your proposed fare, connect with drivers, and explore
                available offers for your journey. With FareBid, your next
                trip starts with a choice.
              </motion.p>

              <motion.div
                variants={reveal}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  to="/signup"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-lime-400 px-7 font-extrabold text-slate-950 transition hover:bg-lime-300"
                >
                  Find a ride <FiArrowUpRight className="size-5" />
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/70 px-7 font-bold text-white transition hover:bg-white hover:text-slate-950"
                >
                  Become a driver
                </Link>
              </motion.div>

              <motion.p
                variants={reveal}
                className="mt-7 text-sm text-white/70"
              >
                One platform connecting passengers and drivers.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* INTRODUCTION */}
        <section className="bg-lime-400">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-9 sm:px-8 md:grid-cols-[1fr_auto] md:items-center">
            <h2 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">
              Getting there should come with choices.
            </h2>
            <a
              href="#how"
              className="inline-flex items-center gap-2 text-sm font-extrabold"
            >
              Discover FareBid <FiArrowUpRight />
            </a>
          </div>
        </section>

        {/* PASSENGERS AND DRIVERS */}
        <section
          id="roles"
          className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"
        >
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12 } },
            }}
            className="mb-12 grid gap-5 md:grid-cols-[1fr_0.7fr] md:items-end"
          >
            <motion.div variants={reveal}>
              <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-800">
                Made for the journey
              </p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                One platform. Different ways to move.
              </h2>
            </motion.div>

            <motion.p
              variants={reveal}
              className="max-w-lg leading-7 text-slate-600"
            >
              Whether you're requesting a ride or responding to one, FareBid
              connects passengers and drivers in one place.
            </motion.p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {roles.map((role) => (
              <motion.article
                key={role.title}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-lime-100 px-3 py-1.5 text-xs font-extrabold text-slate-950">
                    {role.title}
                  </span>
                  <span className="text-sm font-bold text-slate-400">
                    {role.number}
                  </span>
                </div>

                <h3 className="mt-7 text-2xl font-black tracking-tight">
                  {role.heading}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {role.detail}
                </p>

                <ul className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm font-medium">
                  {role.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-lime-100 text-xs font-black">
                        ✓
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>

                {role.title !== "Admins" && (
                  <Link
                    to="/signup"
                    className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold hover:text-emerald-800"
                  >
                    Get started <FiArrowUpRight />
                  </Link>
                )}
              </motion.article>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-800">
                  The process
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                  Three steps to get moving.
                </h2>
                <p className="mt-5 max-w-md leading-7 text-slate-600">
                  From your first request to choosing a ride, FareBid is
                  designed to make the journey easier to understand.
                </p>
              </div>

              <ol className="divide-y divide-slate-200">
                {steps.map((step) => (
                  <li
                    key={step.number}
                    className="grid gap-3 py-6 sm:grid-cols-[64px_1fr]"
                  >
                    <span className="text-sm font-black text-emerald-800">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold">{step.title}</h3>
                      <p className="mt-2 max-w-xl leading-7 text-slate-600">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="bg-lime-400">
          <div className="mx-auto grid max-w-7xl gap-7 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest">
                Your next journey starts here
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Ready to make your next move?
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-800">
                Create your account and explore FareBid as a passenger or
                driver.
              </p>
            </div>

            <Link
              to="/signup"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-slate-950 px-7 font-extrabold text-white transition hover:bg-slate-800"
            >
              Get started <FiArrowUpRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_2fr] md:items-start">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              A different way to connect passengers and drivers.
            </p>
          </div>

          <section aria-labelledby="creator-contacts-heading">
            <h2
              id="creator-contacts-heading"
              className="text-xs font-extrabold uppercase tracking-widest text-lime-400"
            >
              Contact the creators
            </h2>

            <div className="mt-4 space-y-1 text-sm text-slate-300">
              <p>Oyeniyi Adenike</p>
              <p>Owolabi Daniel</p>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-slate-300">Email</h3>
                <ul className="mt-3 grid gap-3">
                  <li>
                    <a
                      className="break-all text-sm hover:text-lime-400"
                      href="mailto:dannyares3107@gmail.com"
                    >
                      dannyares3107@gmail.com
                    </a>
                  </li>
                  <li>
                    <a
                      className="break-all text-sm hover:text-lime-400"
                      href="mailto:doyin2555@gmail.com"
                    >
                      doyin2555@gmail.com
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-300">Phone</h3>
                <ul className="mt-3 grid gap-3">
                  <li>
                    <a
                      className="text-sm hover:text-lime-400"
                      href="tel:07077793869"
                    >
                      07077793869
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-sm hover:text-lime-400"
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

        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-5 text-xs text-slate-500 sm:px-8">
            © {new Date().getFullYear()} FareBid. All rights reserved.
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}
