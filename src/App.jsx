
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PassengerBook from "./pages/PassengerBook.jsx";
import DriverConsole from "./pages/DriverConsole.jsx";
import AdminOps from "./pages/AdminOps.jsx";

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Admin pages */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={["admin"]}>
              <Dashboard role="admin" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/ops"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminOps />
            </ProtectedRoute>
          }
        />

        {/* Driver pages */}
        <Route
          path="/driver"
          element={
            <ProtectedRoute allow={["driver"]}>
              <Dashboard role="driver" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/console"
          element={
            <ProtectedRoute allow={["driver", "admin"]}>
              <DriverConsole />
            </ProtectedRoute>
          }
        />

        {/* Passenger pages */}
        <Route
          path="/passenger"
          element={
            <ProtectedRoute allow={["passenger"]}>
              <Dashboard role="passenger" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/passenger/book"
          element={
            <ProtectedRoute allow={["passenger", "admin"]}>
              <PassengerBook />
            </ProtectedRoute>
          }
        />

        {/* Unknown URLs return to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
