import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, Plane, Clock, LayoutDashboard, Download } from "lucide-react";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CUSTOM UI COMPONENTS (From DashboardContext) ---

const MultiSelectDropdown = ({ placeholder, options = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
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
    if (selectedOptions.some(item => item.value === opt.value)) {
      newSelected = selectedOptions.filter(item => item.value !== opt.value);
    } else {
      newSelected = [...selectedOptions, opt];
    }
    setSelectedOptions(newSelected);
    if (onChange) onChange(newSelected);
  };

  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        )}
      >
        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
          {selectedOptions.length > 0 ? `${selectedOptions.length} selected` : placeholder}
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform ml-2", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {safeOptions.map((opt) => {
              const isSelected = selectedOptions.some(s => s.value === opt.value);
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
            {safeOptions.length === 0 && <div className="p-3 text-sm text-slate-400 text-center">No options</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SingleSelectDropdown = ({ placeholder, options = [], onChange, selected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(selected);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    setSelectedOption(opt);
    setIsOpen(false);
    if (onChange) onChange(opt);
  };

  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        )}
      >
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform ml-2", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {safeOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt)}
                className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
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

// --- MOCK DATA FOR DROPDOWNS & TABLE ---

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

const METRIC_OPTIONS = [
  { label: "Fuel Cost", value: "fuel_cost" },
  { label: "Maintenance Cost", value: "maintenance_cost" },
  { label: "Crew Cost", value: "crew_cost" },
  { label: "Nav+Opt Cost", value: "nav_opt_cost" },
  { label: "DOC", value: "doc" },
  { label: "RASK", value: "rask" },
  { label: "CASK", value: "cask" },
  { label: "RRPK", value: "rrpk" },
  { label: "CRPK", value: "crpk" },
  { label: "PRev/Pax", value: "prev_pax" },
  { label: "CRev/T", value: "crev_t" }
];

const MOCK_AIRCRAFT = [{ label: "N101AA", value: "N101AA" }, { label: "N102BB", value: "N102BB" }];
const MOCK_ROTATION = [{ label: "ROT-01", value: "ROT-01" }, { label: "ROT-02", value: "ROT-02" }];

// Mock Hierarchical Data for the Table
const MOCK_TABLE_DATA = [
  { id: "1", type: "Network", label: "Total Network", level: 0, data: [15420, 15800, 16100, 15900, 16500, 17000] },
  { id: "2", type: "Dep Stn", label: "JFK", level: 1, data: [5000, 5200, 5150, 5300, 5400, 5500] },
  { id: "3", type: "City-pair", label: "JFK-LHR", level: 2, data: [2000, 2100, 2050, 2150, 2200, 2250] },
  { id: "4", type: "Flight #", label: "FL100", level: 3, data: [1000, 1050, 1025, 1075, 1100, 1125] },
  { id: "5", type: "Flight #", label: "FL102", level: 3, data: [1000, 1050, 1025, 1075, 1100, 1125] },
  { id: "6", type: "City-pair", label: "JFK-LAX", level: 2, data: [3000, 3100, 3100, 3150, 3200, 3250] },
  { id: "7", type: "Flight #", label: "FL200", level: 3, data: [3000, 3100, 3100, 3150, 3200, 3250] },
  { id: "8", type: "Dep Stn", label: "LAX", level: 1, data: [4000, 4100, 4200, 4150, 4300, 4400] },
  { id: "9", type: "City-pair", label: "LAX-HND", level: 2, data: [4000, 4100, 4200, 4150, 4300, 4400] },
  { id: "10", type: "Flight #", label: "FL300", level: 3, data: [4000, 4100, 4200, 4150, 4300, 4400] }
];

const DUMMY_COLUMNS = ["01 Nov", "02 Nov", "03 Nov", "04 Nov", "05 Nov", "06 Nov"];

// --- MAIN COMPONENT ---

const ListTable = () => {
  return (
    <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)]">
      
      {/* --- TOP FILTERS SECTION --- */}
      {/* relative z-50 ensures dropdowns overlap the table below */}
      <div className="flex flex-col xl:flex-row gap-6 relative z-50">
        
        {/* BLOCK 1: Dashboard Filters & Metric (Green Outline in Wireframe) */}
        {/* Uses w-full xl:w-1/2 to comfortably fit all 8 dashboard filters + metric */}
        <div className="w-full xl:w-[55%] p-5 rounded-xl border-2 border-emerald-400/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm relative">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <LayoutDashboard size={14} /> Filters
          </div>
          
          {/* All 8 Dashboard Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
             <SingleSelectDropdown placeholder="Label" options={LABEL_OPTIONS} />
             <SingleSelectDropdown placeholder="Periodicity" options={PERIODICITY_OPTIONS} />
             <MultiSelectDropdown placeholder="From" />
             <MultiSelectDropdown placeholder="To" />
             <MultiSelectDropdown placeholder="Sector" />
             <MultiSelectDropdown placeholder="Variant" />
             <MultiSelectDropdown placeholder="User Tag 1" />
             <MultiSelectDropdown placeholder="User Tag 2" />
          </div>

          {/* Metric Filter Sectioned at the bottom */}
          <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center gap-4">
             <label className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Metric
             </label>
             <div className="w-full sm:w-64">
                <SingleSelectDropdown 
                   placeholder="Select Metric..." 
                   options={METRIC_OPTIONS} 
                />
             </div>
          </div>
        </div>

        {/* BLOCK 2: Additional Multi-Selects */}
        <div className="w-full xl:w-[22.5%] p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 shadow-sm relative flex flex-col justify-center">
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
               <label className="xl:w-20 text-sm font-semibold text-slate-600 dark:text-slate-300">Rotation #</label>
               <MultiSelectDropdown placeholder="Select Rotations" options={MOCK_ROTATION} />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
               <label className="xl:w-20 text-sm font-semibold text-slate-600 dark:text-slate-300">Aircraft Regn</label>
               <MultiSelectDropdown placeholder="Select Aircraft" options={MOCK_AIRCRAFT} />
            </div>
          </div>
        </div>

        {/* BLOCK 3: Time Filters */}
        <div className="w-full xl:w-[22.5%] p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <Clock className="absolute -right-4 -bottom-4 text-slate-100 dark:text-slate-800" size={100} />
          
          <div className="relative z-10 w-full">
            {/* Headers row for From / To */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 mb-2">
               <div></div> {/* Empty Top Left */}
               <div className="text-xs font-bold text-slate-500 text-center">From</div>
               <div className="text-xs font-bold text-slate-500 text-center">To</div>
            </div>

            {/* Departure Row */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center mb-4">
               <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Dep time<br/>(LT)</label>
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
            </div>

            {/* Arrival Row */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
               <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Arr time<br/>(LT)</label>
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

      </div>

      {/* --- TABLE SECTION --- */}
      {/* z-10 ensures it stays behind the dropdown menus */}
      <div className="relative z-10 flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Table Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
           <div className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
             (all flights meeting filter criteria)
           </div>
           <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700">
             <Download size={16} /> Export
           </button>
        </div>

        {/* Hierarchical Table */}
        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[200px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                  <span className="sr-only">Hierarchy Header</span>
                </th>
                {DUMMY_COLUMNS.map((col, idx) => (
                  <th key={idx} className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[120px] text-center text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="bg-white/50 dark:bg-slate-900/50">
              {MOCK_TABLE_DATA.map((row) => (
                <tr 
                  key={row.id} 
                  className={cn(
                    "group transition-colors",
                    row.level === 0 ? "bg-slate-100/50 dark:bg-slate-800/40" : "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                  )}
                >
                  {/* Sticky Hierarchy Row Labels */}
                  <td 
                    className={cn(
                      "sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-r border-b border-slate-200 dark:border-slate-800 p-3 text-sm shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-indigo-50/90 dark:group-hover:bg-indigo-900/90",
                      row.level === 0 && "font-bold text-slate-800 dark:text-slate-100 bg-slate-50/95 dark:bg-slate-800/95",
                      row.level === 1 && "font-semibold text-slate-700 dark:text-slate-200 pl-8",
                      row.level === 2 && "font-medium text-slate-600 dark:text-slate-300 pl-14",
                      row.level === 3 && "text-slate-500 dark:text-slate-400 pl-20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         {row.level === 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                         {row.type === "Flight #" && <Plane size={14} className="text-indigo-400" />}
                         {row.label}
                       </div>
                       
                       {/* Subtle label denoting row type (Network/Dep Stn/etc) */}
                       <span className="text-[10px] uppercase tracking-wider opacity-40 ml-4">
                          {row.type}
                       </span>
                    </div>
                  </td>

                  {/* Dynamic Data Columns */}
                  {row.data.map((val, idx) => (
                    <td key={idx} className="p-3 border-r border-b border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                      {val.toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default ListTable;