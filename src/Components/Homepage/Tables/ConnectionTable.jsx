import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Link2, ChevronDown, Check, RefreshCw 
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CUSTOM UI COMPONENTS ---

const MultiSelectDropdown = ({ placeholder, options = [], onChange, selected = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt) => {
    let newSelected;
    if (selected.some(item => item.value === opt.value)) {
      newSelected = selected.filter(item => item.value !== opt.value);
    } else {
      newSelected = [...selected, opt];
    }
    if (onChange) onChange(newSelected);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        )}
      >
        <span className="text-slate-700 dark:text-slate-300 truncate">
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {options.map((opt) => {
              const isSelected = selected.some(s => s.value === opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt)}
                  className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors shrink-0",
                    isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 truncate">{opt.label}</span>
                </div>
              );
            })}
            {options.length === 0 && <div className="p-3 text-sm text-slate-400 text-center">No options</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SingleSelectDropdown = ({ placeholder, options = [], onChange, selected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    if (onChange) onChange(opt); // 🔥 FIX: Pass the entire object back, not just the string
    setIsOpen(false);
  };

  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="relative w-48 lg:w-64" ref={containerRef}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-2">{placeholder}:</span>
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between pl-16 pr-4 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        )}
      >
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
          {selected ? selected.label : "Select..."}
        </span>
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt)}
                className="flex items-center px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
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

// --- MAIN DASHBOARD COMPONENT ---

const ConnectionTable = () => {
  const singleSelectLabelOptions = [
    { label: "Dom", value: "dom" },
    { label: "INTL", value: "intl" },
    { label: "Both", value: "both" },
  ];

  const singleSelectPeriodicityOptions = [
    { label: "Annually", value: "annually" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Monthly", value: "monthly" },
    { label: "Weekly", value: "weekly" },
    { label: "Daily", value: "daily" },
  ];

  // --- STATE ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOptions, setDropdownOptions] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: [],
  });

  // 🔥 FIX: Store the entire object in state, just like DashboardTable.jsx
  const [selectedValues, setSelectedValues] = useState({ 
    label: singleSelectLabelOptions[2], 
    periodicity: singleSelectPeriodicityOptions[3] 
  });

  const [filters, setFilters] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: []
  });

  // --- API CALLS ---
  useEffect(() => {
    const getDropdownData = async () => {
      try {
        const response = await axios.get(
          `https://airlineplan.com/dashboard/populateDropDowns`,
          { headers: { "x-access-token": `${localStorage.getItem("accessToken")}`, "Content-Type": "application/json" } }
        );
        setDropdownOptions(response.data);
      } catch (error) {
        console.error("Dropdown fetch error:", error);
      }
    };
    getDropdownData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
  
      // 🔥 FIX: Pass the state objects directly. Axios GET will correctly stringify them.
      const params = {
        label: selectedValues.label,
        periodicity: selectedValues.periodicity,
        from: filters.from,
        to: filters.to,
        sector: filters.sector,
        variant: filters.variant,
        userTag1: filters.userTag1,
        userTag2: filters.userTag2
      };
  
      const response = await axios.get('https://airlineplan.com/createConnections', {
        params,
        headers: { 'x-access-token': accessToken },
      });
  
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load connection data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [selectedValues, filters]);

  const handleFilterChange = (key, selected) => {
    setFilters(prev => ({ ...prev, [key]: selected }));
  };

  const handleSingleSelectChange = (key, selectedOpt) => {
    setSelectedValues(prev => ({ ...prev, [key]: selectedOpt }));
  };

  // --- RENDER HELPERS ---
  
  const formatHeaderDate = (inputDate) => {
    if (!inputDate) return " ---------            ";
    const date = new Date(inputDate);
    if (isNaN(date)) return " ---------            ";
    const day = String(date.getDate()).padStart(2, '0');
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    const year = String(date.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  const TABLE_ROWS = [
    { label: "Connecting Flights", dataKey: "connectingFlights" },
    { label: "Seat Capacity on Beyond Flights", dataKey: "seatCapBeyondFlgts" },
    { label: "Seat Capacity on Behind Flights", dataKey: "seatCapBehindFlgts" },
    { label: "Cargo Capacity on Beyond Flights", dataKey: "cargoCapBeyondFlgts" },
    { label: "Cargo Capacity on Behind Flights", dataKey: "cargoCapBehindFlgts" }, // Note: You might want to check this key. It was duplicated in your original array.
  ];

  return (
    <div className="w-full h-full p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-6 relative z-50">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex gap-4">
            <SingleSelectDropdown
              placeholder="Label"
              options={singleSelectLabelOptions}
              onChange={(v) => handleSingleSelectChange('label', v)}
              selected={selectedValues.label}
            />
            <SingleSelectDropdown
              placeholder="Periodicity"
              options={singleSelectPeriodicityOptions}
              onChange={(v) => handleSingleSelectChange('periodicity', v)}
              selected={selectedValues.periodicity}
            />
          </div>
        </div>

        {/* MULTI-SELECT GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
          <MultiSelectDropdown placeholder="From" options={dropdownOptions.from} selected={filters.from} onChange={(v) => handleFilterChange("from", v)} />
          <MultiSelectDropdown placeholder="To" options={dropdownOptions.to} selected={filters.to} onChange={(v) => handleFilterChange("to", v)} />
          <MultiSelectDropdown placeholder="Sector" options={dropdownOptions.sector} selected={filters.sector} onChange={(v) => handleFilterChange("sector", v)} />
          <MultiSelectDropdown placeholder="Variant" options={dropdownOptions.variant} selected={filters.variant} onChange={(v) => handleFilterChange("variant", v)} />
          <MultiSelectDropdown placeholder="User Tag 1" options={dropdownOptions.userTag1} selected={filters.userTag1} onChange={(v) => handleFilterChange("userTag1", v)} />
          <MultiSelectDropdown placeholder="User Tag 2" options={dropdownOptions.userTag2} selected={filters.userTag2} onChange={(v) => handleFilterChange("userTag2", v)} />
        </div>

      </div>

      {/* TABLE SECTION */}
      <div className="relative z-10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[400px]">
        
        {/* Table Content */}
        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading connections...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-4 min-w-[280px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                    {/* Empty top-left cell */}
                  </th>
                  
                  {/* Dynamic Date Columns */}
                  {data.map((col, idx) => (
                    <th key={idx} className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[120px] text-center text-sm font-bold text-slate-800 dark:text-slate-200">
                      {formatHeaderDate(col?.endDate)}
                    </th>
                  ))}
                  
                  {data.length === 0 && (
                    <th className="p-4 text-center text-slate-400 font-normal italic">No data to display</th>
                  )}
                </tr>
              </thead>
              
              <tbody className="bg-white/50 dark:bg-slate-900/50">
                {TABLE_ROWS.map((row, rowIdx) => (
                  <tr key={`row-${rowIdx}`} className="group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                    
                    {/* Row Label */}
                    <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-r border-b border-slate-200 dark:border-slate-800 p-3 pl-4 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] group-hover:bg-indigo-50/90 dark:group-hover:bg-indigo-900/90 transition-colors">
                      {row.label}
                    </td>
                    
                    {/* Dynamic Data Cells */}
                    {data.map((colData, colIdx) => (
                      <td key={colIdx} className="p-3 border-r border-b border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400 tabular-nums font-medium">
                        {colData[row.dataKey] ? colData[row.dataKey] : " "}
                      </td>
                    ))}

                    {data.length === 0 && <td className="border-b border-slate-200 dark:border-slate-800"></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default ConnectionTable;