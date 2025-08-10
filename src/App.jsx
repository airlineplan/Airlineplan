import React from 'react'
import Homepage from './Pages/Homepage'
import Loginpage from './Pages/Loginpage'
import { Routes, Route } from 'react-router-dom';
import Signup from './Pages/Signup';
import ForgatePassword from './Pages/ForgatePassword';
import ResetPassword from './Pages/ResetPassword';
import Contact from './Pages/Contact';
import AircraftRoute from './Pages/AircraftRoute';

const App = () => {
  return (
    <Routes>
      <Route path="/contact" element={<Contact />} />
      <Route path="/forget" element={<ForgatePassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Loginpage />} />
      <Route path="/aircraft-route-economic" element={<AircraftRoute />} />
      <Route path="/homepage" element={<Homepage />} />
    </Routes>
  )
}

export default App
