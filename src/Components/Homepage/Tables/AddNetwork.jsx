import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { X, Save, AlertCircle, Calendar, Plus, Search } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- REUSABLE COMPONENTS ---

// Standard Input
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

// Combobox Field for Stations and Times
const ComboboxField = ({ label, name, value, onChange, error, options = [], disabled = false, required, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes((value || "").toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col space-y-1.5 w-full" ref={wrapperRef}>
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <input
          type="text"
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
            className,
            error
              ? "border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
          )}
        />
        {!disabled && (
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}

        <AnimatePresence>
          {isOpen && filteredOptions.length > 0 && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute z-50 left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
            >
              {filteredOptions.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onChange({ target: { name, value: opt.value } });
                    setIsOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {opt.label}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-in slide-in-from-top-1">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
const AddNetwork = ({ setAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stationsData, setStationsData] = useState([]);
  const [dropdownData, setDropdownData] = useState({ from: [], to: [] });
  const [formData, setFormData] = useState({
    flight: "", depStn: "", std: "", bt: "", sta: "", arrStn: "", variant: "",
    effFromDt: "", effToDt: "", dow: "", domINTL: "",
    userTag1: "", userTag2: "", remarks1: "", remarks2: ""
  });
  const [errors, setErrors] = useState({});

  const timeOptions = useMemo(() => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        times.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` });
      }
    }
    return times;
  }, []);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await axios.get("https://airlineplan.com/get-stationData", {
          headers: { "x-access-token": localStorage.getItem("accessToken") },
        });
        if (response.data && response.data.data) {
          setStationsData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stations list", error);
      }
    };

    const fetchDropdowns = async () => {
      try {
        const response = await axios.get("https://airlineplan.com/dashboard/populateDropDowns", {
          headers: { "x-access-token": localStorage.getItem("accessToken") },
        });
        if (response.data) {
          setDropdownData({
            from: response.data.from || [],
            to: response.data.to || []
          });
        }
      } catch (error) {
        console.error("Backend error on dropdowns", error);
        setDropdownData({ from: [], to: [] });
      }
    };

    fetchStations();
    fetchDropdowns();
  }, []);

  // --- DST-AWARE AUTO-CALCULATE STA ENGINE ---
  useEffect(() => {
    const { std, bt, depStn, arrStn, effFromDt } = formData;

    // We only explicitly require STD and BT to attempt calculation. 
    // This ensures calculation runs even for brand new stations.
    if (std && bt) {
      let depTzMins = 0;
      let arrTzMins = 0;

      // Only attempt to find timezone offsets if stations are typed
      if (depStn && arrStn && stationsData.length > 0) {
        // Find configuration using Case-Insensitive matching
        const depConfig = stationsData.find(s => s.stationName?.toUpperCase() === depStn?.toUpperCase());
        const arrConfig = stationsData.find(s => s.stationName?.toUpperCase() === arrStn?.toUpperCase());

        const getTzMins = (config, flightDateStr) => {
          if (!config) return 0; // Fallback for completely new/unrecognized stations

          let tz = config.stdtz;

          if (flightDateStr && config.nextDSTStart && config.nextDSTEnd) {
            const fDate = new Date(flightDateStr);
            const dStart = new Date(config.nextDSTStart);
            const dEnd = new Date(config.nextDSTEnd);
            if (!isNaN(fDate) && !isNaN(dStart) && !isNaN(dEnd)) {
              if (fDate >= dStart && fDate <= dEnd) {
                tz = config.dsttz || config.stdtz;
              }
            }
          }

          if (!tz || !tz.startsWith('UTC')) return 0;
          const sign = tz.includes('-') ? -1 : 1;
          const timePart = tz.replace(/UTC[+-]/, '');
          if (!timePart) return 0;
          const [hours, minutes] = timePart.split(':').map(Number);
          return sign * ((hours * 60) + (minutes || 0));
        };

        depTzMins = getTzMins(depConfig, effFromDt);
        arrTzMins = getTzMins(arrConfig, effFromDt);
      }

      // Parse the Time Strings
      const [stdH, stdM] = std.split(':').map(Number);
      const [btH, btM] = bt.split(':').map(Number);

      // Only run math if time parts are successfully converted to numbers
      if (!isNaN(stdH) && !isNaN(btH)) {
        // FORMULA: STA = STD + BT + Diff in TZ (ArrTZ - DepTZ)
        const diffInTzMins = arrTzMins - depTzMins;
        let totalMins = (stdH * 60 + (stdM || 0)) + (btH * 60 + (btM || 0)) + diffInTzMins;

        // Wrap around 24 hours to cleanly handle midnight crossovers (forwards or backwards)
        totalMins = ((totalMins % 1440) + 1440) % 1440;

        const staH = Math.floor(totalMins / 60);
        const staM = totalMins % 60;
        const calculatedSTA = `${String(staH).padStart(2, '0')}:${String(staM).padStart(2, '0')}`;

        setFormData(prev => {
          // Check prevents endless re-renders and lets user manually override
          if (prev.sta !== calculatedSTA) return { ...prev, sta: calculatedSTA };
          return prev;
        });
      }
    }
  }, [formData.std, formData.bt, formData.depStn, formData.arrStn, formData.effFromDt, stationsData]);

  // --- HANDLERS ---
  const handleOpen = () => { setIsOpen(true); if (setAdd) setAdd(false); };
  const handleClose = () => { setIsOpen(false); if (setAdd) setAdd(true); setErrors({}); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "bt") {
      let cleaned = value.replace(/\D/g, "");

      if (cleaned.length >= 3) {
        cleaned = cleaned.slice(0, 4);
        value = cleaned.slice(0, 2) + ":" + cleaned.slice(2);
      }

      setFormData(prev => ({ ...prev, [name]: value }));
      validateField(name, value);
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let errorMsg = "";
    switch (name) {
      case "flight": if (!/^[a-zA-Z0-9\s]{0,8}$/.test(value)) errorMsg = "Max 8 alphanumeric chars"; break;
      case "depStn":
      case "arrStn": if (!/^[a-zA-Z0-9\s]{0,4}$/.test(value)) errorMsg = "Max 4 alphanumeric chars"; break;
      case "variant": if (!/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) errorMsg = "Max 8 chars (letters, nums, -)"; break;
      case "dow": if (!/^[1-7]{0,7}$/.test(value)) errorMsg = "Digits 1-7 only (Max 7 digits)"; break;
      case "bt":
        if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value))
          errorMsg = "Enter valid duration HH:MM (00:00 - 23:59)";
        break;
      case "userTag1":
      case "userTag2":
      case "remarks1":
      case "remarks2": if (!/^\s*.{0,12}\s*$/.test(value)) errorMsg = "Max 12 characters"; break;
      default: break;
    }
    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasErrors = Object.values(errors).some(x => x !== "") || !formData.effFromDt || !formData.effToDt;
    if (!formData.effFromDt) setErrors(prev => ({ ...prev, effFromDt: "Required" }));
    if (!formData.effToDt) setErrors(prev => ({ ...prev, effToDt: "Required" }));

    if (hasErrors) {
      toast.error("Please fix form errors before submitting.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData, domINTL: formData.domINTL.toLowerCase(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      const response = await axios.post("https://airlineplan.com/add-Data", payload, {
        headers: { "x-access-token": localStorage.getItem("accessToken"), "Content-Type": "application/json" },
      });

      if (response.status === 201 || response.status === 200) {
        toast.success("Record added successfully!");
        setTimeout(() => window.dispatchEvent(new Event("refreshData")), 1500);
        handleClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "An error occurred";
      toast.error(err.response?.status === 400 ? "Record already exists" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleOpen} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
        <Plus size={16} />
        <span>Add</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 m-auto z-[60] w-[95vw] max-w-5xl h-fit max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                <div>
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">New</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Enter flight details and schedule information.</p>
                </div>
                <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <form onSubmit={handleSubmit} id="add-network-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Flight Details</h3>
                    </div>
                    <InputField label="Flight No" name="flight" placeholder="e.g. AZ 90980" value={formData.flight} onChange={handleChange} error={errors.flight} required />
                    <ComboboxField label="Departure Stn" name="depStn" placeholder="Select or Type Dep Station" value={formData.depStn} onChange={handleChange} options={dropdownData.from || []} error={errors.depStn} required />
                    <ComboboxField label="Arrival Stn" name="arrStn" placeholder="Select or Type Arr Station" value={formData.arrStn} onChange={handleChange} options={dropdownData.to || []} error={errors.arrStn} required />
                    <InputField label="Variant" name="variant" placeholder="e.g. A330-200" value={formData.variant} onChange={handleChange} error={errors.variant} required />
                    <InputField label="Dom / Intl" name="domINTL" placeholder="DOM or INTL" value={formData.domINTL} onChange={handleChange} required />

                    <div className="hidden lg:block"></div>

                    <div className="lg:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 mt-2">
                      <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Schedule & Timing</h3>
                    </div>
                    <ComboboxField label="STD (Local)" name="std" placeholder="HH:MM" value={formData.std} onChange={handleChange} options={timeOptions} required />
                    <InputField
                      label="BT (Duration HH:MM)"
                      name="bt"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 02:30"
                      value={formData.bt}
                      onChange={handleChange}
                      error={errors.bt}
                      required
                    />
                    <ComboboxField label="STA (Local) - Auto Calculated" name="sta" placeholder="HH:MM" value={formData.sta} onChange={handleChange} options={timeOptions} className="font-bold bg-indigo-50/50 dark:bg-indigo-900/20" />

                    <InputField label="Effective From" name="effFromDt" type="date" icon={Calendar} value={formData.effFromDt} onChange={handleChange} error={errors.effFromDt} required />
                    <InputField label="Effective To" name="effToDt" type="date" icon={Calendar} value={formData.effToDt} onChange={handleChange} error={errors.effToDt} required min={formData.effFromDt} />
                    <InputField label="Days of Week" name="dow" type="number" placeholder="e.g. 1234567" value={formData.dow} onChange={handleChange} error={errors.dow} required />

                    <div className="lg:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 mt-2">
                      <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Additional Info</h3>
                    </div>
                    <InputField label="User Tag 1" name="userTag1" value={formData.userTag1} onChange={handleChange} error={errors.userTag1} />
                    <InputField label="User Tag 2" name="userTag2" value={formData.userTag2} onChange={handleChange} error={errors.userTag2} />
                    <div className="hidden lg:block"></div>
                    <InputField label="Remarks 1" name="remarks1" value={formData.remarks1} onChange={handleChange} error={errors.remarks1} />
                    <InputField label="Remarks 2" name="remarks2" value={formData.remarks2} onChange={handleChange} error={errors.remarks2} />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">Cancel</button>
                <button type="submit" form="add-network-form" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-[1.02]">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></> : <><Save size={16} /><span>Submit Record</span></>}
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