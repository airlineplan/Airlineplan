import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { X, PenLine } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const Button = ({ children, variant = "primary", className, loading, icon: Icon, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 hover:scale-[1.02]",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} disabled={loading} {...props}>
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      ) : Icon && (
        <Icon size={16} className="mr-2" />
      )}
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

const baseInputStyles = "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400";

// --- MAIN COMPONENT ---
const UpdatePopUp = (props) => {
  // --- STATE ---
  const [openUpdate, setOpenUpdate] = useState(false);
  const [product, setProduct] = useState("");

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
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);

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

  const isBulkUpdate = props.checkedRows?.length > 1;
  const DataId = props.checkedRows?.[0];
  const productId = props.checkedRows;

  // --- HANDLERS ---
  const handleUpdateOpen = () => {
    setOpenUpdate(true);
    setFlightError(null);
    setDepStnError(null);
    seArrStnError(null);
    setVariantError(null);
    setDowError(null);
    setEffToDtError(null);
    setEffFromDtError(null);
    setUserTag1Error(null);
    setUserTag2Error(null);
    setRemarks1Error(null);
    setRemarks2Error(null);
  };

  const handleFlight = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,8}$/.test(value)) {
      setFlight(value);
      setFlightError("");
    } else {
      setFlightError("Flight must be 8 characters long");
    }
  };

  const handleDepStn = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) {
      setDepStn(value);
      setDepStnError("");
    } else {
      setDepStnError("Dep Stn must be 4 characters long");
    }
  };

  const handleSTD = (event) => setStd(event.target.value);
  const handleBT = (event) => setBt(event.target.value);
  const handleSTA = (event) => setSta(event.target.value); // Manual override is possible via this handler

  const handleArrStn = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) {
      setArrStn(value);
      seArrStnError("");
    } else {
      seArrStnError("Arr Stn must be 4 characters long");
    }
  };

  const handleVariant = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) {
      setVariant(value);
      setVariantError("");
    } else {
      setVariantError('Must be 8 characters and can only contain letters, numbers, "-", and blank spaces');
    }
  };

  const handleEffFromDt = (event) => setEffFromDt(event.target.value);
  const handleEffToDt = (event) => setEffToDt(event.target.value);

  const handleDow = (event) => {
    const value = event.target.value;
    if (/^[1-7]{0,7}$/.test(value)) {
      setDow(value);
      setDowError("");
    } else {
      setDowError("Must be 7 digits and each digit can only be between 1 and 7.");
    }
  };

  const handleDomIntl = (event) => setDomIntl(event.target.value.toLowerCase());

  const handleUserTag1 = (event) => {
    const input = event.target.value;
    if (/^\s*.{0,12}\s*$/.test(input)) {
      setUserTag1(input);
      setUserTag1Error("");
    } else {
      setUserTag1Error("Must be 12 characters and can only contain letters");
    }
  };

  const handleUserTag2 = (event) => {
    const input = event.target.value;
    if (/^\s*.{0,12}\s*$/.test(input)) {
      setUserTag2(input);
      setUserTag2Error("");
    } else {
      setUserTag2Error("Must be 12 characters and can only contain letters");
    }
  };

  const handleRemarks1 = (event) => {
    if (/^\s*.{0,12}\s*$/.test(event.target.value)) {
      setRemarks1(event.target.value);
      setRemarks1Error("");
    } else {
      setRemarks1Error("Must be 12 characters and can only contain letters");
    }
  };

  const handleRemarks2 = (event) => {
    if (/^\s*.{0,12}\s*$/.test(event.target.value)) {
      setRemarks2(event.target.value);
      setRemarks2Error("");
    } else {
      setRemarks2Error("Must be 12 characters and can only contain letters");
    }
  };

  // --- AUTO CALCULATION LOGIC FOR STA ---
  useEffect(() => {
    if (std && bt) {
      // Split time strings into hours and minutes
      const [stdHours, stdMinutes] = std.split(":").map(Number);
      const [btHours, btMinutes] = bt.split(":").map(Number);

      if (!isNaN(stdHours) && !isNaN(stdMinutes) && !isNaN(btHours) && !isNaN(btMinutes)) {
        // Calculate total minutes and rollover hours
        let totalMinutes = stdMinutes + btMinutes;
        let extraHours = Math.floor(totalMinutes / 60);
        let finalMinutes = totalMinutes % 60;

        // Calculate total hours and handle midnight rollover (24-hour format)
        let totalHours = stdHours + btHours + extraHours;
        let finalHours = totalHours % 24;

        // Pad with zeros to maintain "HH:mm" structure expected by type="time"
        const formattedHours = String(finalHours).padStart(2, "0");
        const formattedMinutes = String(finalMinutes).padStart(2, "0");

        setSta(`${formattedHours}:${formattedMinutes}`);
      }
    }
  }, [std, bt]); // Runs whenever STD or BT changes

  // Required Field logic
  useEffect(() => {
    if (!effToDt && !isBulkUpdate) {
      setEffToDtError("This field is required.");
    } else {
      setEffToDtError("");
    }
  }, [effToDt, isBulkUpdate]);

  useEffect(() => {
    if (!effFromDt && !isBulkUpdate) {
      setEffFromDtError("This field is required.");
    } else {
      setEffFromDtError("");
    }
  }, [effFromDt, isBulkUpdate]);

  // Data Fetching Logic
  const fetchData = async () => {
    if (isBulkUpdate) return;
    try {
      const response = await axios.get(`http://localhost:3000/products/${DataId}`);
      const item = response.data;

      // Adapted for native HTML5 Date inputs (requires YYYY-MM-DD)
      const formtEffFromDate = item.effFromDt ? moment(item.effFromDt).format("YYYY-MM-DD") : "";
      const formtEfftoDate = item.effToDt ? moment(item.effToDt).format("YYYY-MM-DD") : "";

      setFlight(item.flight || "");
      setDepStn(item.depStn || "");
      setStd(item.std || "");
      setBt(item.bt || "");
      setSta(item.sta || "");
      setArrStn(item.arrStn || "");
      setVariant(item.variant || "");
      setEffFromDt(formtEffFromDate);
      setEffToDt(formtEfftoDate);
      setDow(item.dow || "");
      setDomIntl(item.domINTL ? item.domINTL.toLowerCase() : "");
      setUserTag1(item.userTag1 || "");
      setUserTag2(item.userTag2 || "");
      setRemarks1(item.remarks1 || "");
      setRemarks2(item.remarks2 || "");
    } catch (error) {
      console.error(error);
      setProduct(null);
    }
  };

  // Helper Functions
  function isValidProductData(productData) {
    for (const key in productData) {
      if (productData.hasOwnProperty(key) && (productData[key] !== '' && productData[key] !== null && productData[key] !== undefined)) {
        return true; 
      }
    }
    return false; 
  }

  function removeEmptyFields(productData) {
    for (const key in productData) {
      if (productData.hasOwnProperty(key) && (productData[key] === '' || productData[key] === null || productData[key] === undefined)) {
        delete productData[key];
      }
    }
  }

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effFromDt && !isBulkUpdate) {
      setEffFromDtError(" This field is required.");
      return;
    }
    if (!effToDt && !isBulkUpdate) {
      setEffToDtError(" This field is required.");
      return;
    }

    if (
      flightError || depStnError || arrStnError || variantError ||
      dowError || userTag1Error || userTag2Error || remarks1Error || remarks2Error
    ) {
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const productData = {
      flight, depStn, std, bt, sta, arrStn, variant, effFromDt, effToDt,
      dow, domINTL, userTag1, userTag2, remarks1, remarks2, timeZone
    };

    removeEmptyFields(productData);

    if (isValidProductData(productData)) {
      console.log('At least one field is not empty, null, or undefined.');
    } else {
      toast.error("All fields are empty");
      return; 
    }

    if (productId) {
      setLoading(true);
      axios.put(`http://localhost:3000/update-data/${productId}`, productData, {
          headers: { 'x-access-token': `${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' },
        })
        .then((response) => {
          const data = response.data;
          setLoading(false);
          toast.success("Updated successfully");
          setMessage(data.message);
          setTimeout(() => window.dispatchEvent(new Event("refreshData")), 2000);
        })
        .catch((error) => {
          console.error(error);
          if (error.response && error.response.status === 400 && error.response.data.message === "Data with this combination already exists") {
            toast.error("Data with this combination already exists");
          } else {
            toast.error("An error occurred");
          }
          setLoading(false);
        });
    }
  };

  // Keyboard Navigation
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
      {/* TRIGGER BUTTON */}
      <Button
        variant="secondary"
        icon={PenLine}
        onClick={() => {
          if (!props.checkedRows || props.checkedRows.length === 0) {
             toast.warning("Please select at least one row to update.");
             return;
          }
          handleUpdateOpen();
          fetchData();
        }}
        className="ml-2"
      >
        Update Selected
      </Button>

      {/* MODAL / DIALOG */}
      <AnimatePresence>
        {openUpdate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOpenUpdate(false); setLoading(false); }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onKeyDown={handleKeyDown}
              className="fixed inset-0 m-auto z-50 w-full max-w-5xl h-fit max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 custom-scrollbar"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                    {isBulkUpdate ? "Bulk Update Rows" : "Update Row"}
                  </h3>
                  {isBulkUpdate && (
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Updating {props.checkedRows.length} rows. Blank fields will be ignored.
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => { setOpenUpdate(false); setLoading(false); }}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Grid - Fixed horizontal layout with CSS Grid */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Flight" error={flightError}>
                    <input className={baseInputStyles} value={flight} onChange={handleFlight} placeholder="Flight number" />
                  </InputGroup>
                  <InputGroup label="Dep Stn" error={depStnError}>
                    <input className={baseInputStyles} required={!isBulkUpdate} value={depStn} onChange={handleDepStn} placeholder="Dep Station" />
                  </InputGroup>
                  <InputGroup label="Arr Stn" error={arrStnError}>
                    <input className={baseInputStyles} value={arrStn} onChange={handleArrStn} placeholder="Arr Station" />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="STD (LT)">
                    <input className={baseInputStyles} required={!isBulkUpdate} type="time" value={std} onChange={handleSTD} />
                  </InputGroup>
                  <InputGroup label="BT">
                    <input className={baseInputStyles} required={!isBulkUpdate} type="time" value={bt} onChange={handleBT} />
                  </InputGroup>
                  <InputGroup label="STA (LT)">
                    {/* Value is tied to state, meaning it can be over-written by handleSTA, but also updated by useEffect */}
                    <input className={baseInputStyles} type="time" value={sta} onChange={handleSTA} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Variant" error={variantError}>
                    <input className={baseInputStyles} required={!isBulkUpdate} value={variant} onChange={handleVariant} placeholder="Variant" />
                  </InputGroup>
                  <InputGroup label="Eff From Dt" error={effFromDtError}>
                    <input className={baseInputStyles} type="date" required={!isBulkUpdate} value={effFromDt} onChange={handleEffFromDt} />
                  </InputGroup>
                  <InputGroup label="Eff To Dt" error={effToDtError}>
                    {/* Note: Native min restriction relies on Eff From Date being filled */}
                    <input className={baseInputStyles} type="date" required={!isBulkUpdate} min={effFromDt} value={effToDt} onChange={handleEffToDt} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="DoW" error={dowError}>
                    <input className={baseInputStyles} required={!isBulkUpdate} type="number" value={dow} onChange={handleDow} placeholder="1234567" />
                  </InputGroup>
                  <InputGroup label="Dom / INTL">
                    <input className={baseInputStyles} required={!isBulkUpdate} value={domINTL} onChange={handleDomIntl} placeholder="dom/intl" />
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
                  <Button type="button" variant="ghost" onClick={() => { setOpenUpdate(false); setLoading(false); }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={loading}>
                    {isBulkUpdate ? "Apply Bulk Update" : "Save Changes"}
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
};

export default UpdatePopUp;