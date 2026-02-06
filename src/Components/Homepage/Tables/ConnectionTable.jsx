import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Link2, Calendar, ChevronDown, Check, 
  Search, Filter, Loader2, RefreshCw 
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONFIGURATION ---
const METRICS = [
  { id: 'connectingFlights', label: 'Connecting Flights' },
  { id: 'seatCapBeyondFlgts', label: 'Seat Capacity (Beyond)' },
  { id: 'seatCapBehindFlgts', label: 'Seat Capacity (Behind)' },
  { id: 'cargoCapBeyondFlgts', label: 'Cargo Capacity (Beyond)' },
  { id: 'cargoCapBehindFlgts', label: 'Cargo Capacity (Behind)' },
];

const LABEL_OPTIONS = [
  { label: "Dom", value: "dom" },
  { label: "INTL", value: "intl" },
  { label: "Both", value: "both" },
];

const PERIODICITY_OPTIONS = [
  { label: "Annually", value: "annually" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
];

// --- CUSTOM COMPONENTS ---

const MultiSelect = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    const newSelected = selected.some(item => item.value === value)
      ? selected.filter(item => item.value !== value)
      : [...selected, options.find(opt => opt.value === value)];
    onChange(newSelected);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all duration-200 bg-white dark:bg-slate-800",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        )}
      >
        <div className="flex flex-col items-start truncate pr-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium truncate w-full text-left">
            {selected.length > 0 ? `${selected.length} selected` : "All"}
          </span>
        </div>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
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
                  onClick={() => toggleOption(opt.value)}
                  className="flex items-center px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors flex-shrink-0",
                    isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 truncate">{opt.label}</span>
                </div>
              );
            })}
            {options.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">No options</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SingleSelect = ({ label, options, value, onChange }) => (
  <div className="relative group min-w-[140px]">
    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-2">{label}:</span>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none pl-14 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 font-medium cursor-pointer hover:border-slate-400 transition-colors shadow-sm"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

// --- MAIN COMPONENT ---

const ConnectionTable = () => {
  // --- STATE ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: []
  });

  // Filters
  const [label, setLabel] = useState(LABEL_OPTIONS[2].value); // 'both'
  const [periodicity, setPeriodicity] = useState(PERIODICITY_OPTIONS[3].value); // 'weekly'
  const [filters, setFilters] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: []
  });

  // --- API CALLS ---

  // 1. Fetch Dropdown Options on Mount
  useEffect(() => {
    const getDropdownData = async () => {
      try {
        const response = await axios.get(`https://airlineplan.com/dashboard/populateDropDowns`, {
          headers: { "x-access-token": localStorage.getItem("accessToken") },
        });
        setDropdownOptions(response.data);
      } catch (e) {
        console.error("Dropdown fetch error", e);
      }
    };
    getDropdownData();
  }, []);

  // 2. Fetch Main Data on Filter Change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          label,
          periodicity,
          from: filters.from,
          to: filters.to,
          sector: filters.sector,
          variant: filters.variant,
          userTag1: filters.userTag1,
          userTag2: filters.userTag2
        };

        const response = await axios.get('https://airlineplan.com/fetchConnectionsData', {
          params,
          headers: { 'x-access-token': localStorage.getItem("accessToken") },
        });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching connection data:', error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [label, periodicity, filters]);

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  // --- HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return isNaN(date) ? "-" : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).format(date);
  };

  return (
    <div className="w-full h-full p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
      
      {/* --- HEADER & CONTROLS --- */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 flex items-center gap-2">
              <Link2 className="text-indigo-500" />
              Connection Analysis
            </h1>
            <p className="text-slate-500 text-sm mt-1">Analyze connectivity and capacity across your network.</p>
          </div>
          
          <div className="flex gap-3">
             <SingleSelect label="Label" options={LABEL_OPTIONS} value={label} onChange={setLabel} />
             <SingleSelect label="Period" options={PERIODICITY_OPTIONS} value={periodicity} onChange={setPeriodicity} />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
          <MultiSelect label="From" options={dropdownOptions.from} selected={filters.from} onChange={(v) => handleFilterChange('from', v)} />
          <MultiSelect label="To" options={dropdownOptions.to} selected={filters.to} onChange={(v) => handleFilterChange('to', v)} />
          <MultiSelect label="Sector" options={dropdownOptions.sector} selected={filters.sector} onChange={(v) => handleFilterChange('sector', v)} />
          <MultiSelect label="Variant" options={dropdownOptions.variant} selected={filters.variant} onChange={(v) => handleFilterChange('variant', v)} />
          <MultiSelect label="User Tag 1" options={dropdownOptions.userTag1} selected={filters.userTag1} onChange={(v) => handleFilterChange('userTag1', v)} />
          <MultiSelect label="User Tag 2" options={dropdownOptions.userTag2} selected={filters.userTag2} onChange={(v) => handleFilterChange('userTag2', v)} />
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[400px]">
        
        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-20">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">Updating connections...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {/* Sticky Metric Column Header */}
                  <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-200 dark:border-slate-700 p-4 min-w-[250px] text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} /> Date / Metric
                    </div>
                  </th>
                  {/* Dynamic Date Columns */}
                  {data.map((col, idx) => (
                    <th key={idx} className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 p-3 min-w-[120px] text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatDate(col.endDate)}
                    </th>
                  ))}
                  {data.length === 0 && (
                    <th className="p-8 text-center text-slate-400 italic font-normal">No data available for current filters.</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {METRICS.map((metric) => (
                  <tr key={metric.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Row Label */}
                    <td className="sticky left-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-r border-slate-200 dark:border-slate-800 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 transition-colors">
                      {metric.label}
                    </td>
                    
                    {/* Row Data Cells */}
                    {data.map((item, idx) => {
                      const val = item[metric.id];
                      return (
                        <td key={idx} className="p-3 text-center text-sm text-slate-600 dark:text-slate-400 font-mono">
                          {val !== null && val !== undefined ? val : "-"}
                        </td>
                      );
                    })}
                    {data.length === 0 && <td></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer info (Optional) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] text-slate-400 text-right">
            Connection data is aggregated based on selected periodicity.
        </div>
      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}

export default ConnectionTable;