import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../apiConfig';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lock, Mail, CheckCircle2, ArrowRight,
  Loader2, Plane, Globe
} from 'lucide-react';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Assuming you have this component
import TermsAndConditionsModal from '../Components/Homepage/TermsAndConditionsModal';
// Ensure path is correct
import backgroundPic from "../assets/Images/bglogin.jpeg";
import { validateStoredSession } from "../auth/validateSession";
import { setAccessToken } from "../auth/session";

// --- UI COMPONENTS ---

const InputField = ({ label, icon: Icon, type = "text", ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-white uppercase tracking-wider ml-1 drop-shadow-md">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-200 group-focus-within:text-indigo-400 transition-colors">
        <Icon size={18} />
      </div>
      <input
        type={type}
        // Transparent background, white border/text
        className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 placeholder:text-white/40 backdrop-blur-sm"
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
    // Removed background, just text and icon
    className="flex h-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors group hover:bg-white/[0.07]"
  >
    <div className="mt-0.5 p-1 bg-indigo-500/25 rounded-full border border-indigo-400/40 flex-shrink-0 group-hover:bg-indigo-500/40 transition-colors">
      <CheckCircle2 size={14} className="text-indigo-200" />
    </div>
    <span className="text-sm font-medium text-white leading-snug drop-shadow-md">
      {text}
    </span>
  </motion.div>
);

// --- MAIN COMPONENT ---

export default function Loginpage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const loginInFlightRef = useRef(false);
  const navigate = useNavigate();

  // Check Auth
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        if (isMounted) {
          setCheckingSession(false);
        }
        return;
      }

      const isValid = await validateStoredSession();
      if (!isMounted) {
        return;
      }

      if (isValid) {
        navigate('/homepage', { replace: true });
        return;
      }

      setCheckingSession(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading || loginInFlightRef.current) {
      return;
    }

    loginInFlightRef.current = true;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setAccessToken(data.token);
        toast.success(data.message || "Login successful!");
        setTimeout(() => navigate('/homepage', { replace: true }), 1000);
      } else {
        toast.error(data.error || "Invalid credentials");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error occurred.");
    } finally {
      loginInFlightRef.current = false;
      setLoading(false);
    }
  };

  const features = [
    "Integrate network planning, schedule development, crew planning & rostering, aircraft assignment, fleet and maintenance management, asset visibility, major rotables tracking and more.",
    "Get commercial, operational and financial forecasts and implications of the plan while validating it's operational feasibility and financial viability.",
    "Evaluate implications of different operational alternatives while taking decisions in real time, based on the outcomes forecast.",
    "Track actual performance from completed operations.",
    "Load competition's schedule, fleet and other data to understand strengths, weaknesses and likely trajectory.",
    "Airlineplan is a manifestation of the airline integrated management framework."
  ];

  return (
    <div className="min-h-screen w-full relative font-sans flex items-center justify-center p-4 sm:p-6 xl:p-10 overflow-x-hidden bg-black">
      {checkingSession && localStorage.getItem('accessToken') && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center text-white shadow-2xl">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm font-medium">Checking session...</p>
          </div>
        </div>
      )}

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
        {/* Very light overlay to ensure text is readable but image is distinct */}
        <div className="absolute inset-0 z-10 bg-black/40" />
      </div>

      {/* --- CENTRAL TRANSPARENT CARD --- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        // Removed background color, removed blur, just layout
        className="relative z-20 grid min-h-[720px] w-full max-w-[1540px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(430px,0.85fr)] xl:gap-10 2xl:max-w-[1640px]"
      >

        {/* LEFT PANEL: Features & Info */}
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10 text-white flex flex-col justify-between relative">

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-8 xl:mb-10"
            >
              <div className="h-10 w-10 bg-indigo-600/80 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-indigo-400/30">
                <Plane className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-wide drop-shadow-md">Airlineplan</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8 max-w-4xl"
            >
              <h1 className="text-3xl lg:text-4xl xl:text-[42px] font-bold mb-3 text-white drop-shadow-lg leading-tight">
                Plan, Operate and Analyze with complete visibility of all commercial, operational and financial factors.
              </h1>
            </motion.div>

            <div className="grid auto-rows-fr gap-3 xl:grid-cols-2">
              {features.map((text, idx) => (
                <div key={idx} className="h-full">
                  <FeatureItem text={text} delay={0.3 + (idx * 0.08)} />
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
            <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold drop-shadow-sm">
              © 2024 Aerosphere Aviation Business Solutions
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Login Form */}
        {/* Added a very subtle background tint just to group the form elements visually */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-10">

          <div className="w-full max-w-[520px] rounded-2xl border border-white/15 bg-slate-950/25 p-6 shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-8 lg:p-10">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center lg:justify-start gap-2 drop-shadow-lg">
                <Globe className="text-indigo-300 hidden lg:block" size={24} />
                Welcome Back
              </h2>
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
                    <input type="checkbox" className="w-3 h-3 rounded border-white/50 text-indigo-500 focus:ring-indigo-500/50 bg-white/10" />
                    <span className="ml-2 text-xs text-indigo-100/80 drop-shadow-sm">Remember me</span>
                  </label>
                  <Link to="/forget" className="text-xs font-medium text-indigo-300 hover:text-white transition-colors drop-shadow-sm">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-white/20 rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600/80 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed backdrop-blur-md"
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
              <p className="text-sm text-indigo-100/60 drop-shadow-sm">
                Need access? Ask your tenant admin to create an account.
              </p>
            </div>

            {/* Footer Links - Route Economics has been removed from here */}
            <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap justify-center gap-4 lg:gap-6">
              <div className="text-xs text-indigo-200 hover:text-white transition-colors cursor-pointer drop-shadow-sm">
                <TermsAndConditionsModal />
              </div>
              <div className="text-indigo-200/50 text-xs">•</div>
              <Link to="/contact" className="text-xs text-indigo-200 hover:text-white transition-colors drop-shadow-sm">Contact Support</Link>
            </div>

          </div>
        </div>

      </motion.div>

    </div>
  );
}
