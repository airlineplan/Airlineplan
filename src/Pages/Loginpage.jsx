import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, Mail, CheckCircle2, ArrowRight, 
  Loader2, Plane, Globe 
} from 'lucide-react';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Assuming you have this component
import TermsAndConditionsModal from '../Components/Homepage/TermsAndConditionsModal'; 
// Ensure path is correct
import backgroundPic from "../assets/Images/bglogin.jpeg"; 

// --- UI COMPONENTS ---

const InputField = ({ label, icon: Icon, type = "text", ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-indigo-100/80 uppercase tracking-wider ml-1">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors">
        <Icon size={18} />
      </div>
      <input
        type={type}
        className="block w-full pl-10 pr-3 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-950/60 transition-all duration-200 placeholder:text-white/20 backdrop-blur-sm"
        {...props}
      />
    </div>
  </div>
);

const FeatureItem = ({ text, delay }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
  >
    <div className="mt-0.5 p-1 bg-indigo-500/20 rounded-full border border-indigo-500/30 flex-shrink-0">
      <CheckCircle2 size={14} className="text-indigo-300" />
    </div>
    <span className="text-sm font-medium text-slate-200 leading-snug drop-shadow-sm">
      {text}
    </span>
  </motion.div>
);

// --- MAIN COMPONENT ---

export default function Loginpage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check Auth
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      navigate('/homepage');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('https://airlineplan.com/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('accessToken', data.token);
        toast.success(data.message || "Login successful!");
        setTimeout(() => navigate('/homepage'), 1000);
      } else {
        toast.error(data.error || "Invalid credentials");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Develop flight schedules from scratch or upload existing schedules",
    "Change flights, add flights, delete flights effortlessly",
    "Add capacities and input loads for precise planning",
    "Get commercial and schedule operational metrics (Sector/Station level)",
    "Automatic connection identification based on station windows",
    "Build Rotations to assign flights to fleet & track utilisation"
  ];

  return (
    <div className="min-h-screen w-full relative font-sans flex items-center justify-center p-4 lg:p-8 overflow-hidden bg-slate-900">
      
      {/* --- FULL SCREEN BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0 z-0 opacity-100"
          style={{
            backgroundImage: `url(${backgroundPic})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 z-10 bg-slate-950/70 backdrop-blur-[2px]" />
      </div>

      {/* --- CENTRAL GLASS CARD --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-slate-950/30 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 min-h-[650px]"
      >
        
        {/* LEFT PANEL: Features & Info */}
        <div className="p-8 lg:p-12 text-white flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-white/10 bg-gradient-to-br from-indigo-900/20 to-transparent">
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Plane className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-wide">AirlinePlan</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold mb-3 text-white drop-shadow-md">
                Streamline your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                  Network Planning
                </span>
              </h1>
              <p className="text-indigo-200/70 text-sm">
                A complete suite for flight scheduling, rotation building, and connection analysis.
              </p>
            </motion.div>

            <div className="space-y-3">
              {features.map((text, idx) => (
                <FeatureItem key={idx} text={text} delay={0.3 + (idx * 0.1)} />
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] text-indigo-200/40 uppercase tracking-widest font-semibold">
              © 2024 Aerosphere Aviation Solutions
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Login Form */}
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-transparent">
          
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center lg:justify-start gap-2">
                <Globe className="text-indigo-400 hidden lg:block" size={24} /> 
                Welcome Back
              </h2>
              <p className="text-indigo-200/60 mt-2 text-sm">
                Enter your credentials to access the dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <InputField 
                label="Email Address" 
                icon={Mail} 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              
              <div>
                <InputField 
                  label="Password" 
                  icon={Lock} 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 rounded border-gray-500 text-indigo-500 focus:ring-indigo-500/50 bg-slate-900/50" />
                    <span className="ml-2 text-xs text-indigo-200/70">Remember me</span>
                  </label>
                  <Link to="/forget" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-white/10 rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-indigo-200/60">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-white hover:text-indigo-300 transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-center gap-4 lg:gap-6">
               <Link to="/aircraft-route-economic" className="text-xs text-indigo-300/70 hover:text-white transition-colors">Route Economics</Link>
               <div className="text-indigo-300/70 text-xs">•</div>
               <div className="text-xs text-indigo-300/70 hover:text-white transition-colors cursor-pointer">
                 <TermsAndConditionsModal />
               </div>
               <div className="text-indigo-300/70 text-xs">•</div>
               <Link to="/contact" className="text-xs text-indigo-300/70 hover:text-white transition-colors">Contact Support</Link>
            </div>

          </div>
        </div>

      </motion.div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}