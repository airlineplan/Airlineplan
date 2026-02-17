import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, Plane, Clock, LayoutDashboard, Download, Layers, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
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
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
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

// --- STATIC OPTIONS ---

const LABEL_OPTIONS = [{ label: "Dom", value: "dom" }, { label: "INTL", value: "intl" }, { label: "Both", value: "both" }];
const PERIODICITY_OPTIONS = [{ label: "Annually", value: "annually" }, { label: "Quarterly", value: "quarterly" }, { label: "Monthly", value: "monthly" }, { label: "Weekly", value: "weekly" }, { label: "Daily", value: "daily" }];
const METRIC_OPTIONS = [ { label: "Fuel Cost", value: "fuel_cost" }, { label: "Maintenance Cost", value: "maintenance_cost" }, { label: "Crew Cost", value: "crew_cost" }, { label: "Nav+Opt Cost", value: "nav_opt_cost" }, { label: "DOC", value: "doc" }, { label: "RASK", value: "rask" }, { label: "CASK", value: "cask" }, { label: "RRPK", value: "rrpk" }, { label: "CRPK", value: "crpk" }, { label: "PRev/Pax", value: "prev_pax" }, { label: "CRev/T", value: "crev_t" } ];
const GROUPING_OPTIONS = [ { label: "Dep Stn", value: "depStn" }, { label: "City-pair", value: "cityPair" }, { label: "Flight #", value: "flightNo" }, { label: "Aircraft", value: "aircraft" }, { label: "Rotation #", value: "rotation" } ];

// --- MAIN COMPONENT ---

const ListTable = () => {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [rawFlights, setRawFlights] = useState([]);

  // Dropdown options mapped from API
  const [dropdownOptions, setDropdownOptions] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: [], rotation: [], aircraft: []
  });

  // Filter Selection State
  const [filters, setFilters] = useState({
    label: LABEL_OPTIONS[2],
    periodicity: PERIODICITY_OPTIONS[3],
    metric: METRIC_OPTIONS[0],
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: [],
    rotation: [], aircraft: [],
    depTimeFrom: "", depTimeTo: "", arrTimeFrom: "", arrTimeTo: ""
  });

  // Hierarchy State
  const [level1, setLevel1] = useState(GROUPING_OPTIONS[0]); // Default: Dep Stn
  const [level2, setLevel2] = useState(GROUPING_OPTIONS[1]); // Default: City-pair
  const [level3, setLevel3] = useState(GROUPING_OPTIONS[2]); // Default: Flight #

  // --- API CALLS ---

  // 1. Fetch Dropdown Data (Matches Dashboard logic)
  useEffect(() => {
    const getDropdownData = async () => {
      try {
        const response = await axios.get(
          `https://airlinebackend-zfsg.onrender.com/dashboard/populateDropDowns`,
          { headers: { "x-access-token": localStorage.getItem("accessToken") } }
        );
        if (response.data && typeof response.data === 'object') {
          setDropdownOptions(prev => ({
            ...prev,
            from: Array.isArray(response.data.from) ? response.data.from : [],
            to: Array.isArray(response.data.to) ? response.data.to : [],
            sector: Array.isArray(response.data.sector) ? response.data.sector : [],
            variant: Array.isArray(response.data.variant) ? response.data.variant : [],
            userTag1: Array.isArray(response.data.userTag1) ? response.data.userTag1 : [],
            userTag2: Array.isArray(response.data.userTag2) ? response.data.userTag2 : [],
            rotation: Array.isArray(response.data.rotation) ? response.data.rotation : [], // Assuming backend can send this
            aircraft: Array.isArray(response.data.aircraft) ? response.data.aircraft : [], // Assuming backend can send this
          }));
        }
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
      }
    };
    getDropdownData();
  }, []);

  // 2. Fetch List Data based on filters
  const fetchListData = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      
      // Hit a dedicated endpoint that returns grouped columns and flat flight data matching filters
      const response = await axios.post(
        'https://airlinebackend-zfsg.onrender.com/list-page-data', 
        filters,
        { headers: { 'x-access-token': accessToken } }
      );
      
      // Expected backend response: { columns: ["01 Nov", "02 Nov"], flights: [{ depStn: 'JFK', ..., data: [100, 200] }] }
      setTableColumns(response.data.columns || []);
      setRawFlights(response.data.flights || []);

    } catch (error) {
      console.error('Error fetching list data:', error);
      toast.error('Failed to load list data');
      setTableColumns([]);
      setRawFlights([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch data whenever filters change
  useEffect(() => {
    fetchListData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); 

  // --- DATA PROCESSING ---

  // Dynamically compute the table data based on the chosen grouping order
  const tableData = useMemo(() => {
    if (!tableColumns.length || !rawFlights.length) return [];

    let result = [];
    let idCounter = 1;
    const hierarchyLevels = [level1, level2, level3].filter(Boolean);

    // Calculate sum for an array of flights mapped against the dynamic columns
    const sumFlightsData = (flights) => 
      flights.reduce((acc, f) => acc.map((val, i) => val + (f.data[i] || 0)), Array(tableColumns.length).fill(0));

    // 1. Add Network Root Row
    const totalData = sumFlightsData(rawFlights);
    result.push({ id: idCounter++, type: "Network", label: "Total Network", level: 0, data: totalData });

    // 2. Recursive function to group raw data
    const buildHierarchy = (flights, currentLevelIndex, parentIndentLevel) => {
      if (currentLevelIndex >= hierarchyLevels.length || flights.length === 0) return;
      
      const keyObj = hierarchyLevels[currentLevelIndex];
      const groupingKey = keyObj.value; 
      const typeLabel = keyObj.label;

      const grouped = flights.reduce((acc, f) => {
        const val = f[groupingKey] || "Unknown";
        if (!acc[val]) acc[val] = [];
        acc[val].push(f);
        return acc;
      }, {});

      for (const [groupName, groupFlights] of Object.entries(grouped)) {
        const groupSum = sumFlightsData(groupFlights);
        result.push({
          id: idCounter++,
          type: typeLabel,
          label: groupName,
          level: parentIndentLevel + 1,
          data: groupSum
        });
        buildHierarchy(groupFlights, currentLevelIndex + 1, parentIndentLevel + 1);
      }
    };

    buildHierarchy(rawFlights, 0, 0);
    return result;

  }, [level1, level2, level3, rawFlights, tableColumns]); 


  // --- EXPORT TO EXCEL ---
  const downloadExcel = () => {
    if (!tableData || tableData.length === 0) return toast.warn("No data available to export.");

    try {
      const headers = ["Hierarchy / Grouping", ...tableColumns];

      const excelRows = tableData.map((row) => {
        const indent = "    ".repeat(row.level);
        const prefix = row.level > 0 ? "↳ " : "";
        const hierarchyLabel = `${indent}${prefix}${row.label} [${row.type}]`;
        return [hierarchyLabel, ...row.data];
      });

      const worksheetData = [headers, ...excelRows];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      const colWidths = [{ wch: 45 }]; 
      tableColumns.forEach(() => colWidths.push({ wch: 15 }));
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Flight List");

      XLSX.writeFile(wb, "List_Export.xlsx");
      toast.success("Excel exported successfully!");
    } catch (error) {
      console.error("Error exporting excel:", error);
      toast.error("Failed to export Excel file.");
    }
  };


  // --- HELPERS ---
  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  return (
    <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)]">
      
      {/* --- TOP FILTERS SECTION --- */}
      <div className="flex flex-col xl:flex-row gap-6 relative z-50">
        
        {/* BLOCK 1: Dashboard Filters & Metric */}
        <div className="w-full xl:w-[55%] p-5 rounded-xl border-2 border-emerald-400/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm relative">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <LayoutDashboard size={14} /> Replica of filters as in Dashboard page
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
             <SingleSelectDropdown placeholder="Label" options={LABEL_OPTIONS} selected={filters.label} onChange={(v) => updateFilter('label', v)} />
             <SingleSelectDropdown placeholder="Periodicity" options={PERIODICITY_OPTIONS} selected={filters.periodicity} onChange={(v) => updateFilter('periodicity', v)} />
             <MultiSelectDropdown placeholder="From" options={dropdownOptions.from} selected={filters.from} onChange={(v) => updateFilter('from', v)} />
             <MultiSelectDropdown placeholder="To" options={dropdownOptions.to} selected={filters.to} onChange={(v) => updateFilter('to', v)} />
             <MultiSelectDropdown placeholder="Sector" options={dropdownOptions.sector} selected={filters.sector} onChange={(v) => updateFilter('sector', v)} />
             <MultiSelectDropdown placeholder="Variant" options={dropdownOptions.variant} selected={filters.variant} onChange={(v) => updateFilter('variant', v)} />
             <MultiSelectDropdown placeholder="User Tag 1" options={dropdownOptions.userTag1} selected={filters.userTag1} onChange={(v) => updateFilter('userTag1', v)} />
             <MultiSelectDropdown placeholder="User Tag 2" options={dropdownOptions.userTag2} selected={filters.userTag2} onChange={(v) => updateFilter('userTag2', v)} />
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center gap-4">
             <label className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Metric
             </label>
             <div className="w-full sm:w-64">
                <SingleSelectDropdown placeholder="Select Metric..." options={METRIC_OPTIONS} selected={filters.metric} onChange={(v) => updateFilter('metric', v)} />
             </div>
          </div>
        </div>

        {/* BLOCK 2: Additional Multi-Selects */}
        <div className="w-full xl:w-[22.5%] p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 shadow-sm relative flex flex-col justify-center">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Additional Dropdowns
          </div>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
               <label className="xl:w-20 text-sm font-semibold text-slate-600 dark:text-slate-300">Rotation #</label>
               <MultiSelectDropdown placeholder="Select Rotations" options={dropdownOptions.rotation} selected={filters.rotation} onChange={(v) => updateFilter('rotation', v)} />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
               <label className="xl:w-20 text-sm font-semibold text-slate-600 dark:text-slate-300">Aircraft Regn</label>
               <MultiSelectDropdown placeholder="Select Aircraft" options={dropdownOptions.aircraft} selected={filters.aircraft} onChange={(v) => updateFilter('aircraft', v)} />
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
               <input type="time" value={filters.depTimeFrom} onChange={(e) => updateFilter('depTimeFrom', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
               <input type="time" value={filters.depTimeTo} onChange={(e) => updateFilter('depTimeTo', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
               <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Arr time<br/>(LT)</label>
               <input type="time" value={filters.arrTimeFrom} onChange={(e) => updateFilter('arrTimeFrom', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
               <input type="time" value={filters.arrTimeTo} onChange={(e) => updateFilter('arrTimeTo', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

      </div>

      {/* --- TABLE SECTION --- */}
      <div className="relative z-10 flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
           <div className="flex flex-col sm:flex-row sm:items-center gap-3">
             <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                <Layers size={16} className="text-indigo-500" /> Grouping Priority:
             </div>
             <div className="flex items-center gap-2">
                <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level1} onChange={setLevel1} /></div>
                <span className="text-slate-300 dark:text-slate-600 font-bold">&gt;</span>
                <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level2} onChange={setLevel2} /></div>
                <span className="text-slate-300 dark:text-slate-600 font-bold">&gt;</span>
                <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level3} onChange={setLevel3} /></div>
             </div>
           </div>

           <button 
             onClick={downloadExcel}
             disabled={loading}
             className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] disabled:opacity-50"
           >
             <Download size={16} /> Export to Excel
           </button>
        </div>

        {/* Hierarchical Table */}
        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
          
          {loading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50">
                <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading metrics...</span>
             </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[200px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                  <span className="sr-only">Hierarchy Header</span>
                </th>
                {tableColumns.map((col, idx) => (
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

                  {row.data.map((val, idx) => (
                    <td key={idx} className="p-3 border-r border-b border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                      {typeof val === 'number' ? val.toLocaleString() : val}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && tableData.length === 0 && (
                <tr>
                   <td colSpan={tableColumns.length + 1} className="p-6 text-center text-slate-500 font-medium italic">
                      No data available for the selected criteria.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default ListTable;