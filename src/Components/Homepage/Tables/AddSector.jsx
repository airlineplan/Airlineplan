import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { X } from "lucide-react";
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

// --- MAIN COMPONENT ---
const AddSector = (props) => {
  // --- STATE ---
  const [openNewModal, setOpenNewModal] = useState(false);
  const [sector1, setSector1] = useState("");
  const [sector2, setSector2] = useState("");
  const [gcd, setGCD] = useState("");
  const [acftType, setACFTType] = useState("");
  const [variant, setVariant] = useState("");
  
  // Added STD & STA states required for calculation
  const [std, setStd] = useState(""); 
  const [bt, setBlockTime] = useState("");
  const [sta, setSta] = useState(""); 
  
  const [paxCapacity, setPaxCapacity] = useState("");
  const [CargoCapT, setCargoCapT] = useState("");
  const [paxLF, setPaxLfPercent] = useState("");
  const [cargoLF, setCargoLfPercent] = useState("");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Stations Data for TZ Calculation
  const [stationsData, setStationsData] = useState([]);

  // Errors
  const [sector1Error, setSector1Error] = useState("");
  const [sector2Error, setSector2Error] = useState("");
  const [gcdError, setGCDError] = useState("");
  const [acftTypeError, setACFTTypeError] = useState("");
  const [variantError, setVariantError] = useState("");
  const [btError, setBlockTimeError] = useState("");
  const [paxCapacityError, setPaxCapacityError] = useState("");
  const [CargoCapTError, setCargoCapTError] = useState("");
  const [paxLFPercentError, setPaxLfPercentError] = useState("");
  const [cargoLFPercentError, setCargoLfPercentError] = useState("");
  const [fromDtError, setFromDtError] = useState("");
  const [toDtError, setToDtError] = useState("");

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
        console.error("Failed to fetch stations list", error);
      }
    };
    fetchStations();
  }, []);

  // --- ENGINE: Auto-Calculate STA ---
  useEffect(() => {
    if (std && bt && sector1 && sector2 && stationsData.length > 0) {
      const depStation = stationsData.find(s => s.stationName === sector1);
      const arrStation = stationsData.find(s => s.stationName === sector2);

      if (depStation?.stdtz && arrStation?.stdtz) {
        const parseTZ = (tzString) => {
          if (!tzString || !tzString.startsWith('UTC')) return 0;
          const sign = tzString.includes('-') ? -1 : 1;
          const timePart = tzString.replace(/UTC[+-]/, '');
          if (!timePart) return 0;
          const [hours, minutes] = timePart.split(':').map(Number);
          return sign * ((hours * 60) + (minutes || 0));
        };

        const depTzMins = parseTZ(depStation.stdtz);
        const arrTzMins = parseTZ(arrStation.stdtz);

        const [stdH, stdM] = std.split(':').map(Number);
        const [btH, btM] = bt.split(':').map(Number);

        // Formula: STA = STD + BT + (ArrTZ - DepTZ)
        let totalMins = (stdH * 60 + stdM) + (btH * 60 + btM) + (arrTzMins - depTzMins);

        // Wrap around 24 hours (1440 minutes)
        totalMins = ((totalMins % 1440) + 1440) % 1440; 

        const staH = Math.floor(totalMins / 60);
        const staM = totalMins % 60;
        
        setSta(`${String(staH).padStart(2, '0')}:${String(staM).padStart(2, '0')}`);
      }
    }
  }, [std, bt, sector1, sector2, stationsData]);

  // --- HANDLERS ---
  const handleClose = () => {
    setSector1Error(null); setSector2Error(null); setGCDError(null); setACFTTypeError(null);
    setVariantError(null); setBlockTimeError(null); setPaxCapacityError(null); setCargoCapTError(null);
    setPaxLfPercentError(null); setCargoLfPercentError(null); setFromDtError(null); setToDtError(null);
  };

  const handleSector1 = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) {
      setSector1(value); setSector1Error("");
    } else {
      setSector1Error("Dep Stn must be 4 characters long");
    }
  };

  const handleSector2 = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) {
      setSector2(value); setSector2Error("");
    } else {
      setSector2Error("Arr Stn must be 4 characters long");
    }
  };

  const handleGCD = (event) => {
    const inputValue = event.target.value;
    const parsedValue = parseInt(inputValue, 10);
    if (isNaN(parsedValue)) return setGCDError("Please enter a valid integer");
    if (parsedValue < 0 || parsedValue > 20000) return setGCDError("Please enter an integer between 0 and 20,000.");
    setGCDError(""); setGCD(parsedValue);
  };

  const handleACFT = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) {
      setACFTType(value); setACFTTypeError("");
    } else {
      setACFTTypeError('Must be 8 characters and can only contain letters, numbers, "-", and blank spaces');
    }
  };

  const handleVariant = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) {
      setVariant(value); setVariantError("");
    } else {
      setVariantError('Must be 8 characters and can only contain letters, numbers, "-", and blank spaces');
    }
  };

  const handleSTD = (event) => setStd(event.target.value);
  const handleBlockTime = (event) => setBlockTime(event.target.value);
  const handleSTA = (event) => setSta(event.target.value);

  const handlePaxCapacity = (event) => {
    const inputValue = event.target.value;
    const parsedValue = parseInt(inputValue, 10);
    if (isNaN(parsedValue) || !Number.isInteger(parsedValue)) {
      setPaxCapacityError("Please enter an integer between 0 and 600"); setPaxCapacity("");
    } else if (parsedValue < 0 || parsedValue > 600) {
      setPaxCapacityError("Please enter an integer between 0 and 600."); setPaxCapacity("");
    } else {
      setPaxCapacityError(""); setPaxCapacity(parsedValue);
    }
  };

  const handleCargoCapT = (event) => {
    const inputValue = event.target.value;
    const parsedValue = parseFloat(inputValue);
    if (isNaN(parsedValue) || parsedValue <= 0 || parsedValue > 150) {
      setCargoCapTError("Please enter a number between 0.1 and 150"); setCargoCapT("");
    } else {
      setCargoCapTError(""); setCargoCapT(parsedValue);
    }
  };

  const handlePaxPercent = (event) => {
    const value = event.target.value;
    const percentage = parseFloat(value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100 || value.includes(".")) {
      setPaxLfPercentError("percentage between 0% and 100% without decimals."); setPaxLfPercent("");
    } else {
      setPaxLfPercent(percentage); setPaxLfPercentError("");
    }
  };

  const handleCargoPercent = (event) => {
    const value = event.target.value;
    const percentage = parseFloat(value);
    if (isNaN(percentage) || percentage < 0 || percentage > 100 || value.includes(".")) {
      setCargoLfPercentError("percentage between 0% and 100% without decimals."); setCargoLfPercent("");
    } else {
      setCargoLfPercent(percentage); setCargoLfPercentError("");
    }
  };

  const handleFromDt = (event) => setFromDt(event.target.value);
  const handleToDt = (event) => setToDt(event.target.value);

  useEffect(() => {
    if (!fromDt) setFromDtError("This field is required.");
    else setFromDtError("");
  }, [fromDt]);

  useEffect(() => {
    if (!toDt) setToDtError("This field is required.");
    else setToDtError("");
  }, [toDt]);

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fromDt) { setFromDtError("This field is required."); return; }
    if (!toDt) { setToDtError("This field is required."); return; }

    if (
      sector1Error || sector2Error || gcdError || acftTypeError ||
      variantError || paxCapacityError || CargoCapTError ||
      paxLFPercentError || cargoLFPercentError || btError
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:5001/add-sector",
        // Included std and sta in the payload
        { sector1, sector2, acftType, variant, std, bt, sta, gcd, paxCapacity, CargoCapT, paxLF, cargoLF, fromDt, toDt },
        { headers: { "x-access-token": `${localStorage.getItem("accessToken")}`, "Content-Type": "application/json" } }
      );

      if (response.status === 201) {
        toast.success("Sector added successfully!");
        setLoading(false);
        setTimeout(() => { window.location.reload(); }, 2000);
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400) {
        toast.error("Already exist");
      } else {
        toast.error("An error occurred while processing your request.");
      }
      setLoading(false);
    }
  };

  // Keyboard navigation logic
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
      <button
        onClick={() => {
          setOpenNewModal(true);
          handleClose();
          props.setAdd(false);
        }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        New
      </button>

      {/* MODAL / DIALOG */}
      <AnimatePresence>
        {openNewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOpenNewModal(false); props.setAdd(true); }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onKeyDown={handleKeyDown}
              className="fixed inset-0 m-auto z-50 w-full max-w-4xl h-fit max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 custom-scrollbar"
            >

              {/* Header */}
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                  Add
                </h3>
                <button
                  onClick={() => { setOpenNewModal(false); setLoading(false); props.setAdd(true); }}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Grid */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Dep Stn" error={sector1Error}>
                    <input className={baseInputStyles} name="sector1" required placeholder="VI89" onChange={handleSector1} />
                  </InputGroup>
                  <InputGroup label="Arr Stn" error={sector2Error}>
                    <input className={baseInputStyles} name="sector2" required placeholder="VIDP" onChange={handleSector2} />
                  </InputGroup>
                  <InputGroup label="GCD" error={gcdError}>
                    <input className={baseInputStyles} type="number" name="gcd" required placeholder="0 - 20000" onChange={handleGCD} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="STD (LT)">
                    <input className={baseInputStyles} type="time" required value={std} onChange={handleSTD} />
                  </InputGroup>
                  <InputGroup label="Block Time (BT)" error={btError}>
                    <input className={baseInputStyles} type="time" name="bt" required onChange={handleBlockTime} />
                  </InputGroup>
                  <InputGroup label="STA (LT) - Auto Calculated">
                    <input className={cn(baseInputStyles, "bg-indigo-50/50 dark:bg-indigo-900/20 font-bold")} type="time" value={sta} onChange={handleSTA} disabled />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="ACFT Type" error={acftTypeError}>
                    <input className={baseInputStyles} name="acftType" required placeholder="A330-200" onChange={handleACFT} />
                  </InputGroup>
                  <InputGroup label="Variant" error={variantError}>
                    <input className={baseInputStyles} name="variant" required placeholder="777300ER" onChange={handleVariant} />
                  </InputGroup>
                  <InputGroup label="Pax Capacity" error={paxCapacityError}>
                    <input className={baseInputStyles} type="number" name="paxCapacity" required placeholder="1-600" onChange={handlePaxCapacity} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Cargo Cap T" error={CargoCapTError}>
                    <input className={baseInputStyles} type="number" step="0.1" name="CargoCapT" required placeholder="150.0" onChange={handleCargoCapT} />
                  </InputGroup>
                  <InputGroup label="Pax LF%" error={paxLFPercentError}>
                    <input className={baseInputStyles} type="number" name="paxLF" required placeholder="100" onChange={handlePaxPercent} />
                  </InputGroup>
                  <InputGroup label="Cargo LF%" error={cargoLFPercentError}>
                    <input className={baseInputStyles} type="number" name="cargoLF" required placeholder="100" onChange={handleCargoPercent} />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="From Dt" error={fromDtError}>
                    <input className={baseInputStyles} type="date" required value={fromDt} onChange={handleFromDt} />
                  </InputGroup>
                  <InputGroup label="To Dt" error={toDtError}>
                    <input className={baseInputStyles} type="date" min={fromDt} required value={toDt} onChange={handleToDt} />
                  </InputGroup>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => { setOpenNewModal(false); props.setAdd(true); }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={loading}>
                    Submit Sector
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

export default AddSector;