import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Download, ChevronDown, Check,
  BarChart3, RefreshCw
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CUSTOM UI COMPONENTS (Replacing React-Select & MUI) ---

// Custom MultiSelect that behaves exactly like react-select (emits array of objects)
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

  // Safe fallback if options isn't an array
  const safeOptions = Array.isArray(options) ? options : [];

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
          {selectedOptions.length > 0 ? `${selectedOptions.length} selected` : placeholder}
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

// Custom SingleSelect that behaves exactly like react-select (emits object)
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
    <div className="relative w-48 lg:w-64" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        )}
      >
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
          {selectedOption ? selectedOption.label : placeholder}
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
            {safeOptions.map((opt) => (
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

const DashboardTable = (props) => {
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

  const [selectedValues, setSelectedValues] = useState({
    label: singleSelectLabelOptions[2],
    periodicity: singleSelectPeriodicityOptions[3]
  });

  const [multiSelectValues, setMultiSelectValues] = useState({
    from: [], to: [], sector: [], variant: [], userTag1: [], userTag2: [],
  });

  // --- API CALLS ---
  useEffect(() => {
    const getDropdownData = async () => {
      try {
        const response = await axios.get(
          `https://airlineplan.com/dashboard/populateDropDowns`,
          { headers: { "x-access-token": `${localStorage.getItem("accessToken")}`, "Content-Type": "application/json" } }
        );

        if (response.data && typeof response.data === 'object') {
          setMultiSelectValues({
            from: Array.isArray(response.data.from) ? response.data.from : [],
            to: Array.isArray(response.data.to) ? response.data.to : [],
            sector: Array.isArray(response.data.sector) ? response.data.sector : [],
            variant: Array.isArray(response.data.variant) ? response.data.variant : [],
            userTag1: Array.isArray(response.data.userTag1) ? response.data.userTag1 : [],
            userTag2: Array.isArray(response.data.userTag2) ? response.data.userTag2 : [],
          });
        }
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
      }
    };
    getDropdownData();
  }, []);

  const fetchData = async (selected = null, fieldName = null) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");

      let updatedValues = { ...selectedValues };
      if (selected && fieldName) {
        updatedValues = { ...selectedValues, [fieldName]: selected };
        setSelectedValues(updatedValues);
      }

      const response = await axios.get('https://airlineplan.com/dashboard', {
        params: updatedValues,
        headers: { 'x-access-token': accessToken },
      });

      if (Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setData([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- DOWNLOAD LOGIC ---
  const transformData = () => {
    // 💡 NEW: Added "ft: 'FT'" next to BH to include it in the downloaded Excel sheet
    const propertyMappings = {
      destinations: 'Destinations', departures: 'Departures', seats: 'Seats', pax: 'Pax',
      paxSF: 'Pax SF', paxLF: 'Pax LF', cargoCapT: 'Cargo Ton Capacity', cargoT: 'Cargo Tons',
      ct2ctc: 'Cargo Tons/Cargo Ton Capacity', cftk2atk: 'Cargo FTK/Cargo ATK',
      bh: 'BH', fh: 'FH',
      waslgcd: 'Weighted average stage length per FLGT by GCD', waslbh: 'Weighted average stage length per FLGT by BH',
      adu: 'Average Daily Utilisation', asks: 'ASKs (Mn)', rsks: 'RSKs (Mn)',
      cargoAtk: 'Cargo ATKs (Thousands)', cargoRtk: 'Cargo FTKs (Thousands)',
    };

    const properties = Object.keys(propertyMappings);
    const uniqueDates = Array.from(new Set(data.map(item => item.endDate)));

    var newData = [['']];

    function formatExcelDate(inputDate) {
      var date = new Date(inputDate);
      var options = { year: '2-digit', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
    }

    for (var i = 0; i < uniqueDates.length; i++) {
      var formattedDate = formatExcelDate(uniqueDates[i]);
      newData[0].push(formattedDate);
    }

    properties.forEach(property => {
      newData.push([propertyMappings[property], ...uniqueDates.map(date => {
        const matchingData = data.find(item => item.endDate === date);
        switch (property) {
          case 'waslgcd': return (matchingData && matchingData.departures) ? (matchingData.sumOfGcd / matchingData.departures).toFixed(2) : '';
          case 'waslbh': return (matchingData && matchingData.departures) ? (matchingData.bh / matchingData.departures).toFixed(2) : '';
          case 'asks': return (matchingData) ? (matchingData.sumOfask / 1000000).toFixed(2) : '';
          case 'rsks': return (matchingData) ? (matchingData.sumOfrsk / 1000000).toFixed(2) : '';
          case 'cargoAtk': return (matchingData) ? (matchingData.sumOfcargoAtk / 1000).toFixed(2) : '';
          case 'cargoRtk': return (matchingData) ? (matchingData.sumOfcargoRtk / 1000).toFixed(2) : '';
          default: return matchingData ? matchingData[property] : '';
        }
      })]);
    });

    return newData;
  }

  const downloadDashboardTable = async () => {
    if (!data || data.length === 0) return toast.warn("No data to download");
    const newData = transformData();

    const transformedData = newData.map((row, rowIndex) => {
      if (rowIndex === 0) return row;
      return row.map((value, colIndex) => {
        if (colIndex === 0) return value;
        const numValue = parseFloat((typeof value === 'string') ? parseFloat(value.replace(/,/g, '')) : value);
        return isNaN(numValue) ? value : numValue;
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(transformedData);
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: R };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (ws[cellRef]) {
          ws[cellRef].s = { alignment: { horizontal: 'center', vertical: 'center' } };
        }
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DashboardTable');
    XLSX.writeFile(wb, 'dashboard_table.xlsx');
  }

  // --- RENDER HELPERS ---
  const formatHeaderDate = (inputDate) => {
    const date = new Date(inputDate);
    if (isNaN(date)) return " --------- ";
    const day = String(date.getDate()).padStart(2, '0');
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    const year = String(date.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  // 💡 NEW: Added `{ label: "FT", ... }` immediately below BH for the UI Table
  const TABLE_ROWS = [
    { label: "Destinations", render: (item) => item?.destinations ? item.destinations : " " },
    { label: "Departures", render: (item) => item?.departures ? item.departures : " " },
    { isSpacer: true },
    { label: "Seats", render: (item) => item?.seats ? item.seats : " " },
    { isSpacer: true },
    { label: "Pax", render: (item) => item?.pax ? item.pax : " " },
    { label: "Pax SF", render: (item) => item?.paxSF != null ? (isNaN(item.paxSF) ? "N/A" : item.paxSF + "%") : " " },
    { label: "Pax LF", render: (item) => item?.paxLF != null ? (isNaN(item.paxLF) ? "N/A" : item.paxLF + "%") : " " },
    { isSpacer: true },
    { label: "Cargo Ton Capacity", render: (item) => item?.cargoCapT ? item.cargoCapT : " " },
    { label: "Cargo Tons", render: (item) => item?.cargoT ? item.cargoT : " " },
    { label: "Cargo Tons/Cargo Ton Capacity", render: (item) => item?.ct2ctc != null ? (isNaN(item.ct2ctc) ? "N/A" : item.ct2ctc + "%") : " " },
    { label: "Cargo FTK/Cargo ATK", render: (item) => item?.cftk2atk != null ? (isNaN(item.cftk2atk) ? "N/A" : item.cftk2atk + "%") : " " },
    { isSpacer: true },
    { label: "BH", render: (item) => item?.bh ? Math.round(item.bh) : " " },
    { label: "FH", render: (item) => item?.fh ? Math.round(item.fh).toLocaleString() : " " },
    { isSpacer: true },
    { isHeader: true, label: "Weighted average stage length per FLGT" },
    { label: "by GCD", render: (item) => item?.departures ? (parseFloat(item.sumOfGcd) / parseFloat(item.departures)).toLocaleString("en-US", { maximumFractionDigits: 0 }) : " " },
    { label: "by BH", render: (item) => item?.departures ? (item.bh / item.departures).toFixed(2) : " " },
    { isSpacer: true },
    { label: "Average Daily Utilisation", render: (item) => item?.adu ? item.adu : " " },
    { label: "ASKs (Mn)", render: (item) => item?.sumOfask ? (parseFloat(item.sumOfask) / 1000000).toFixed(2) : " " },
    { label: "RSKs (Mn)", render: (item) => item?.sumOfrsk ? (parseFloat(item.sumOfrsk) / 1000000).toFixed(2) : " " },
    { label: "Cargo ATKs (Thousands)", render: (item) => item?.sumOfcargoAtk ? (parseFloat(item.sumOfcargoAtk) / 1000).toFixed(2) : " " },
    { label: "Cargo FTKs (Thousands)", render: (item) => item?.sumOfcargoRtk ? (parseFloat(item.sumOfcargoRtk) / 1000).toFixed(2) : " " },
  ];

  return (
    <div className="w-full p-6 space-y-6 relative pb-10">

      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-6 relative z-50">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex gap-4">
            <SingleSelectDropdown
              placeholder="Label"
              options={singleSelectLabelOptions}
              onChange={(selected) => fetchData(selected, "label")}
              selected={selectedValues.label}
            />
            <SingleSelectDropdown
              placeholder="Periodicity"
              options={singleSelectPeriodicityOptions}
              onChange={(selected) => fetchData(selected, "periodicity")}
              selected={selectedValues.periodicity}
            />
          </div>
        </div>

        {/* MULTI-SELECT GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
          <MultiSelectDropdown placeholder="From" options={multiSelectValues.from} onChange={(v) => fetchData(v, "from")} />
          <MultiSelectDropdown placeholder="To" options={multiSelectValues.to} onChange={(v) => fetchData(v, "to")} />
          <MultiSelectDropdown placeholder="Sector" options={multiSelectValues.sector} onChange={(v) => fetchData(v, "sector")} />
          <MultiSelectDropdown placeholder="Variant" options={multiSelectValues.variant} onChange={(v) => fetchData(v, "variant")} />
          <MultiSelectDropdown placeholder="User Tag 1" options={multiSelectValues.userTag1} onChange={(v) => fetchData(v, "userTag1")} />
          <MultiSelectDropdown placeholder="User Tag 2" options={multiSelectValues.userTag2} onChange={(v) => fetchData(v, "userTag2")} />
        </div>

      </div>

      {/* TABLE SECTION */}
      <div className="relative z-10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px]">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={downloadDashboardTable}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
          >
            <Download size={16} />
            Download Excel
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading metrics...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-4 min-w-[250px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                    {/* Empty top-left cell */}
                  </th>
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
                {TABLE_ROWS.map((row, rowIdx) => {
                  if (row.isSpacer) {
                    return (
                      <tr key={`spacer-${rowIdx}`}>
                        <td colSpan={data.length + 1} className="h-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30"></td>
                      </tr>
                    );
                  }

                  if (row.isHeader) {
                    return (
                      <tr key={`header-${rowIdx}`} className="bg-slate-50/80 dark:bg-slate-800/80">
                        <td colSpan={data.length + 1} className="sticky left-0 p-3 text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                          {row.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`row-${rowIdx}`} className="group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                      <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-r border-b border-slate-200 dark:border-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] group-hover:bg-indigo-50/90 dark:group-hover:bg-indigo-900/90 transition-colors">
                        {row.label}
                      </td>
                      {data.map((colData, colIdx) => (
                        <td key={colIdx} className="p-3 border-r border-b border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                          {row.render(colData)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default DashboardTable;