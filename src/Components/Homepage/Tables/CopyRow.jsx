import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { X, Copy, Search } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const Button = ({ children, variant = "primary", className, loading, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 hover:scale-[1.02]",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} disabled={loading} {...props}>
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      ) : null}
      {children}
    </button>
  );
};

const InputGroup = ({ label, error, children }) => (
  <div className="flex flex-col space-y-1 w-full">
    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
      {label}
    </label>
    {children}
    {error && (
      <motion.span
        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
        className="text-xs text-red-500 font-medium leading-tight"
      >
        {error}
      </motion.span>
    )}
  </div>
);

const baseInputStyles = "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed";

// Allows typing a custom value OR selecting an existing value
const ComboboxInput = ({ value, onChange, placeholder, options = [], disabled = false, className }) => {
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
    <div className="relative group w-full" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn(baseInputStyles, className, disabled && "font-bold bg-slate-100 dark:bg-slate-800")}
      />
      {!disabled && (
        <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                  onChange(opt.value);
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
  );
};

// --- MAIN COMPONENT ---
export default function CopyRow(props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownData, setDropdownData] = useState({ from: [], to: [] });

  const [flight, setFlight] = useState("");
  const [depStn, setDepStn] = useState("");
  const [std, setStd] = useState("");
  const [bt, setBt] = useState("");
  const [sta, setSta] = useState("");
  const [arrStn, setArrStn] = useState("");
  const [variant, setVariant] = useState("");
  const [effFromDt, setEffFromDt] = useState("");
  const [effToDt, setEffToDt] = useState("");
  const [dow, setDow] = useState("");
  const [domINTL, setDomIntl] = useState("");
  const [userTag1, setUserTag1] = useState("");
  const [userTag2, setUserTag2] = useState("");
  const [remarks1, setRemarks1] = useState("");
  const [remarks2, setRemarks2] = useState("");

  const [flightError, setFlightError] = useState("");
  const [depStnError, setDepStnError] = useState("");
  const [arrStnError, seArrStnError] = useState("");
  const [variantError, setVariantError] = useState("");
  const [dowError, setDowError] = useState("");
  const [effToDtError, setEffToDtError] = useState("");
  const [effFromDtError, setEffFromDtError] = useState("");
  const [userTag1Error, setUserTag1Error] = useState("");
  const [userTag2Error, setUserTag2Error] = useState("");
  const [remarks1Error, setRemarks1Error] = useState("");
  const [remarks2Error, setRemarks2Error] = useState("");

  // --- API: Fetch Dropdowns ---
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const response = await axios.get("http://localhost:3000/dashboard/populateDropDowns", {
          headers: { "x-access-token": localStorage.getItem("accessToken") },
        });
        if (response.data) {
          setDropdownData({
            from: response.data.from || [],
            to: response.data.to || []
          });
        }
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
        setDropdownData({ from: [], to: [] });
      }
    };

    fetchDropdowns();
  }, []);

  // --- AUTO CALCULATION LOGIC FOR STA ---
  useEffect(() => {
    if (std && bt) {
      const [stdHours, stdMinutes] = std.split(":").map(Number);
      const [btHours, btMinutes] = bt.split(":").map(Number);

      if (!isNaN(stdHours) && !isNaN(stdMinutes) && !isNaN(btHours) && !isNaN(btMinutes)) {
        let totalMinutes = stdMinutes + btMinutes;
        let extraHours = Math.floor(totalMinutes / 60);
        let finalMinutes = totalMinutes % 60;

        let totalHours = stdHours + btHours + extraHours;
        let finalHours = totalHours % 24;

        const formattedHours = String(finalHours).padStart(2, "0");
        const formattedMinutes = String(finalMinutes).padStart(2, "0");

        setSta(`${formattedHours}:${formattedMinutes}`);
      }
    }
  }, [std, bt]);

  // --- HANDLERS ---
  const handleClickOpen = () => {
    setOpen(true);
    setFlightError(""); setDepStnError(""); seArrStnError(""); setVariantError("");
    setDowError(""); setEffToDtError(""); setEffFromDtError(""); setUserTag1Error("");
    setUserTag2Error(""); setRemarks1Error(""); setRemarks2Error("");
  };

  const handleClose = () => setOpen(false);

  const handleFlight = (event) => {
    const value = event.target.value;
    setFlight(value);
    if (/^[a-zA-Z0-9\s]{0,8}$/.test(value)) setFlightError("");
    else setFlightError("Flight must be 8 characters long");
  };

  const handleDepStn = (value) => {
    setDepStn(value);
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) setDepStnError("");
    else setDepStnError("Dep Stn must be 4 characters long");
  };

  const handleArrStn = (value) => {
    setArrStn(value);
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) seArrStnError("");
    else seArrStnError("Arr Stn must be 4 characters long");
  };

  // Updated handlers to extract values from native input events
  const handleSTD = (event) => setStd(event.target.value);
  const handleSTA = (event) => setSta(event.target.value);
  const handleBT = (event) => setBt(event.target.value);

  const handleVariant = (event) => {
    const value = event.target.value;
    setVariant(value);
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) setVariantError("");
    else setVariantError('Must be 8 chars (letters, numbers, "-", spaces)');
  };

  const handleEffFromDt = (event) => setEffFromDt(event.target.value);
  const handleEffToDt = (event) => setEffToDt(event.target.value);

  const handleDow = (event) => {
    const value = event.target.value;
    setDow(value);
    if (/^[1-7]{0,7}$/.test(value)) setDowError("");
    else setDowError("Must be 7 digits (1-7)");
  };

  const handleDomIntl = (event) => setDomIntl(event.target.value.toLowerCase());

  const handleUserTag1 = (event) => {
    const input = event.target.value;
    setUserTag1(input);
    if (/^\s*.{0,12}\s*$/.test(input)) setUserTag1Error("");
    else setUserTag1Error("Max 12 characters");
  };

  const handleUserTag2 = (event) => {
    const input = event.target.value;
    setUserTag2(input);
    if (/^\s*.{0,12}\s*$/.test(input)) setUserTag2Error("");
    else setUserTag2Error("Max 12 characters");
  };

  const handleRemarks1 = (event) => {
    const input = event.target.value;
    setRemarks1(input);
    if (/^\s*.{0,12}\s*$/.test(input)) setRemarks1Error("");
    else setRemarks1Error("Max 12 characters");
  };

  const handleRemarks2 = (event) => {
    const input = event.target.value;
    setRemarks2(input);
    if (/^\s*.{0,12}\s*$/.test(input)) setRemarks2Error("");
    else setRemarks2Error("Max 12 characters");
  };

  useEffect(() => {
    if (!effToDt) setEffToDtError("This field is required.");
    else setEffToDtError("");
  }, [effToDt]);

  useEffect(() => {
    if (!effFromDt) setEffFromDtError("This field is required.");
    else setEffFromDtError("");
  }, [effFromDt]);

  const decimalToHHMM = (decimal) => {
    if (!decimal) return "";

    const num = parseFloat(decimal);
    if (isNaN(num)) return decimal;

    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 100);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  // --- API DATA LOGIC ---
  const DataId = props?.checkedRows?.[0];
  const fetchData = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/products/${DataId}`);
      const item = response.data;
      setFlight(item.flight || "");
      setDepStn(item.depStn || "");
      setStd(item.std || "");
      setBt(decimalToHHMM(item.bt));
      setSta(item.sta || "");
      setArrStn(item.arrStn || "");
      setVariant(item.variant || "");

      setEffFromDt(item.effFromDt ? dayjs(item.effFromDt).format("YYYY-MM-DD") : "");
      setEffToDt(item.effToDt ? dayjs(item.effToDt).format("YYYY-MM-DD") : "");

      setDow(item.dow || "");
      setDomIntl(item.domINTL ? item.domINTL.toLowerCase() : "");
      setUserTag1(item.userTag1 || "");
      setUserTag2(item.userTag2 || "");
      setRemarks1(item.remarks1 || "");
      setRemarks2(item.remarks2 || "");
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch row data");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!effFromDt) { setEffFromDtError(" This field is required."); return; }
    if (!effToDt) { setEffToDtError(" This field is required."); return; }

    if (
      flightError || depStnError || arrStnError || variantError ||
      dowError || userTag1Error || userTag2Error || remarks1Error || remarks2Error
    ) {
      return;
    }

    try {
      setLoading(true);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await axios.post(
        "http://localhost:3000/add-Data",
        {
          flight, depStn, std, bt, sta, arrStn, variant, effFromDt, effToDt,
          dow, domINTL, userTag1, userTag2, remarks1, timeZone, remarks2,
        },
        { headers: { "x-access-token": `${localStorage.getItem("accessToken")}`, "Content-Type": "application/json" } }
      );

      if (response.status === 201 || response.status === 200) {
        toast.success("Copy successful!");
        setTimeout(() => window.dispatchEvent(new Event("refreshData")), 1500);
        handleClose();
      }
    } catch (err) {
      console.error(err);
      const actualError = err.response?.data?.message || err.response?.data?.error || err.response?.data?.msg || err.message || "An error occurred";
      toast.error(err.response?.status === 400 ? `Error: Record already exists (${actualError})` : `Failed: ${actualError}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const inputFields = document.querySelectorAll('input:not([type="hidden"])');
      const currentFocusedIndex = Array.from(inputFields).indexOf(document.activeElement);
      const nextFocusedIndex = (currentFocusedIndex + 1) % inputFields.length;
      if (inputFields[nextFocusedIndex]) inputFields[nextFocusedIndex].focus();
    }
  };

  return (
    <>
      <button
        onClick={() => {
          if (!props.checkedRows || props.checkedRows.length !== 1) {
            toast.warning("Please select exactly one row to copy.");
            return;
          }
          handleClickOpen();
          fetchData();
          props.setAdd(false);
        }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
      >
        <Copy size={16} />
        <span>Copy</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { handleClose(); props.setAdd(true); setLoading(false); }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onKeyDown={handleKeyDown}
              className="fixed inset-0 m-auto z-50 w-full max-w-5xl h-fit max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 custom-scrollbar"
            >

              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                  Copy Row Data
                </h3>
                <button
                  onClick={() => { handleClose(); props.setAdd(true); setLoading(false); }}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Flight" error={flightError}>
                    <input className={baseInputStyles} value={flight} onChange={handleFlight} placeholder="Flight number" />
                  </InputGroup>
                  <InputGroup label="Dep Stn" error={depStnError}>
                    <ComboboxInput
                      value={depStn}
                      onChange={handleDepStn}
                      placeholder="Select or Type Dep Station"
                      options={dropdownData.from || []}
                    />
                  </InputGroup>
                  <InputGroup label="Arr Stn" error={arrStnError}>
                    <ComboboxInput
                      value={arrStn}
                      onChange={handleArrStn}
                      placeholder="Select or Type Arr Station"
                      options={dropdownData.to || []}
                    />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="STD (LT)">
                     <input className={baseInputStyles} required type="time" value={std} onChange={handleSTD} />
                  </InputGroup>
                  <InputGroup label="BT">
                    <input className={baseInputStyles} required type="time" value={bt} onChange={handleBT} />
                  </InputGroup>
                  <InputGroup label="STA (LT)">
                     <input className={baseInputStyles} type="time" value={sta} onChange={handleSTA} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Variant" error={variantError}>
                    <input className={baseInputStyles} required value={variant} onChange={handleVariant} placeholder="Variant" />
                  </InputGroup>
                  <InputGroup label="Eff From Dt" error={effFromDtError}>
                    <input className={baseInputStyles} type="date" required value={effFromDt} onChange={handleEffFromDt} />
                  </InputGroup>
                  <InputGroup label="Eff To Dt" error={effToDtError}>
                    <input className={baseInputStyles} type="date" required min={effFromDt} value={effToDt} onChange={handleEffToDt} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="DoW" error={dowError}>
                    <input className={baseInputStyles} required type="number" value={dow} onChange={handleDow} placeholder="1234567" />
                  </InputGroup>
                  <InputGroup label="Dom / INTL">
                    <input className={baseInputStyles} required value={domINTL} onChange={handleDomIntl} placeholder="dom/intl" />
                  </InputGroup>
                  <InputGroup label="User Tag 1" error={userTag1Error}>
                    <input className={baseInputStyles} value={userTag1} onChange={handleUserTag1} placeholder="Tag 1" />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="User Tag 2" error={userTag2Error}>
                    <input className={baseInputStyles} value={userTag2} onChange={handleUserTag2} placeholder="Tag 2" />
                  </InputGroup>
                  <InputGroup label="Remarks 1" error={remarks1Error}>
                    <input className={baseInputStyles} value={remarks1} onChange={handleRemarks1} placeholder="Remarks 1" />
                  </InputGroup>
                  <InputGroup label="Remarks 2" error={remarks2Error}>
                    <input className={baseInputStyles} value={remarks2} onChange={handleRemarks2} placeholder="Remarks 2" />
                  </InputGroup>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => { handleClose(); props.setAdd(true); setLoading(false); }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={loading}>
                    Save Copied Row
                  </Button>
                </div>

              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ToastContainer position="bottom-right" theme="colored" />
    </>
  );
}