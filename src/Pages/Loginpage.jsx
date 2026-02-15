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
    className="flex items-start gap-3 p-2 transition-colors group"
  >
    <div className="mt-0.5 p-1 bg-indigo-500/20 rounded-full border border-indigo-500/30 flex-shrink-0 group-hover:bg-indigo-500/40 transition-colors">
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
      const response = await fetch('http://localhost:5001/user-login', {
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
    <div className="min-h-screen w-full relative font-sans flex items-center justify-center p-4 lg:p-8 overflow-hidden bg-black">
      
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
        className="relative z-20 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 min-h-[650px]"
      >
        
        {/* LEFT PANEL: Features & Info */}
        <div className="p-8 lg:p-12 text-white flex flex-col justify-between relative">
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-8"
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
              className="mb-8"
            >
              <h1 className="text-3xl font-bold mb-3 text-white drop-shadow-lg">
                Plan and Operationalize with complete visibility of all commercial, operational and financial factors. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-cyan-200 drop-shadow-sm">
                  Review and analyze historical data for insights.
                </span>
              </h1>
              <p className="text-indigo-100 text-sm drop-shadow-md">
                Network planning, Scheduling, Aircraft rotations, Commercial planning and more
              </p>
            </motion.div>

            <div className="space-y-3">
              {features.map((text, idx) => (
                <FeatureItem key={idx} text={text} delay={0.3 + (idx * 0.1)} />
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
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-black/20 lg:bg-transparent rounded-3xl lg:rounded-none backdrop-blur-sm lg:backdrop-blur-none border border-white/10 lg:border-none m-4 lg:m-0">
          
          <div className="max-w-md mx-auto w-full">
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
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-white hover:text-indigo-300 transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap justify-center gap-4 lg:gap-6">
               <Link to="/aircraft-route-economic" className="text-xs text-indigo-200 hover:text-white transition-colors drop-shadow-sm">Route Economics</Link>
               <div className="text-indigo-200/50 text-xs">•</div>
               <div className="text-xs text-indigo-200 hover:text-white transition-colors cursor-pointer drop-shadow-sm">
                 <TermsAndConditionsModal />
               </div>
               <div className="text-indigo-200/50 text-xs">•</div>
               <Link to="/contact" className="text-xs text-indigo-200 hover:text-white transition-colors drop-shadow-sm">Contact Support</Link>
            </div>

          </div>
        </div>

      </motion.div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}