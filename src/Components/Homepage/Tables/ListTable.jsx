import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, Plane, Clock, LayoutDashboard, Download, Layers } from "lucide-react";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
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
          {selected ? selected.label : placeholder}
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

const LABEL_OPTIONS = [{ label: "Dom", value: "dom" }, { label: "INTL", value: "intl" }, { label: "Both", value: "both" }];
const PERIODICITY_OPTIONS = [{ label: "Annually", value: "annually" }, { label: "Quarterly", value: "quarterly" }, { label: "Monthly", value: "monthly" }, { label: "Weekly", value: "weekly" }, { label: "Daily", value: "daily" }];
const METRIC_OPTIONS = [ { label: "Fuel Cost", value: "fuel_cost" }, { label: "Maintenance Cost", value: "maintenance_cost" }, { label: "Crew Cost", value: "crew_cost" }, { label: "Nav+Opt Cost", value: "nav_opt_cost" }, { label: "DOC", value: "doc" }, { label: "RASK", value: "rask" }, { label: "CASK", value: "cask" }, { label: "RRPK", value: "rrpk" }, { label: "CRPK", value: "crpk" }, { label: "PRev/Pax", value: "prev_pax" }, { label: "CRev/T", value: "crev_t" } ];
const MOCK_AIRCRAFT = [{ label: "N101AA", value: "N101AA" }, { label: "N102BB", value: "N102BB" }];
const MOCK_ROTATION = [{ label: "ROT-01", value: "ROT-01" }, { label: "ROT-02", value: "ROT-02" }];

const GROUPING_OPTIONS = [
  { label: "Dep Stn", value: "depStn" },
  { label: "City-pair", value: "cityPair" },
  { label: "Flight #", value: "flightNo" },
  { label: "Aircraft", value: "aircraft" },
  { label: "Rotation #", value: "rotation" }
];

const DUMMY_COLUMNS = ["01 Nov", "02 Nov", "03 Nov", "04 Nov", "05 Nov", "06 Nov"];

// Raw unstructured flights. The component will group them based on user selection.
const RAW_FLIGHTS = [
  { depStn: "JFK", cityPair: "JFK-LHR", flightNo: "FL100", aircraft: "N101AA", rotation: "ROT-01", data: [1000, 1050, 1025, 1075, 1100, 1125] },
  { depStn: "JFK", cityPair: "JFK-LHR", flightNo: "FL102", aircraft: "N102BB", rotation: "ROT-02", data: [1000, 1050, 1025, 1075, 1100, 1125] },
  { depStn: "JFK", cityPair: "JFK-LAX", flightNo: "FL200", aircraft: "N101AA", rotation: "ROT-01", data: [3000, 3100, 3100, 3150, 3200, 3250] },
  { depStn: "LAX", cityPair: "LAX-HND", flightNo: "FL300", aircraft: "N103CC", rotation: "ROT-03", data: [4000, 4100, 4200, 4150, 4300, 4400] },
  { depStn: "LAX", cityPair: "LAX-HND", flightNo: "FL302", aircraft: "N102BB", rotation: "ROT-02", data: [2000, 2050, 2100, 2150, 2200, 2250] },
];

// --- MAIN COMPONENT ---

const ListTable = () => {
  // State for grouping hierarchy
  const [level1, setLevel1] = useState(GROUPING_OPTIONS[0]); // Default: Dep Stn
  const [level2, setLevel2] = useState(GROUPING_OPTIONS[1]); // Default: City-pair
  const [level3, setLevel3] = useState(GROUPING_OPTIONS[2]); // Default: Flight #

  // Dynamically compute the table data based on the chosen grouping order
  const tableData = useMemo(() => {
    let result = [];
    let idCounter = 1;
    const hierarchyLevels = [level1, level2, level3].filter(Boolean); // Ignore unselected if any

    // Calculate sum for an array of flights
    const sumFlightsData = (flights) => 
      flights.reduce((acc, f) => acc.map((val, i) => val + (f.data[i] || 0)), Array(DUMMY_COLUMNS.length).fill(0));

    // 1. Add Network Root Row
    const totalData = sumFlightsData(RAW_FLIGHTS);
    result.push({ id: idCounter++, type: "Network", label: "Total Network", level: 0, data: totalData });

    // 2. Recursive function to group raw data based on selected hierarchy levels
    const buildHierarchy = (flights, currentLevelIndex, parentIndentLevel) => {
      if (currentLevelIndex >= hierarchyLevels.length || flights.length === 0) return;
      
      const keyObj = hierarchyLevels[currentLevelIndex];
      const groupingKey = keyObj.value; // e.g., 'aircraft' or 'depStn'
      const typeLabel = keyObj.label;

      // Group current list of flights by the current hierarchy key
      const grouped = flights.reduce((acc, f) => {
        const val = f[groupingKey] || "Unknown";
        if (!acc[val]) acc[val] = [];
        acc[val].push(f);
        return acc;
      }, {});

      // For each group, calculate the summed data, push the row, and then group its children
      for (const [groupName, groupFlights] of Object.entries(grouped)) {
        const groupSum = sumFlightsData(groupFlights);
        result.push({
          id: idCounter++,
          type: typeLabel,
          label: groupName,
          level: parentIndentLevel + 1,
          data: groupSum
        });

        // Recursively group the next level deeper
        buildHierarchy(groupFlights, currentLevelIndex + 1, parentIndentLevel + 1);
      }
    };

    buildHierarchy(RAW_FLIGHTS, 0, 0);
    return result;

  }, [level1, level2, level3]); // Recompute whenever the user changes the dropdowns


  // --- EXPORT TO EXCEL LOGIC ---
  const downloadExcel = () => {
    if (!tableData || tableData.length === 0) {
      toast.warn("No data available to export.");
      return;
    }

    try {
      // 1. Prepare Header Row
      const headers = ["Hierarchy / Grouping", ...DUMMY_COLUMNS];

      // 2. Prepare Data Rows with visual indentation to match UI
      const excelRows = tableData.map((row) => {
        // Create an indentation string based on the level (4 spaces per level)
        const indent = "    ".repeat(row.level);
        
        // Add a visual arrow for child rows, similar to the UI
        const prefix = row.level > 0 ? "↳ " : "";
        
        // Combine the label and the row type (e.g., "    ↳ FL100 [Flight #]")
        const hierarchyLabel = `${indent}${prefix}${row.label} [${row.type}]`;
        
        // Return the formatted row array
        return [hierarchyLabel, ...row.data];
      });

      // 3. Combine headers and rows
      const worksheetData = [headers, ...excelRows];

      // 4. Create Workbook and Worksheet
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-size columns (Make the first column wide enough for the hierarchy)
      const colWidths = [{ wch: 45 }]; // Hierarchy column
      DUMMY_COLUMNS.forEach(() => colWidths.push({ wch: 15 })); // Data columns
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Flight List");

      // 5. Trigger File Download
      XLSX.writeFile(wb, "List.xlsx");
      toast.success("Excel exported successfully!");

    } catch (error) {
      console.error("Error exporting excel:", error);
      toast.error("Failed to export Excel file.");
    }
  };


  return (
    <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)]">
      
      {/* --- TOP FILTERS SECTION --- */}
      <div className="flex flex-col xl:flex-row gap-6 relative z-50">
        
        {/* BLOCK 1: Dashboard Filters & Metric */}
        <div className="w-full xl:w-[55%] p-5 rounded-xl border-2 border-emerald-400/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm relative">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <LayoutDashboard size={14} /> Filters
          </div>
          
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

          <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center gap-4">
             <label className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Metric
             </label>
             <div className="w-full sm:w-64">
                <SingleSelectDropdown placeholder="Select Metric..." options={METRIC_OPTIONS} />
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
            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 mb-2">
               <div></div>
               <div className="text-xs font-bold text-slate-500 text-center">From</div>
               <div className="text-xs font-bold text-slate-500 text-center">To</div>
            </div>

            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center mb-4">
               <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Dep time<br/>(LT)</label>
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
               <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Arr time<br/>(LT)</label>
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
               <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

      </div>

      {/* --- TABLE SECTION --- */}
      <div className="relative z-10 flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Table Toolbar (Added Dynamic Hierarchy Grouping Controls Here) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
           
           <div className="flex flex-col sm:flex-row sm:items-center gap-3">
             <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                <Layers size={16} className="text-indigo-500" /> Grouping Priority:
             </div>
             
             {/* The 3 dropdowns allowing user to set their custom order */}
             <div className="flex items-center gap-2">
                <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level1} onChange={setLevel1} /></div>
                <span className="text-slate-300 dark:text-slate-600 font-bold">&gt;</span>
                <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level2} onChange={setLevel2} /></div>
                <span className="text-slate-300 dark:text-slate-600 font-bold">&gt;</span>
                <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level3} onChange={setLevel3} /></div>
             </div>
           </div>

           {/* Export Button connected to downloadExcel */}
           <button 
             onClick={downloadExcel}
             className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
           >
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
              {tableData.map((row) => (
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
              {tableData.length === 0 && (
                <tr>
                   <td colSpan={DUMMY_COLUMNS.length + 1} className="p-6 text-center text-slate-500 font-medium">
                      No data available for the selected criteria.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Toast notifications container */}
      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default ListTable;