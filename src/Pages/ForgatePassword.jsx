import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Key, Mail, Send, Loader2, ArrowLeft, Lock 
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Ensure this path matches your project
import backgroundPic from "../assets/Images/bglogin.jpeg"; 
import ResetPassword from "./ResetPassword";

// --- UI COMPONENTS ---

const InputField = ({ label, icon: Icon, type = "text", ...props }) => (
  <div className="space-y-1.5 text-left">
    <label className="text-xs font-bold text-indigo-100/80 uppercase tracking-wider ml-1 drop-shadow-sm">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors">
        <Icon size={18} />
      </div>
      <input
        type={type}
        className="block w-full pl-10 pr-3 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-950/60 transition-all duration-200 placeholder:text-white/20 backdrop-blur-sm shadow-inner"
        {...props}
      />
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const ForgatePassword = () => {
  const [showForm, setShowForm] = useState(true);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const url = "https://airlinebackend-zfsg.onrender.com/send-email";
      const options = {
        method: "POST",
        url: url,
        data: { email: email },
      };
      
      const response = await axios(options);
      const record = response.data;

      if (record.statusText === "Success") {
        toast.success(record.message);
        setTimeout(() => {
          setShowForm(false);
        }, 1500);
      } else {
        toast.error(record.message || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative font-sans flex items-center justify-center p-4 overflow-hidden bg-slate-900">
      
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
        <div className="absolute inset-0 z-10 bg-slate-950/70 backdrop-blur-[3px]" />
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <div className="relative z-20 w-full max-w-md">
        
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div 
              key="request-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-slate-950/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center"
            >
              {/* Header Icon */}
              <div className="mx-auto mb-6 w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Key className="text-indigo-300" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md">Reset Password</h2>
              <p className="text-indigo-200/70 text-sm mb-8">
                Enter your email address and we'll send you an OTP to reset your password.
              </p>

              {/* Form */}
              <div className="space-y-6">
                <InputField 
                  label="Email Address"
                  icon={Mail}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />

                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-white/10 rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center text-sm font-medium text-indigo-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} className="mr-2" /> Back to Login
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Wrapper for ResetPassword component to maintain style consistency
            <motion.div
              key="reset-component"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-slate-950/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6"
            >
               {/* Passing props to your existing ResetPassword component.
                  Note: Ensure ResetPassword handles its own styling or is compatible 
                  with being inside this dark container.
               */}
               <div className="text-white">
                 <ResetPassword email={email} setShowForm={setShowForm} />
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default ForgatePassword;