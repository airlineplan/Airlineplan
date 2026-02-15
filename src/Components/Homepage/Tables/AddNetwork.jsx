import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { X, Save, AlertCircle, Calendar, Plus } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- REUSABLE COMPONENTS ---
const InputField = ({ label, error, icon: Icon, ...props }) => (
  <div className="flex flex-col space-y-1.5 w-full">
    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {label} {props.required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Icon size={16} />
        </div>
      )}
      <input
        className={cn(
          "flex h-10 w-full rounded-lg border bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed",
          Icon ? "pl-9" : "",
          error 
            ? "border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10" 
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
        )}
        {...props}
      />
    </div>
    {error && (
      <div className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-in slide-in-from-top-1">
        <AlertCircle size={12} />
        <span>{error}</span>
      </div>
    )}
  </div>
);

// --- MAIN COMPONENT ---
const AddNetwork = ({ setAdd }) => {
  // --- STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Stations Data for STA Calculation
  const [stationsData, setStationsData] = useState([]);
  
  // Form Fields
  const [formData, setFormData] = useState({
    flight: "", depStn: "", std: "", bt: "", sta: "", arrStn: "", variant: "",
    effFromDt: "", effToDt: "", dow: "", domINTL: "", 
    userTag1: "", userTag2: "", remarks1: "", remarks2: ""
  });

  // Errors
  const [errors, setErrors] = useState({});

  // --- API: Fetch Stations for Timezone Logic ---
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await axios.get("http://localhost:5001/get-stationData", {
          headers: { "x-access-token": localStorage.getItem("accessToken") },
        });
        if (response.data && response.data.data) {
          setStationsData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stations list for STA calculation", error);
      }
    };
    fetchStations();
  }, []);

  // --- ENGINE: Auto-Calculate STA ---
  useEffect(() => {
    const { std, bt, depStn, arrStn } = formData;
    
    // Only calculate if all required variables and stations are present
    if (std && bt && depStn && arrStn && stationsData.length > 0) {
      
      const depStationConfig = stationsData.find(s => s.stationName === depStn);
      const arrStationConfig = stationsData.find(s => s.stationName === arrStn);

      if (depStationConfig?.stdtz && arrStationConfig?.stdtz) {
        
        // Helper to convert "UTC+5:30" or "UTC-4:00" to total minutes
        const parseTZ = (tzString) => {
          if (!tzString || !tzString.startsWith('UTC')) return 0;
          const sign = tzString.includes('-') ? -1 : 1;
          const timePart = tzString.replace(/UTC[+-]/, '');
          if (!timePart) return 0;
          const [hours, minutes] = timePart.split(':').map(Number);
          return sign * ((hours * 60) + (minutes || 0));
        };

        const depTzMins = parseTZ(depStationConfig.stdtz);
        const arrTzMins = parseTZ(arrStationConfig.stdtz);

        const [stdH, stdM] = std.split(':').map(Number);
        const [btH, btM] = bt.split(':').map(Number);

        // Formula: STA = STD + BT + (ArrTZ - DepTZ)
        let totalMins = (stdH * 60 + stdM) + (btH * 60 + btM) + (arrTzMins - depTzMins);

        // Wrap around 24 hours (1440 minutes) to handle next day / previous day overlaps
        totalMins = ((totalMins % 1440) + 1440) % 1440; 

        const staH = Math.floor(totalMins / 60);
        const staM = totalMins % 60;
        
        // Format to HH:MM and update formData
        const calculatedSTA = `${String(staH).padStart(2, '0')}:${String(staM).padStart(2, '0')}`;
        
        setFormData(prev => {
          // Only update if it actually changed to prevent infinite loops
          if (prev.sta !== calculatedSTA) {
            return { ...prev, sta: calculatedSTA };
          }
          return prev;
        });
      }
    }
  }, [formData.std, formData.bt, formData.depStn, formData.arrStn, stationsData]);

  // --- HANDLERS ---

  const handleOpen = () => {
    setIsOpen(true);
    if(setAdd) setAdd(false); 
  };

  const handleClose = () => {
    setIsOpen(false);
    if(setAdd) setAdd(true);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    // Live Validation Logic
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let errorMsg = "";

    switch (name) {
      case "flight":
        if (!/^[a-zA-Z0-9\s]{0,8}$/.test(value)) errorMsg = "Max 8 alphanumeric chars";
        break;
      case "depStn":
      case "arrStn":
        if (!/^[a-zA-Z0-9\s]{0,4}$/.test(value)) errorMsg = "Max 4 alphanumeric chars";
        break;
      case "variant":
        if (!/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) errorMsg = "Max 8 chars (letters, nums, -)";
        break;
      case "dow":
        if (!/^[1-7]{0,7}$/.test(value)) errorMsg = "Digits 1-7 only (Max 7 digits)";
        break;
      case "userTag1":
      case "userTag2":
      case "remarks1":
      case "remarks2":
        if (!/^\s*.{0,12}\s*$/.test(value)) errorMsg = "Max 12 characters";
        break;
      default:
        break;
    }

    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final Validation Check
    const hasErrors = Object.values(errors).some(x => x !== "") || 
                      !formData.effFromDt || !formData.effToDt;
    
    if (!formData.effFromDt) setErrors(prev => ({ ...prev, effFromDt: "Required" }));
    if (!formData.effToDt) setErrors(prev => ({ ...prev, effToDt: "Required" }));

    if (hasErrors) {
      toast.error("Please fix form errors before submitting.");
      return;
    }

    setLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const payload = {
        ...formData,
        domINTL: formData.domINTL.toLowerCase(),
        timeZone
      };

      const response = await axios.post(
        "http://localhost:5001/add-Data",
        payload,
        {
          headers: {
            "x-access-token": localStorage.getItem("accessToken"),
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201) {
        toast.success("Record added successfully!");
        setTimeout(() => window.location.reload(), 1500);
        handleClose();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.status === 400 ? "Record already exists" : "An error occurred";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button (Menu Item Style) */}
      <button
        onClick={handleOpen}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
      >
        <Plus size={16} />
        <span>Add New</span>
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto z-[60] w-[95vw] max-w-5xl h-fit max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                <div>
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                    Add Network Record
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Enter flight details and schedule information.</p>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Scrollable Form */}
              <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <form onSubmit={handleSubmit} id="add-network-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* --- FLIGHT INFO --- */}
                    <div className="lg:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                       <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Flight Details</h3>
                    </div>

                    <InputField 
                      label="Flight No" 
                      name="flight" 
                      placeholder="e.g. AZ 90980" 
                      value={formData.flight} 
                      onChange={handleChange} 
                      error={errors.flight}
                      required 
                    />
                    
                    <InputField 
                      label="Departure Stn" 
                      name="depStn" 
                      placeholder="e.g. VIDP" 
                      value={formData.depStn} 
                      onChange={handleChange} 
                      error={errors.depStn}
                      required 
                    />
                    
                    <InputField 
                      label="Arrival Stn" 
                      name="arrStn" 
                      placeholder="e.g. VI89" 
                      value={formData.arrStn} 
                      onChange={handleChange} 
                      error={errors.arrStn}
                      required 
                    />

                    <InputField 
                      label="Variant" 
                      name="variant" 
                      placeholder="e.g. A330-200" 
                      value={formData.variant} 
                      onChange={handleChange} 
                      error={errors.variant}
                      required 
                    />

                    <InputField 
                      label="Dom / Intl" 
                      name="domINTL" 
                      placeholder="DOM or INTL" 
                      value={formData.domINTL} 
                      onChange={handleChange} 
                      required 
                    />
                    
                    <div className="hidden lg:block"></div> {/* Spacer */}

                    {/* --- TIMING --- */}
                    <div className="lg:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 mt-2">
                       <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Schedule & Timing</h3>
                    </div>

                    <InputField 
                      label="STD (Local)" 
                      name="std" 
                      type="time" 
                      value={formData.std} 
                      onChange={handleChange} 
                      required 
                    />

                    <InputField 
                      label="BT" 
                      name="bt" 
                      type="time" 
                      value={formData.bt} 
                      onChange={handleChange} 
                      required 
                    />

                    <InputField 
                      label="STA (Local) - Auto Calculated" 
                      name="sta" 
                      type="time" 
                      value={formData.sta} 
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-lg border bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 font-bold disabled:opacity-80"
                      disabled
                    />

                    <InputField 
                      label="Effective From" 
                      name="effFromDt" 
                      type="date" 
                      icon={Calendar}
                      value={formData.effFromDt} 
                      onChange={handleChange} 
                      error={errors.effFromDt}
                      required 
                    />

                    <InputField 
                      label="Effective To" 
                      name="effToDt" 
                      type="date" 
                      icon={Calendar}
                      value={formData.effToDt} 
                      onChange={handleChange} 
                      error={errors.effToDt}
                      required 
                      min={formData.effFromDt}
                    />

                    <InputField 
                      label="Days of Week" 
                      name="dow" 
                      type="number"
                      placeholder="e.g. 1234567" 
                      value={formData.dow} 
                      onChange={handleChange} 
                      error={errors.dow}
                      required 
                    />

                    {/* --- TAGS & REMARKS --- */}
                    <div className="lg:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 mt-2">
                       <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Additional Info</h3>
                    </div>

                    <InputField 
                      label="User Tag 1" 
                      name="userTag1" 
                      value={formData.userTag1} 
                      onChange={handleChange} 
                      error={errors.userTag1}
                    />
                    <InputField 
                      label="User Tag 2" 
                      name="userTag2" 
                      value={formData.userTag2} 
                      onChange={handleChange} 
                      error={errors.userTag2}
                    />
                    <div className="hidden lg:block"></div>

                    <InputField 
                      label="Remarks 1" 
                      name="remarks1" 
                      value={formData.remarks1} 
                      onChange={handleChange} 
                      error={errors.remarks1}
                    />
                    <InputField 
                      label="Remarks 2" 
                      name="remarks2" 
                      value={formData.remarks2} 
                      onChange={handleChange} 
                      error={errors.remarks2}
                    />

                  </div>
                </form>
              </div>

              {/* Footer / Actions */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="add-network-form"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Submit Record</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ToastContainer position="bottom-right" theme="colored" />
    </>
  );
};

export default AddNetwork;