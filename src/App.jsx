import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import Homepage from "./Pages/Homepage";
import Loginpage from "./Pages/Loginpage";
import Signup from "./Pages/Signup";
import ForgatePassword from "./Pages/ForgatePassword";
import ResetPassword from "./Pages/ResetPassword";
import Contact from "./Pages/Contact";
import AircraftRoute from "./Pages/AircraftRoute";
import { onAuthLogout } from "./auth/session";

const AuthSessionListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthLogout((detail = {}) => {
      navigate("/", { replace: true });

      if (detail.reason !== "manual_logout") {
        toast.error("Your session expired. Please sign in again.");
      }
    });
  }, [navigate]);

  return null;
};

const SHOW_PRIVATE_PAGES = false;

const App = () => {
  return (
    <>
      <AuthSessionListener />
      <Routes>
        <Route path="/" element={<Loginpage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forget" element={<ForgatePassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/contact" element={<Contact />} />
        {SHOW_PRIVATE_PAGES && <Route path="/aircraft-route-economic" element={<AircraftRoute />} />}
      </Routes>
      <ToastContainer position="bottom-right" theme="colored" limit={1} />
    </>
  );
};

export default App;
