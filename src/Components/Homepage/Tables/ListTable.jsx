import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, LayoutDashboard, Download, Layers, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Helper to parse "HH:MM" -> Decimal (e.g., "02:15" -> 2.25)
const parseDurationToDecimal = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours + (minutes / 60);
};

// Generates a standard YYYY-MM-DD key to ensure chronological sorting
const getPeriodSortKey = (dateStr, periodicity) => {
  if (!dateStr) return "Unknown";

  let d = new Date(dateStr);

  // Fallback for DD-MM-YYYY
  if (
    isNaN(d.getTime()) &&
    typeof dateStr === "string" &&
    dateStr.split("-").length === 3
  ) {
    const parts = dateStr.split("-");
    if (parts[2].length === 4) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }

  if (isNaN(d.getTime())) return "Unknown";

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  switch (periodicity) {
    case "annually":
      return `${year}-12-31`;

    case "monthly": {
      const lastDay = new Date(year, month, 0);
      const mm = String(lastDay.getMonth() + 1).padStart(2, "0");
      const dd = String(lastDay.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }

    case "quarterly": {
      const q = Math.ceil(month / 3);
      const lastMonthOfQ = q * 3;
      const lastDay = new Date(year, lastMonthOfQ, 0);
      const mm = String(lastMonthOfQ).padStart(2, "0");
      const dd = String(lastDay.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }

    case "weekly": {
      // Week ending Sunday
      const dayOfWeek = d.getDay(); // 0 = Sunday
      const diffToSunday = 7 - dayOfWeek;
      const weekEnd = new Date(d);
      weekEnd.setDate(d.getDate() + (dayOfWeek === 0 ? 0 : diffToSunday));

      const mm = String(weekEnd.getMonth() + 1).padStart(2, "0");
      const dd = String(weekEnd.getDate()).padStart(2, "0");

      return `${weekEnd.getFullYear()}-${mm}-${dd}`;
    }

    case "daily": {
      const mm = String(month).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }

    default:
      return `${year}-${String(month).padStart(2, "0")}-01`;
  }
};

// Formats the YYYY-MM-DD sort key into display headers like "28-Feb-26"
const formatPeriodKey = (sortKey, periodicity) => {
  if (sortKey === "Unknown") return sortKey;

  const d = new Date(sortKey);
  if (isNaN(d.getTime())) return sortKey;

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const yy = String(d.getFullYear()).slice(-2);

  if (periodicity === "annually") {
    return d.getFullYear().toString();
  }

  if (periodicity === "quarterly") {
    return `Q${Math.ceil((d.getMonth() + 1) / 3)}-${yy}`;
  }

  if (periodicity === "weekly") {
    // Calculate ISO week number
    const tempDate = new Date(d);
    tempDate.setHours(0, 0, 0, 0);

    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNo = Math.ceil(
      ((tempDate - yearStart) / 86400000 + 1) / 7
    );

    return `W${String(weekNo).padStart(2, "0")}-${yy}`;
  }

  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = months[d.getMonth()];
  return `${dd}-${mmm}-${yy}`;
};

// --- DROPDOWN COMPONENTS ---

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
const PERIODICITY_OPTIONS = [
  { label: "Annually", value: "annually" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },  
  { label: "Daily", value: "daily" }
];

const METRIC_OPTIONS = [
  { label: "Departures", value: "departures" },
  { label: "FH", value: "fh" },
  { label: "BH", value: "bh" },
  { label: "Seats", value: "seats" },
  { label: "Pax", value: "pax" },
  { label: "ASK", value: "ask" },
  { label: "RSK", value: "rsk" },
  { label: "ATK", value: "cargoAtk" },
  { label: "RTK", value: "cargoRtk" },
  { label: "Cargo Capacity", value: "CargoCapT" },
  { label: "Cargo T", value: "CargoT" }
];

const GROUPING_OPTIONS = [
  { label: "None", value: "none" }, // Null option to disable grouping layer
  { label: "Dep Stn", value: "depStn" },
  { label: "Arr Stn", value: "arrStn" },
  { label: "Sector", value: "sector" },
  { label: "Flight #", value: "flight" },
  { label: "Aircraft", value: "variant" },
  { label: "Rotation #", value: "rotationNumber" },
  { label: "Dom/Intl", value: "domIntl" }
];

// --- MAIN COMPONENT ---

const ListTable = () => {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [rawFlights, setRawFlights] = useState([]);

  // Dropdown options
  const [dropdownOptions, setDropdownOptions] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: [], rotation: [], aircraft: []
  });

  // Filters
  const [filters, setFilters] = useState({
    label: LABEL_OPTIONS[2], // Both
    periodicity: PERIODICITY_OPTIONS[2], // Monthly
    metric: METRIC_OPTIONS[0], // Departures
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: [],
    rotation: [], aircraft: [],
    depTimeFrom: "", depTimeTo: "", arrTimeFrom: "", arrTimeTo: ""
  });

  // Default tree sets level 3 to 'None' by default so it avoids unnecessary indentation
  const [level1, setLevel1] = useState(GROUPING_OPTIONS[4]); // Flight #
  const [level2, setLevel2] = useState(GROUPING_OPTIONS[5]); // Aircraft (variant)
  const [level3, setLevel3] = useState(GROUPING_OPTIONS[0]); // None

  // --- API CALLS ---

  useEffect(() => {
    const getDropdownData = async () => {
      try {
        const response = await axios.get(
          `https://airlinebackend-zfsg.onrender.com/dashboard/populateDropDowns`,
          { headers: { "x-access-token": localStorage.getItem("accessToken") } }
        );
        if (response.data) {
          setDropdownOptions(prev => ({
            ...prev,
            from: response.data.from || [],
            to: response.data.to || [],
            sector: response.data.sector || [],
            variant: response.data.variant || [],
            userTag1: response.data.userTag1 || [],
            userTag2: response.data.userTag2 || [],
            rotation: response.data.rotation || [],
            aircraft: response.data.aircraft || [],
          }));
        }
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
      }
    };
    getDropdownData();
  }, []);

  const fetchListData = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");

      const response = await axios.post(
        'https://airlinebackend-zfsg.onrender.com/list-page-data',
        filters,
        { headers: { 'x-access-token': accessToken } }
      );

      const flightsData = response.data.flights || response.data || [];
      setRawFlights(Array.isArray(flightsData) ? flightsData : []);

    } catch (error) {
      console.error('Error fetching list data:', error);
      setRawFlights([]);
      toast.error("Failed to load flight data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // --- PIVOT ALGORITHM (Memoized) ---

  const { tableColumns, tableData } = useMemo(() => {
    if (!rawFlights.length) {
      return { tableColumns: [], tableData: [] };
    }

    const periodicityVal = filters.periodicity.value;
    const periodSet = new Set();

    // ===============================
    // 1️⃣ PREPROCESS FLIGHTS
    // ===============================
    const processedFlights = rawFlights.map(f => {
      const pKey = getPeriodSortKey(f.date, periodicityVal);
      periodSet.add(pKey);

      let val = 0;
      const metricKey = filters.metric.value;

      // ---- Departures ----
      if (metricKey === "departures") {
        val = 1;
      }
      // ---- All Numeric Fields (dynamic handling for strings/decimals) ----
      else {
        const rawVal = f[metricKey];

        if (typeof rawVal === "number") {
          val = rawVal;
        }
        else if (typeof rawVal === "string") {
            if (rawVal.includes(":")) {
                val = parseDurationToDecimal(rawVal);
            } else {
                val = parseFloat(rawVal.replace(/,/g, "")) || 0;
            }
        }
        else {
          val = 0;
        }
      }

      return { ...f, _periodKey: pKey, _val: val };
    });

    // ===============================
    // 2️⃣ SORT PERIOD COLUMNS
    // ===============================
    const sortedColumns = Array.from(periodSet).sort();

    // Pre-build column index map (performance improvement)
    const columnIndexMap = {};
    sortedColumns.forEach((col, idx) => {
      columnIndexMap[col] = idx;
    });

    const getZeroArray = () => Array(sortedColumns.length).fill(0);

    // ===============================
    // 3️⃣ BUILD HIERARCHY LEVELS
    // ===============================
    const hierarchyLevels = [level1, level2, level3].filter(
      lvl => lvl && lvl.value !== "none"
    );

    let idCounter = 1;
    const finalRows = [];

    const buildTree = (subset, depth) => {
      if (depth >= hierarchyLevels.length) return false;

      const groupByField = hierarchyLevels[depth].value;
      const groupLabel = hierarchyLevels[depth].label;

      const groups = {};

      subset.forEach(f => {
        // EXACT EXCEL MATCH: If field is missing, label as "(blank)"
        const key = f[groupByField] && String(f[groupByField]).trim() !== "" ? f[groupByField] : "(blank)";
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      });

      const sortedKeys = Object.keys(groups).sort();

      sortedKeys.forEach(key => {
        const groupFlights = groups[key];
        const groupTotals = getZeroArray();

        // ---- Aggregate ----
        groupFlights.forEach(f => {
          const colIndex = columnIndexMap[f._periodKey];
          if (colIndex !== undefined) {
            groupTotals[colIndex] += f._val;
          }
        });

        // ---- Push Group Row ----
        finalRows.push({
          id: idCounter++,
          type: groupLabel,
          label: key,
          level: depth,
          data: groupTotals,
          isTotalRow: false
        });

        const hasChildren = buildTree(groupFlights, depth + 1);

        // ---- Push Total Row ----
        if (hasChildren || depth < hierarchyLevels.length - 1) {
          finalRows.push({
            id: idCounter++,
            type: "Total",
            label: `${key} Total`,
            level: depth,
            data: groupTotals,
            isTotalRow: true
          });
        }
      });

      return true;
    };

    buildTree(processedFlights, 0);

    // ===============================
    // 4️⃣ FORMAT NUMBERS & GRAND TOTAL
    // ===============================
    const decimalMetrics = [
      "fh",
      "bh",
      "bt",
      "rsk",
      "cargoAtk",
      "cargoRtk",
      "CargoT"
    ];

    const isDecimalMetric = decimalMetrics.includes(filters.metric.value);

    // Calculate Grand Total from Level 0 items
    const grandTotals = getZeroArray();
    finalRows.forEach(row => {
        if (row.level === 0 && !row.isTotalRow) {
            row.data.forEach((val, idx) => {
                grandTotals[idx] += val;
            });
        }
    });

    // Format all rows
    const formattedRows = finalRows.map(row => ({
      ...row,
      data: row.data.map(val =>
        isDecimalMetric
          ? Number(val.toFixed(2))
          : Math.round(val)
      )
    }));

    // Append Grand Total
    formattedRows.push({
        id: "grand-total",
        type: "Grand Total",
        label: "Grand Total",
        level: 0,
        data: grandTotals.map(val => isDecimalMetric ? Number(val.toFixed(2)) : Math.round(val)),
        isTotalRow: true,
        isGrandTotal: true // Custom flag for styling
    });

    return {
      tableColumns: sortedColumns,
      tableData: formattedRows
    };

  }, [
    rawFlights,
    level1,
    level2,
    level3,
    filters.periodicity,
    filters.metric
  ]);


  // --- EXCEL EXPORT ---
  const downloadExcel = () => {
    if (!tableData || tableData.length === 0) return toast.warn("No data available to export.");
    try {
      // Map sort keys to pretty headers upon export
      const prettyHeaders = tableColumns.map(c => formatPeriodKey(c, filters.periodicity.value));
      const headers = ["Hierarchy / Grouping", ...prettyHeaders];
      const excelRows = tableData.map((row) => {
        const indent = "    ".repeat(row.level);
        const label = row.isTotalRow ? `${indent}${row.label}` : `${indent}${row.label}`;
        return [label, ...row.data];
      });
      const worksheetData = [headers, ...excelRows];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const colWidths = [{ wch: 45 }];
      tableColumns.forEach(() => colWidths.push({ wch: 15 }));
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pivot Data");
      XLSX.writeFile(wb, `List_Export.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export.");
    }
  };

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  return (
    <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)]">

      {/* --- TOP FILTERS --- */}
      <div className="flex flex-col xl:flex-row gap-6 relative z-50">
        <div className="w-full xl:w-[55%] p-5 rounded-xl border-2 border-emerald-400/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm relative">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <LayoutDashboard size={14} /> Filter Criteria
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
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Metric</label>
            <div className="w-full sm:w-64">
              <SingleSelectDropdown placeholder="Select Metric..." options={METRIC_OPTIONS} selected={filters.metric} onChange={(v) => updateFilter('metric', v)} />
            </div>
            <span className="text-xs text-slate-500 italic">
              {['fh', 'bh', 'bt'].includes(filters.metric.value) ? "(Calculated from duration in HH:MM format)" : ""}
            </span>
          </div>
        </div>

        {/* TIME FILTERS */}
        <div className="w-full xl:w-[22.5%] p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 shadow-sm relative flex flex-col justify-center">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Time Filters (Local)
          </div>
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center mt-2">
            <span className="text-xs font-bold text-slate-500"></span>
            <span className="text-xs font-bold text-slate-500 text-center">From</span>
            <span className="text-xs font-bold text-slate-500 text-center">To</span>

            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dep</span>
            <input type="time" value={filters.depTimeFrom} onChange={(e) => updateFilter('depTimeFrom', e.target.value)} className="w-full text-xs p-1 rounded border dark:bg-slate-900 dark:border-slate-700" />
            <input type="time" value={filters.depTimeTo} onChange={(e) => updateFilter('depTimeTo', e.target.value)} className="w-full text-xs p-1 rounded border dark:bg-slate-900 dark:border-slate-700" />

            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Arr</span>
            <input type="time" value={filters.arrTimeFrom} onChange={(e) => updateFilter('arrTimeFrom', e.target.value)} className="w-full text-xs p-1 rounded border dark:bg-slate-900 dark:border-slate-700" />
            <input type="time" value={filters.arrTimeTo} onChange={(e) => updateFilter('arrTimeTo', e.target.value)} className="w-full text-xs p-1 rounded border dark:bg-slate-900 dark:border-slate-700" />
          </div>
        </div>
      </div>

      {/* --- TABLE AREA --- */}
      <div className="relative z-10 flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Layers size={16} className="text-indigo-500" /> Grouping:
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level1} onChange={setLevel1} /></div>
              <span className="text-slate-300">&gt;</span>
              <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level2} onChange={setLevel2} /></div>
              <span className="text-slate-300">&gt;</span>
              <div className="w-32"><SingleSelectDropdown options={GROUPING_OPTIONS} selected={level3} onChange={setLevel3} /></div>
            </div>
          </div>
          <button onClick={downloadExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
            <Download size={14} /> Export
          </button>
        </div>

        {/* The Table */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50">
              <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
              <span className="text-sm font-medium text-slate-600">Loading...</span>
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[250px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] text-xs font-bold uppercase text-slate-500">
                  Month
                </th>
                {tableColumns.map((col, idx) => (
                  <th key={idx} className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[100px] text-center text-sm font-bold text-slate-800 dark:text-slate-200">
                    {/* Format the key directly on render */}
                    {formatPeriodKey(col, filters.periodicity.value)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white/50 dark:bg-slate-900/50">
              {tableData.map((row) => (
                <tr key={row.id} className={cn(
                    "group transition-colors", 
                    row.isTotalRow ? "bg-slate-100 dark:bg-slate-800 font-semibold" : "hover:bg-indigo-50/50 dark:hover:bg-slate-800/30",
                    row.isGrandTotal && "bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-500/30"
                )}>
                  <td className={cn(
                    "sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-r border-b border-slate-200 dark:border-slate-800 p-3 text-sm shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]",
                    row.isTotalRow ? "bg-slate-100/95 dark:bg-slate-800/95" : "group-hover:bg-indigo-50/90 dark:group-hover:bg-slate-800/90",
                    row.isGrandTotal && "bg-emerald-50/95 dark:bg-emerald-900/95 text-emerald-700 dark:text-emerald-400 font-black",
                    !row.isTotalRow && row.level === 0 && "font-bold text-slate-800 dark:text-slate-100 bg-slate-50/50",
                    !row.isTotalRow && row.level === 1 && "pl-8 font-semibold text-slate-700",
                    !row.isTotalRow && row.level === 2 && "pl-14 font-medium text-slate-600",
                    row.isTotalRow && !row.isGrandTotal && "pl-4 italic"
                  )}>
                    <div className="flex items-center gap-2">
                      {!row.isTotalRow && row.level === 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      {row.label}
                    </div>
                  </td>
                  {row.data.map((val, idx) => (
                    <td key={idx} className={cn(
                      "p-3 border-r border-b border-slate-200 dark:border-slate-800 text-center text-sm tabular-nums",
                      row.isTotalRow ? "font-bold text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400",
                      row.isGrandTotal && "text-emerald-700 dark:text-emerald-400 font-black"
                    )}>
                      {val.toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && tableData.length === 0 && (
                <tr><td colSpan={tableColumns.length + 1} className="p-6 text-center text-slate-500 italic">No data found.</td></tr>
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