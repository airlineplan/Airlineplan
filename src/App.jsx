import React from "react";
import { Routes, Route } from "react-router-dom";

import Homepage from "./Pages/Homepage";
import Loginpage from "./Pages/Loginpage";
import Signup from "./Pages/Signup";
import ForgatePassword from "./Pages/ForgatePassword";
import ResetPassword from "./Pages/ResetPassword";
import Contact from "./Pages/Contact";
import AircraftRoute from "./Pages/AircraftRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Loginpage />} />
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forget" element={<ForgatePassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/aircraft-route-economic" element={<AircraftRoute />} />
    </Routes>
  );
};

export default App;
