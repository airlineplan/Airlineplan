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

const baseInputStyles = "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed";

// --- MAIN COMPONENT ---
const UpdateSectore = (props) => {
  // --- STATE ---
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  
  const [sector1, setSector1] = useState("");
  const [sector2, setSector2] = useState("");
  const [gcd, setGCD] = useState("");
  const [acftType, setACFTType] = useState("");
  const [variant, setVariant] = useState("");
  const [std, setStd] = useState(""); // Needed for STA calculation
  const [bt, setBlockTime] = useState("");
  const [sta, setSta] = useState(""); // The calculated STA
  const [paxCapacity, setPaxCapacity] = useState("");
  const [CargoCapT, setCargoCapT] = useState("");
  const [paxLF, setPaxLfPercent] = useState("");
  const [cargoLF, setCargoLfPercent] = useState("");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [loading, setLoading] = useState(false);

  // Stations List for STA Calculation
  const [stationsList, setStationsList] = useState([]);

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

  const DataId = props.checkedRows?.[0];
  const productId = props.checkedRows;
  const isRequired = props.checkedRows?.length > 1 ? false : true;

  // --- API: Fetch Stations for Timezone Logic ---
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await axios.get("http://localhost:5001/get-stationData", {
          headers: { "x-access-token": localStorage.getItem("accessToken") },
        });
        if (response.data && response.data.data) {
          setStationsList(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stations list for TZ calculation", error);
      }
    };
    fetchStations();
  }, []);

  // --- ENGINE: Auto-Calculate STA ---
  useEffect(() => {
    // Only calculate if all required variables and stations are present
    if (std && bt && sector1 && sector2 && stationsList.length > 0) {
      
      const depStation = stationsList.find(s => s.stationName === sector1);
      const arrStation = stationsList.find(s => s.stationName === sector2);

      if (depStation?.stdtz && arrStation?.stdtz) {
        
        // Helper to convert "UTC+5:30" or "UTC-4:00" to total minutes
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

        // Wrap around 24 hours (1440 minutes) to handle next day / previous day overlaps
        totalMins = ((totalMins % 1440) + 1440) % 1440; 

        const staH = Math.floor(totalMins / 60);
        const staM = totalMins % 60;
        
        // Format to HH:MM and set state
        const calculatedSTA = `${String(staH).padStart(2, '0')}:${String(staM).padStart(2, '0')}`;
        setSta(calculatedSTA);
      }
    }
  }, [std, bt, sector1, sector2, stationsList]);

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
    const parsedValue = parseInt(event.target.value, 10);
    if (isNaN(parsedValue)) return setGCDError("Please enter a valid integer");
    if (parsedValue < 0 || parsedValue > 20000) return setGCDError("Please enter an integer between 0 and 20,000.");
    setGCDError(""); setGCD(parsedValue);
  };

  const handleACFT = (event) => {
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(event.target.value)) {
      setACFTType(event.target.value); setACFTTypeError("");
    } else {
      setACFTTypeError('Must be 8 characters and can only contain letters, numbers, "-", and blank spaces');
    }
  };

  const handleVariant = (event) => {
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(event.target.value)) {
      setVariant(event.target.value); setVariantError("");
    } else {
      setVariantError('Must be 8 characters and can only contain letters, numbers, "-", and blank spaces');
    }
  };

  // Ensure STD and BT map correctly to state to trigger the Auto-Calculation
  const handleSTD = (event) => setStd(event.target.value);
  const handleBlockTime = (event) => setBlockTime(event.target.value);
  const handleSTA = (event) => setSta(event.target.value); // Allow manual override if needed

  const handlePaxCapacity = (event) => {
    const parsedValue = parseInt(event.target.value, 10);
    if (isNaN(parsedValue) || !Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 600) {
      setPaxCapacityError("Please enter an integer between 0 and 600."); setPaxCapacity("");
    } else {
      setPaxCapacityError(""); setPaxCapacity(parsedValue);
    }
  };

  const handleCargoCapT = (event) => {
    const parsedValue = parseFloat(event.target.value);
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
    if (!fromDt && !props.checkedRows?.length > 1) setFromDtError("This field is required.");
    else setFromDtError("");
  }, [fromDt, props.checkedRows]);

  useEffect(() => {
    if (!toDt && !props.checkedRows?.length > 1) setToDtError("This field is required.");
    else setToDtError("");
  }, [toDt, props.checkedRows]);

  const fetchData = async () => {
    if (props.checkedRows?.length > 1) {
      setSector1(""); setSector2(""); setACFTType(""); setVariant("");
      setBlockTime(""); setStd(""); setSta(""); setGCD(""); setPaxCapacity(""); 
      setCargoCapT(""); setPaxLfPercent(""); setCargoLfPercent(""); setFromDt(""); setToDt("");
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5001/sectorsbyid/${DataId}`);
      const item = response.data;

      const formtEffFromDate = item.fromDt ? moment(item.fromDt).format("YYYY-MM-DD") : "";
      const formtEfftoDate = item.toDt ? moment(item.toDt).format("YYYY-MM-DD") : "";
      
      setSector1(item.sector1 || "");
      setSector2(item.sector2 || "");
      setACFTType(item.acftType || "");
      setVariant(item.variant || "");
      setBlockTime(item.bt || "");
      setStd(item.std || "");
      setSta(item.sta || "");
      setGCD(item.gcd || "");
      setPaxCapacity(item.paxCapacity || "");
      setCargoCapT(item.CargoCapT || "");
      setPaxLfPercent(item.paxLF || "");
      setCargoLfPercent(item.cargoLF || "");
      setFromDt(formtEffFromDate);
      setToDt(formtEfftoDate);
    } catch (error) {
      console.error(error);
    }
  };

  function removeEmptyFields(productData) {
    for (const key in productData) {
      if (productData.hasOwnProperty(key) && (productData[key] === '' || productData[key] === null || productData[key] === undefined)) {
        delete productData[key];
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fromDt && !props.checkedRows?.length > 1) return setFromDtError("This field is required.");
    if (!toDt && !props.checkedRows?.length > 1) return setToDtError("This field is required.");

    if (
      sector1Error || sector2Error || gcdError || acftTypeError || variantError ||
      paxCapacityError || CargoCapTError || paxLFPercentError || cargoLFPercentError
    ) return;

    try {
      setLoading(true);

      const productData =  {
        sector1, sector2, acftType, variant, std, bt, sta, gcd,
        paxCapacity, CargoCapT, paxLF, cargoLF, fromDt, toDt,
      };

      removeEmptyFields(productData);

      if (Object.keys(productData).length === 0) {
        toast.error("All fields are empty");
        setLoading(false);
        return; 
      }

      const response = await axios.put(
        `http://localhost:5001/update-sectore/${productId}`,
        productData,
        { headers: { "Content-Type": "application/json", "x-access-token": `${localStorage.getItem("accessToken")}` } }
      );

      if (response.status === 200) {
        setLoading(false);
        toast.success("Update successful!");
        setTimeout(() => { window.location.reload(); }, 2000);
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400) toast.error("Already exist");
      else toast.error("An error occurred while processing your request.");
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={PenLine}
        onClick={() => {
          if (!props.checkedRows || props.checkedRows.length === 0) {
            toast.warning("Please select at least one row to update.");
            return;
          }
          setOpenUpdateModal(true);
          fetchData();
        }}
      >
        Update
      </Button>

      <AnimatePresence>
        {openUpdateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { handleClose(); setOpenUpdateModal(false); }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-5xl h-fit max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 custom-scrollbar"
            >
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                    Update Sector
                  </h3>
                  {props.checkedRows?.length > 1 && (
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Updating {props.checkedRows.length} sectors. Disabled fields cannot be bulk-edited.
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => { handleClose(); setOpenUpdateModal(false); setLoading(false); }}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Dep Stn" error={sector1Error}>
                    <input className={baseInputStyles} name="sector1" disabled required={isRequired} value={sector1} onChange={handleSector1} placeholder="VI89" />
                  </InputGroup>
                  
                  <InputGroup label="Arr Stn" error={sector2Error}>
                    <input className={baseInputStyles} name="sector2" disabled required={isRequired} value={sector2} onChange={handleSector2} placeholder="VIDP" />
                  </InputGroup>

                  <InputGroup label="GCD" error={gcdError}>
                    <input className={baseInputStyles} type="number" required={isRequired} value={gcd} onChange={handleGCD} placeholder="0 - 20000" />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="STD (LT)">
                    <input className={baseInputStyles} type="time" disabled required={isRequired} value={std} onChange={handleSTD} />
                  </InputGroup>
                  <InputGroup label="Block Time (BT)" error={btError}>
                    <input className={baseInputStyles} type="time" name="bt" disabled required={isRequired} value={bt} onChange={handleBlockTime} />
                  </InputGroup>
                  <InputGroup label="STA (LT) - Auto Calculated">
                    <input className={cn(baseInputStyles, "bg-indigo-50/50 dark:bg-indigo-900/20 font-bold")} type="time" value={sta} onChange={handleSTA} disabled />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="ACFT Type" error={acftTypeError}>
                    <input className={baseInputStyles} name="acftType" required={isRequired} value={acftType} onChange={handleACFT} placeholder="A330-200" />
                  </InputGroup>

                  <InputGroup label="Variant" error={variantError}>
                    <input className={baseInputStyles} name="variant" disabled required={isRequired} value={variant} onChange={handleVariant} placeholder="777300ER" />
                  </InputGroup>
                  
                  <InputGroup label="Pax Capacity" error={paxCapacityError}>
                    <input className={baseInputStyles} type="number" name="paxCapacity" required={isRequired} value={paxCapacity} onChange={handlePaxCapacity} placeholder="0-600" />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="Cargo Cap T" error={CargoCapTError}>
                    <input className={baseInputStyles} type="number" step="0.1" name="CargoCapT" required={isRequired} value={CargoCapT} onChange={handleCargoCapT} placeholder="150.0" />
                  </InputGroup>

                  <InputGroup label="Pax LF%" error={paxLFPercentError}>
                    <input className={baseInputStyles} type="number" name="paxLF" required={isRequired} value={paxLF} onChange={handlePaxPercent} placeholder="100" />
                  </InputGroup>

                  <InputGroup label="Cargo LF%" error={cargoLFPercentError}>
                    <input className={baseInputStyles} type="number" name="cargoLF" required={isRequired} value={cargoLF} onChange={handleCargoPercent} placeholder="100" />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputGroup label="From Dt" error={fromDtError}>
                    <input className={baseInputStyles} type="date" disabled required={isRequired} value={fromDt} onChange={handleFromDt} />
                  </InputGroup>

                  <InputGroup label="To Dt" error={toDtError}>
                    <input className={baseInputStyles} type="date" disabled required={isRequired} value={toDt} onChange={handleToDt} min={fromDt} />
                  </InputGroup>
                </div>

                <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => { handleClose(); setOpenUpdateModal(false); }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={loading}>
                    Save Changes
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

export default UpdateSectore;