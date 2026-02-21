import React, { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import dayjs from "dayjs";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Save, Trash2, Plus, ArrowUp, ArrowDown, 
  Search, Clock, Plane, Calendar, ChevronRight, 
  ChevronLeft, AlertCircle, RotateCw, Loader2
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const addTime = (firstTime, secondTime) => {
  if (!firstTime || !secondTime) return "00:00";
  const [h1, m1] = firstTime.split(":").map(Number);
  const [h2, m2] = secondTime.split(":").map(Number);
  const totalMinutes = h1 * 60 + m1 + h2 * 60 + m2;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

// --- UI COMPONENTS ---

const Label = ({ children, required }) => (
  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

const StyledInput = ({ className, error, ...props }) => (
  <input
    className={cn(
      "w-full h-9 px-3 text-sm bg-white dark:bg-slate-800/50 border rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm",
      error 
        ? "border-red-400 focus:ring-red-400 bg-red-50 dark:bg-red-900/10" 
        : "border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 dark:text-slate-200",
      className
    )}
    {...props}
  />
);

const StyledSelect = ({ options, value, onChange, placeholder, className, ...props }) => (
  <div className="relative">
    <select
      value={value || ""}
      onChange={onChange}
      className={cn(
        "w-full h-9 pl-3 pr-8 text-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer text-slate-700 dark:text-slate-200",
        className
      )}
      {...props}
    >
      <option value="" disabled>{placeholder || "Select..."}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
    </div>
  </div>
);

const StatsCard = ({ label, value, icon: Icon, colorClass }) => (
  <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
    <div className="flex items-center gap-2">
      <div className={cn("p-1.5 rounded-lg", colorClass)}>
        <Icon size={14} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
    </div>
    <span className="text-sm font-bold text-slate-800 dark:text-white font-mono">{value}</span>
  </div>
);

// --- MAIN COMPONENT ---

const Rotations = () => {
  // --- STATE ---
  // Data & Tables
  const [flgtsTableData, setFlgtsTableData] = useState([]);
  const [rotationDevelopmentTableData, setRotationDevelopmentTableData] = useState([]);
  const [listOfVariant, setListOfVariant] = useState([]);
  const [listOfRotation, setListOfRotations] = useState([]);
  
  // Selection & Forms
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedRotation, setSelectedRotation] = useState("");
  const [rotationTag, setRotationTag] = useState("");
  const [effFromDate, setEffFromDate] = useState("");
  const [effToDate, setEffToDate] = useState("");
  const [dow, setDow] = useState("");
  
  // New Leg Inputs
  const [flight, setFlight] = useState("");
  const [depStn, setDepStn] = useState("");
  const [std, setStd] = useState("");
  const [bt, setBt] = useState("");
  const [sta, setSta] = useState("");
  const [arrStn, setArrStn] = useState("");
  const [gt, setGt] = useState("00:00");
  const [domIntl, setDomIntl] = useState("");
  
  // System State
  const [isLoading, setIsLoading] = useState(false);
  const [isPrevLoading, setIsPrevLoading] = useState(false);
  const [isRotationDeleting, setIsRotationDeleting] = useState(false);
  const [editable, setEditable] = useState(true);
  const [depCount, setDepCount] = useState(1);
  const [leftPanelError, setLeftPanelError] = useState(false);
  
  // Original Values for fallback
  const [originalDepStn, setOriginalDepStn] = useState("");
  const [originalStd, setOriginalStd] = useState("");

  // Filtering & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const RowsPerPage = 8;
  const [arrow, setArrow] = useState({ column: null, direction: "Up" });
  const [filter, setFilter] = useState({});

  const flightInputRef = useRef(null);

  // --- CALCULATIONS ---
  const totalBt = useMemo(() => {
    const totalMinutes = rotationDevelopmentTableData.reduce((total, item) => {
      if (item.bt && /^\d{2}:\d{2}$/.test(item.bt)) {
        const [h, m] = item.bt.split(":").map(Number);
        return total + h * 60 + m;
      }
      return total;
    }, 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, [rotationDevelopmentTableData]);

  const totalGt = useMemo(() => {
    const totalMinutes = rotationDevelopmentTableData.reduce((total, item) => {
      if (item.gt && /^\d{2}:\d{2}$/.test(item.gt)) {
        const [h, m] = item.gt.split(":").map(Number);
        return total + h * 60 + m;
      }
      return total;
    }, 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, [rotationDevelopmentTableData]);

  // --- API & LOGIC HANDLERS ---

  useEffect(() => {
    // Initial Load
    const loadDropdowns = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const [varRes, rotRes] = await Promise.all([
          axios.get("https://airlineplan.com/listVariants", { headers: { "x-access-token": token } }),
          axios.get("https://airlineplan.com/listRotations", { headers: { "x-access-token": token } })
        ]);
        setListOfVariant(varRes.data);
        setListOfRotations(rotRes.data);
      } catch (e) { console.error(e); }
    };
    loadDropdowns();
  }, []);

  // Update STD/DepStn when table changes
  useEffect(() => {
    if (rotationDevelopmentTableData.length > 0) {
      const lastItem = rotationDevelopmentTableData[rotationDevelopmentTableData.length - 1];
      setStd(addTime(lastItem.sta, lastItem.gt));
      setDepStn(lastItem.arrStn);
      setOriginalDepStn(lastItem.arrStn); // Track original for fallback
      setOriginalStd(addTime(lastItem.sta, lastItem.gt));
    } else {
        setStd("");
        setDepStn("");
    }
  }, [rotationDevelopmentTableData]);

  const getFgtsWORotations = async () => {
    const lastObject = rotationDevelopmentTableData[rotationDevelopmentTableData.length - 1];
    let allowedDeptStn = lastObject ? lastObject.arrStn : "";
    let allowedStdLt = lastObject ? addTime(lastObject.sta, lastObject.gt) : "";

    const requestData = {
      allowedDeptStn,
      allowedStdLt,
      selectedVariant,
      effToDate,
      effFromDate,
      dow,
    };

    try {
      const res = await axios.post("https://airlineplan.com/flightsWoRotations", requestData, {
        headers: { "x-access-token": localStorage.getItem("accessToken") }
      });
      setFlgtsTableData(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedRotation && selectedVariant && effFromDate && effToDate && dow) {
      setEditable(false);
      getFgtsWORotations();
    }
  }, [selectedRotation, selectedVariant, effFromDate, effToDate, rotationDevelopmentTableData]);

  const handleRotationChange = async (val) => {
    if (val === "new") {
      try {
        const res = await axios.get("https://airlineplan.com/getNextRotationNumber", {
          headers: { "x-access-token": localStorage.getItem("accessToken") }
        });
        setSelectedRotation(res.data.nextRotationNumber);
        setEffToDate(""); setEffFromDate(""); setDow("");
        setRotationDevelopmentTableData([]);
        setEditable(true);
      } catch (e) { console.error(e); }
    } else {
      try {
        const res = await axios.get(`https://airlineplan.com/rotationbyid/${val}`, {
          headers: { "x-access-token": localStorage.getItem("accessToken") }
        });
        const { rotationDetails, rotationSummary } = res.data;
        setRotationDevelopmentTableData(rotationDetails);
        setSelectedRotation(parseInt(val));
        setSelectedVariant(rotationSummary.variant);
        setEffFromDate(rotationSummary.effFromDt ? dayjs(rotationSummary.effFromDt).format("YYYY-MM-DD") : "");
        setEffToDate(rotationSummary.effToDt ? dayjs(rotationSummary.effToDt).format("YYYY-MM-DD") : "");
        setDow(rotationSummary.dow);
      } catch (e) { console.error(e); }
    }
  };

  const handleSave = async () => {
    if (!selectedRotation || !effFromDate || !effToDate || !dow || !selectedVariant) {
      setLeftPanelError(true);
      return;
    }
    try {
      await axios.post("https://airlineplan.com/updateRotationSummary", {
        rotationNumber: selectedRotation,
        rotationTag, effFromDate, effToDate, dow, selectedVariant
      }, { headers: { "x-access-token": localStorage.getItem("accessToken") } });
      setEditable(false);
      toast.success("Rotation saved successfully");
    } catch (e) { toast.error("Error saving rotation"); }
  };

  const handleAddCurrent = async () => {
    if (!effFromDate || !effToDate) {
      setLeftPanelError(true);
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post("https://airlineplan.com/addRotationDetailsFlgtChange", {
        rotationNumber: selectedRotation,
        depNumber: rotationDevelopmentTableData.length + 1,
        flightNumber: flight,
        depStn: depStn.trim() || originalDepStn,
        std: std.trim() || originalStd,
        bt, sta, arrStn, variant: selectedVariant, dow,
        effFromDate, effToDate, domIntl, gt
      }, { headers: { "x-access-token": localStorage.getItem("accessToken") } });

      if (res.status === 200 || res.status === 201) {
        toast.success("Leg added");
        setRotationDevelopmentTableData(prev => [...prev, {
            ...res.data.data, // Assuming API returns the created object or similar structure
            rotationNumber: selectedRotation,
            depNumber: rotationDevelopmentTableData.length + 1,
            flightNumber: flight,
            depStn: depStn.trim() || originalDepStn,
            std: std.trim() || originalStd,
            bt, sta, arrStn, variant: selectedVariant, dow, effFromDate, effToDate, domIntl, gt
        }]);
        // Reset Inputs
        setFlight(""); setBt(""); setSta(""); setArrStn(""); setDomIntl(""); setGt("00:00");
        flightInputRef.current?.focus();
      }
    } catch (e) { 
        toast.error(`Error adding leg: ${e.response?.data?.flightNumber || ''}`);
        flightInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRotation = async () => {
    setIsRotationDeleting(true);
    try {
      await axios.post("https://airlineplan.com/deleteCompleteRotation", {
        rotationNumber: selectedRotation,
        selectedVariant,
        totalDepNumber: rotationDevelopmentTableData.length
      }, { headers: { "x-access-token": localStorage.getItem("accessToken") } });
      
      toast.success("Rotation deleted");
      setTimeout(() => window.dispatchEvent(new Event("refreshData")), 1500);
    } catch (e) { console.error(e); } finally { setIsRotationDeleting(false); }
  };

  const handlePreviousInRotation = async () => {
    setIsPrevLoading(true);
    try {
        const lastObject = rotationDevelopmentTableData[rotationDevelopmentTableData.length - 1];
        let res;
        
        if(!lastObject) {
             res = await axios.post("https://airlineplan.com/deleteRotation", {
                rotationNumber: selectedRotation, selectedVariant
             }, { headers: { "x-access-token": localStorage.getItem("accessToken") } });
             if(res.status === 200) setTimeout(() => window.dispatchEvent(new Event("refreshData")), 2000);
        } else {
            res = await axios.post("https://airlineplan.com/deletePrevInRotation", {
                rotationNumber: selectedRotation, selectedVariant,
                depNumber: rotationDevelopmentTableData.length,
                _id: lastObject._id
            }, { headers: { "x-access-token": localStorage.getItem("accessToken") } });
            
            if(res.status === 200) {
                setRotationDevelopmentTableData(prev => prev.filter(i => i._id !== lastObject._id));
                toast.success("Previous leg deleted");
            }
        }
    } catch(e) { console.error(e); } finally { setIsPrevLoading(false); }
  };

  // --- TABLE HELPERS ---
  const handleFilterChange = (e) => setFilter({ ...filter, [e.target.name]: e.target.value });
  
  const sortedData = () => {
    if (!arrow.column) return flgtsTableData;
    return [...flgtsTableData].sort((a, b) => {
        const valA = String(a[arrow.column] || "");
        const valB = String(b[arrow.column] || "");
        return arrow.direction === "Up" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  };

  const paginatedData = sortedData()?.filter(row => {
      return Object.keys(filter).every(key => {
          if(!filter[key]) return true;
          const val = key === 'date' ? moment(row.date).format("DD-MMM-YY") : String(row[key] || "");
          return val.toLowerCase().includes(filter[key].toLowerCase());
      });
  })?.slice((currentPage - 1) * RowsPerPage, currentPage * RowsPerPage);

  const rotationOptions = useMemo(() => {
      const opts = listOfRotation.map(r => ({ label: r.label, value: r.value }));
      opts.unshift({ label: "New Rotation", value: "new" });
      return opts;
  }, [listOfRotation]);

  return (
    <div className="w-full h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950 p-4 font-sans flex gap-6 overflow-hidden">
      
      {/* --- LEFT PANEL: CONTROLS --- */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center gap-2 mb-2">
                <RotateCw className="text-indigo-500" size={20} />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Configuration</h2>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <div>
                    <Label>Variant</Label>
                    <StyledSelect 
                        options={listOfVariant.map(v => ({ label: v.label, value: v.value }))}
                        value={selectedVariant}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                        disabled={!editable && selectedRotation}
                    />
                </div>
                
                <div>
                    <Label>Rotation #</Label>
                    <StyledSelect 
                        options={rotationOptions}
                        value={selectedRotation}
                        onChange={(e) => handleRotationChange(e.target.value)}
                        placeholder="Select or Create New"
                    />
                </div>

                <div>
                    <Label>Rotation Tag</Label>
                    <StyledInput 
                        value={rotationTag}
                        onChange={(e) => setRotationTag(e.target.value)}
                        disabled={!editable}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label required>Eff From</Label>
                        <StyledInput 
                            type="date"
                            value={effFromDate}
                            onChange={(e) => setEffFromDate(e.target.value)}
                            error={leftPanelError && !effFromDate}
                            disabled={!editable}
                        />
                    </div>
                    <div>
                        <Label required>Eff To</Label>
                        <StyledInput 
                            type="date"
                            value={effToDate}
                            onChange={(e) => setEffToDate(e.target.value)}
                            error={leftPanelError && !effToDate}
                            disabled={!editable}
                        />
                    </div>
                </div>

                <div>
                    <Label required>Days (DoW)</Label>
                    <StyledInput 
                        value={dow}
                        onChange={(e) => setDow(e.target.value)}
                        error={leftPanelError && (!dow || isNaN(dow))}
                        placeholder="e.g. 1357"
                        disabled={!editable}
                    />
                </div>
            </div>

            {/* Stats Card */}
            <div className="mt-4 space-y-3">
                <StatsCard label="Total Block Time" value={totalBt} icon={Clock} colorClass="bg-blue-500" />
                <StatsCard label="Total Ground Time" value={totalGt} icon={Plane} colorClass="bg-amber-500" />
                <StatsCard label="Rotation Total" value={addTime(totalBt, totalGt)} icon={RotateCw} colorClass="bg-emerald-500" />
            </div>

            {/* Save Action */}
            {editable && (
                <button 
                    onClick={handleSave}
                    className="mt-auto w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <Save size={16} /> Save Config
                </button>
            )}
        </div>
      </div>

      {/* --- RIGHT PANEL: WORKSPACE --- */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* TOP: Rotation Development Table */}
        <div className="flex-1 flex flex-col bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden min-h-[300px]">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Plane className="text-emerald-500" size={18} /> Rotation Development
                </h3>
                <div className="flex gap-2">
                    <button onClick={handleDeleteRotation} disabled={isRotationDeleting} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1">
                        {isRotationDeleting ? <Loader2 className="animate-spin" size={14}/> : <Trash2 size={14}/>} Delete Rotation
                    </button>
                    <button onClick={handlePreviousInRotation} disabled={isPrevLoading} className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors">
                        {isPrevLoading ? "Deleting..." : "Delete Last Leg"}
                    </button>
                    <button onClick={handleAddCurrent} disabled={isLoading} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors flex items-center gap-1">
                        {isLoading ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14}/>} Add Leg
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shadow-sm">
                        <tr>
                            {["Dep #", "Flight #", "Dep Stn", "STD (LT)", "BT", "STA (LT)", "Arr Stn", "Dom/Intl", "GT"].map(h => (
                                <th key={h} className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rotationDevelopmentTableData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2 text-center text-xs text-slate-500">{idx + 1}</td>
                                <td className="p-2 text-center text-xs font-medium text-slate-800 dark:text-white">{row.flightNumber}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.depStn}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.std}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300 font-mono">{row.bt}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.sta}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.arrStn}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.domIntl}</td>
                                <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-300 font-mono">{row.gt}</td>
                            </tr>
                        ))}
                        {/* Input Row */}
                        {selectedRotation && (
                            <tr className="bg-indigo-50/30 dark:bg-indigo-900/10">
                                <td className="p-2 text-center text-xs font-bold text-indigo-600">{rotationDevelopmentTableData.length + 1}</td>
                                <td className="p-1"><StyledInput ref={flightInputRef} value={flight} onChange={e => setFlight(e.target.value)} placeholder="Flight#" className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput value={depStn} onChange={e => setDepStn(e.target.value)} placeholder="Dep" className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput type="time" value={std} onChange={e => setStd(e.target.value)} className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput type="time" value={bt} onChange={e => setBt(e.target.value)} className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput type="time" value={sta} onChange={e => setSta(e.target.value)} className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput value={arrStn} onChange={e => setArrStn(e.target.value)} placeholder="Arr" className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput value={domIntl} onChange={e => setDomIntl(e.target.value)} placeholder="D/I" className="h-7 text-xs text-center" /></td>
                                <td className="p-1"><StyledInput type="time" value={gt} onChange={e => setGt(e.target.value)} className="h-7 text-xs text-center" /></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* BOTTOM: Unassigned Flights Table */}
        <div className="flex-1 flex flex-col bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden min-h-[300px]">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Search className="text-blue-500" size={18} /> Flights not assigned to a roation
                </h3>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shadow-sm">
                        <tr>
                            <th className="p-3 text-center w-12">#</th>
                            {['date', 'day', 'flight', 'depStn', 'std', 'bt', 'sta', 'arrStn', 'variant'].map(key => (
                                <th key={key} className="p-2 min-w-[80px]">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-indigo-600" onClick={() => { setArrow({ column: key, direction: arrow.direction === 'Up' ? 'Down' : 'Up' }) }}>
                                            {key.toUpperCase()}
                                            {arrow.column === key && (arrow.direction === 'Up' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                        </div>
                                        <input 
                                            name={key}
                                            value={filter[key] || ""}
                                            onChange={handleFilterChange}
                                            placeholder="Filter"
                                            className="w-full h-6 px-1 text-[10px] border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedData?.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-2 text-center text-xs text-slate-500">{(currentPage - 1) * RowsPerPage + idx + 1}</td>
                                <td className="p-2 text-center text-xs whitespace-nowrap">{moment(row.date).format("DD-MMM-YY")}</td>
                                <td className="p-2 text-center text-xs">{row.day}</td>
                                <td className="p-2 text-center text-xs font-medium">{row.flight}</td>
                                <td className="p-2 text-center text-xs">{row.depStn}</td>
                                <td className="p-2 text-center text-xs">{row.std}</td>
                                <td className="p-2 text-center text-xs font-mono">{row.bt}</td>
                                <td className="p-2 text-center text-xs">{row.sta}</td>
                                <td className="p-2 text-center text-xs">{row.arrStn}</td>
                                <td className="p-2 text-center text-xs">{row.variant}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronLeft size={16}/></button>
                <span className="text-xs font-medium self-center text-slate-600">Page {currentPage}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={paginatedData?.length < RowsPerPage} className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronRight size={16}/></button>
            </div>
        </div>

      </div>
      
      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default Rotations;