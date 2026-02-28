import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User, Mail, Lock, Hexagon, ArrowRight } from "lucide-react";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const InputField = ({ label, icon: Icon, ...props }) => (
  <div className="flex flex-col space-y-1.5 w-full">
    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
      {label} {props.required && <span className="text-indigo-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Icon size={16} />
        </div>
      )}
      <input
        className={cn(
          "flex h-11 w-full rounded-xl border bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 backdrop-blur-sm",
          Icon ? "pl-10" : "",
          "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        )}
        {...props}
      />
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function Signup() {
  // --- STATE ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // --- HANDLERS ---
  const handleSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/user-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Sign up successful! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(`Sign up failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans p-4 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] z-0 m-auto h-[400px] w-[400px] rounded-full bg-indigo-500 opacity-20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] z-0 m-auto h-[400px] w-[400px] rounded-full bg-cyan-500 opacity-20 blur-[120px] pointer-events-none"></div>

      {/* --- SIGNUP CARD --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/30 mb-4">
              <Hexagon className="text-white fill-white/20" size={24} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create an account
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                label="First Name"
                icon={User}
                name="firstName"
                type="text"
                placeholder="John"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
              <InputField
                label="Last Name"
                name="lastName"
                type="text"
                placeholder="Doe"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <InputField
              label="Email Address"
              icon={Mail}
              name="email"
              type="email"
              placeholder="john.doe@airline.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField
              label="Password"
              icon={Lock}
              name="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 mt-2 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link 
                to="/" 
                className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
          Copyright © {new Date().getFullYear()} airlineplan.com. All rights reserved.
        </p>
      </motion.div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}