import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "../../../apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, LayoutDashboard, Download, Layers, RefreshCw, PlusCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import CostInputModal from "./CostInputModal";

// --- UTILITIES ---

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const getPeriodSortKey = (dateStr, periodicity) => {
    if (!dateStr) return "Unknown";
    let d = new Date(dateStr);
    if (isNaN(d.getTime()) && typeof dateStr === "string" && dateStr.split("-").length === 3) {
        const parts = dateStr.split("-");
        if (parts[2].length === 4) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    if (isNaN(d.getTime())) return "Unknown";

    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    switch (periodicity) {
        case "annually": return `${year}-12-31`;
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
            const dayOfWeek = d.getDay();
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
        default: return `${year}-${String(month).padStart(2, "0")}-01`;
    }
};

const formatHeaderDate = (inputDate) => {
    const date = new Date(inputDate);
    if (isNaN(date)) return " --------- ";
    const day = String(date.getDate()).padStart(2, '0');
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    const year = String(date.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
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
        if (opt.disabled) return;
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
                    "w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
                    isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                )}
            >
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                    {selected.length > 0 ? `${selected.length} selected` : placeholder}
                </span>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform ml-2 shrink-0", isOpen && "rotate-180")} />
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
                                    className={cn(
                                        "flex items-center px-3 py-2 text-sm transition-colors",
                                        opt.disabled
                                            ? "cursor-not-allowed opacity-50"
                                            : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors shrink-0",
                                        opt.disabled
                                            ? "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                            : isSelected
                                                ? "bg-indigo-500 border-indigo-500"
                                                : "border-slate-300 dark:border-slate-600"
                                    )}>
                                        {isSelected && !opt.disabled && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className={cn(
                                        "truncate",
                                        opt.disabled ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {opt.label}
                                    </span>
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
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform ml-2 shrink-0", isOpen && "rotate-180")} />
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

// --- STATIC OPTIONS FOR COST PAGE ---

const LABEL_OPTIONS = [{ label: "Dom", value: "dom" }, { label: "INTL", value: "intl" }, { label: "Both", value: "both" }];
const PERIODICITY_OPTIONS = [
    { label: "Annual", value: "annually" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Monthly", value: "monthly" },
    { label: "Weekly", value: "weekly" },
    { label: "Daily", value: "daily" }
];

const COST_TYPE_OPTIONS = [
    { label: "Engine Fuel Cost", value: "engineFuelCostRCCY" },
    { label: "APU Fuel Cost", value: "apuFuelCostRCCY" },
    { label: "Maintenance Reserve Contribution", value: "maintenanceReserveContributionRCCY" },
    { label: "MR Monthly", value: "mrMonthlyRCCY" },
    { label: "Qualifying Sch Mx Events", value: "qualifyingSchMxEventsRCCY" },
    { label: "Transit Maintenance", value: "transitMaintenanceRCCY" },
    { label: "Other Maintenance", value: "otherMaintenanceRCCY" },
    { label: "Other Mx Expenses", value: "otherMxExpensesRCCY" },
    { label: "Rotable changes", value: "rotableChangesRCCY" },
    { label: "Navigation", value: "navigationRCCY" },
    { label: "Airport", value: "airportRCCY" },
    { label: "Crew allowances", value: "crewAllowancesRCCY" },
    { label: "Layover Cost", value: "layoverCostRCCY" },
    { label: "Crew positioning", value: "crewPositioningCostRCCY" },
    { label: "Other DOC", value: "otherDocRCCY" }
];

const GROUPING_OPTIONS = [
    { label: "None", value: "none" },
    { label: "Sector", value: "sector" },
    { label: "Dep Stn", value: "depStn" },
    { label: "Arr Stn", value: "arrStn" },
    { label: "Variant", value: "variant" },
    { label: "Flight #", value: "flight" },
    { label: "ACFT Regn", value: "acftRegn" },
    { label: "SN", value: "sn" }
];

// --- MAIN COMPONENT ---

const CostPage = () => {
    // --- STATE ---
    const [loading, setLoading] = useState(false);
    const [rawFlights, setRawFlights] = useState([]);
    const [isCostInputOpen, setIsCostInputOpen] = useState(false);

    const [dropdownOptions, setDropdownOptions] = useState({
        from: [], to: [], sector: [], sn: [], flight: [], variant: [], userTag1: [], userTag2: []
    });

    const [filters, setFilters] = useState({
        label: LABEL_OPTIONS[2],
        periodicity: PERIODICITY_OPTIONS[2],
        from: [], to: [], sector: [], sn: [], flight: [], variant: [], userTag1: [], userTag2: [],
        costTypes: []
    });

    const [level1, setLevel1] = useState(GROUPING_OPTIONS[1]); // Sector
    const [level2, setLevel2] = useState(GROUPING_OPTIONS[4]); // Variant
    const [level3, setLevel3] = useState(GROUPING_OPTIONS[0]); // None

    const isSnSelected = filters.sn.length > 0;
    const isSnGroupingSelected = [level1, level2, level3].some((level) => level?.value === "sn");
    const lockCostCategories = isSnSelected || isSnGroupingSelected;
    const costCategoryOptions = useMemo(() => {
        const lockedValues = new Set([
            "engineFuelCostRCCY",
            "apuFuelCostRCCY",
            "navigationRCCY",
            "airportRCCY",
            "crewAllowancesRCCY",
            "layoverCostRCCY",
            "crewPositioningCostRCCY",
            "otherDocRCCY"
        ]);
        return COST_TYPE_OPTIONS.map((option) => ({
            ...option,
            disabled: lockCostCategories && lockedValues.has(option.value),
        }));
    }, [lockCostCategories]);

    // --- API CALLS ---

    useEffect(() => {
        const getDropdownData = async () => {
            try {
                const response = await api.get(`/dashboard/populateDropDowns`);
                if (response.data) {
                    setDropdownOptions(prev => ({
                        ...prev,
                        from: response.data.from || [],
                        to: response.data.to || [],
                        sector: response.data.sector || [],
                        sn: response.data.sn || [],
                        flight: response.data.flight || [],
                        variant: response.data.variant || [],
                        userTag1: response.data.userTag1 || [],
                        userTag2: response.data.userTag2 || [],
                    }));
                }
            } catch (error) {
                console.error("Error fetching dropdowns:", error);
            }
        };
        getDropdownData();
    }, []);

    const fetchCostData = async () => {
        try {
            setLoading(true);
            const response = await api.post('/cost-page-data', filters);
            const flightsData = response.data.flights || response.data || [];
            setRawFlights(Array.isArray(flightsData) ? flightsData : []);
        } catch (error) {
            console.error('Error fetching cost data:', error);
            setRawFlights([]);
            toast.error("Failed to load cost data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCostData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    // --- PIVOT ALGORITHM (Memoized) ---

    const { tableColumns, tableData } = useMemo(() => {
        if (!rawFlights.length) {
            return { tableColumns: [], tableData: [] };
        }

        const periodicityVal = filters.periodicity.value;
        const periodSet = new Set();

        const processedFlights = rawFlights.map(f => {
            const pKey = getPeriodSortKey(f.date, periodicityVal);
            periodSet.add(pKey);

            let val = 0;
            if (filters.costTypes && filters.costTypes.length > 0) {
                filters.costTypes.forEach(costType => {
                    const rawVal = f[costType.value];
                    if (typeof rawVal === "number") {
                        val += rawVal;
                    } else if (typeof rawVal === "string") {
                        val += parseFloat(rawVal.replace(/,/g, "")) || 0;
                    }
                });
            }

            return { ...f, _periodKey: pKey, _val: val };
        });

        const sortedColumns = Array.from(periodSet).sort();
        const columnIndexMap = {};
        sortedColumns.forEach((col, idx) => { columnIndexMap[col] = idx; });
        const getZeroArray = () => Array(sortedColumns.length).fill(0);

        const hierarchyLevels = [level1, level2, level3].filter(lvl => lvl && lvl.value !== "none");
        let idCounter = 1;
        const finalRows = [];

        const buildTree = (subset, depth) => {
            if (depth >= hierarchyLevels.length) return false;
            const groupByField = hierarchyLevels[depth].value;
            const groupLabel = hierarchyLevels[depth].label;
            const groups = {};

            subset.forEach(f => {
                const key = f[groupByField] && String(f[groupByField]).trim() !== "" ? f[groupByField] : "(blank)";
                if (!groups[key]) groups[key] = [];
                groups[key].push(f);
            });

            const sortedKeys = Object.keys(groups).sort();

            sortedKeys.forEach(key => {
                const groupFlights = groups[key];
                const groupTotals = getZeroArray();

                groupFlights.forEach(f => {
                    const colIndex = columnIndexMap[f._periodKey];
                    if (colIndex !== undefined) {
                        groupTotals[colIndex] += f._val;
                    }
                });

                finalRows.push({
                    id: idCounter++,
                    type: groupLabel,
                    label: key,
                    level: depth,
                    data: groupTotals,
                    isTotalRow: false
                });

                buildTree(groupFlights, depth + 1);
            });
            return true;
        };

        buildTree(processedFlights, 0);

        const grandTotals = getZeroArray();
        finalRows.forEach(row => {
            if (row.level === 0 && !row.isTotalRow) {
                row.data.forEach((val, idx) => {
                    grandTotals[idx] += val;
                });
            }
        });

        const formattedRows = finalRows.map(row => ({
            ...row,
            data: row.data.map(val => Number(val.toFixed(2)))
        }));

        formattedRows.unshift({
            id: "grand-total",
            type: "Grand Total",
            label: "Grand Total",
            level: 0,
            data: grandTotals.map(val => Number(val.toFixed(2))),
            isTotalRow: true,
            isGrandTotal: true
        });

        return {
            tableColumns: sortedColumns,
            tableData: formattedRows
        };

    }, [rawFlights, level1, level2, level3, filters.periodicity, filters.costTypes]);

    // --- EXCEL EXPORT ---
    const downloadExcel = () => {
        if (!tableData || tableData.length === 0) return toast.warn("No data available to export.");
        try {
            const prettyHeaders = tableColumns.map(c => formatHeaderDate(c));
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
            XLSX.utils.book_append_sheet(wb, ws, "Cost Data");
            XLSX.writeFile(wb, `Cost_Analysis_Export.xlsx`);
            toast.success("Excel exported successfully!");
        } catch (error) {
            console.error("Error exporting:", error);
            toast.error("Failed to export.");
        }
    };

    const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

    return (
        <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)]">

            {/* --- TOP HEADER & ACTIONS --- */}
            <div className="flex justify-between items-center w-full">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cost Analysis</h2>
                <button
                    onClick={() => setIsCostInputOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 font-medium"
                >
                    <PlusCircle size={16} /> Cost input
                </button>
            </div>

            {/* --- TOP FILTERS --- */}
            <div className="flex flex-col gap-6 relative z-50">
                <div className="w-full p-5 rounded-xl border-2 border-indigo-400/40 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm relative">
                    <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <LayoutDashboard size={14} /> Filter Criteria
                    </div>

                    <div className="flex flex-col gap-4 mt-2">

                        {/* Top Row: General Settings (Matches top wireframe layout) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            <SingleSelectDropdown placeholder="Label" options={LABEL_OPTIONS} selected={filters.label} onChange={(v) => updateFilter('label', v)} />
                            <SingleSelectDropdown placeholder="Periodicity" options={PERIODICITY_OPTIONS} selected={filters.periodicity} onChange={(v) => updateFilter('periodicity', v)} />
                        </div>

                        {/* Bottom Row: Detailed Dimensions (The inner blue box from wireframe with 8 fields) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 p-3 bg-white/40 dark:bg-slate-900/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-lg shadow-inner">
                            <MultiSelectDropdown placeholder="Dep Stn" options={dropdownOptions.from} selected={filters.from} onChange={(v) => updateFilter('from', v)} />
                            <MultiSelectDropdown placeholder="Arr Stn" options={dropdownOptions.to} selected={filters.to} onChange={(v) => updateFilter('to', v)} />
                            <MultiSelectDropdown placeholder="Sector" options={dropdownOptions.sector} selected={filters.sector} onChange={(v) => updateFilter('sector', v)} />
                            <MultiSelectDropdown placeholder="Variant" options={dropdownOptions.variant} selected={filters.variant} onChange={(v) => updateFilter('variant', v)} />
                            <MultiSelectDropdown placeholder="SN" options={dropdownOptions.sn} selected={filters.sn} onChange={(v) => updateFilter('sn', v)} />
                            <MultiSelectDropdown placeholder="Flight #" options={dropdownOptions.flight} selected={filters.flight} onChange={(v) => updateFilter('flight', v)} />
                            <MultiSelectDropdown placeholder="User Tag 1" options={dropdownOptions.userTag1} selected={filters.userTag1} onChange={(v) => updateFilter('userTag1', v)} />
                            <MultiSelectDropdown placeholder="User Tag 2" options={dropdownOptions.userTag2} selected={filters.userTag2} onChange={(v) => updateFilter('userTag2', v)} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 p-3 bg-white/40 dark:bg-slate-900/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-lg shadow-inner">
                            <MultiSelectDropdown
                                placeholder="Select Cost Categories (RCCY)..."
                                options={costCategoryOptions}
                                selected={filters.costTypes}
                                onChange={(v) => updateFilter('costTypes', v)}
                            />
                        </div>

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
                            <span className="text-sm font-medium text-slate-600">Loading Cost Data...</span>
                        </div>
                    )}

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[250px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] text-xs font-bold uppercase text-slate-500">
                                    {filters.periodicity.label === "Annually" ? "Year" :
                                        filters.periodicity.label === "Quarterly" ? "Quarter" :
                                            filters.periodicity.label === "Monthly" ? "Month" :
                                                filters.periodicity.label === "Weekly" ? "Week" :
                                                    "Day"}
                                </th>
                                {tableColumns.map((col, idx) => (
                                    <th key={idx} className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[120px] text-right text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {formatHeaderDate(col)}
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
                                            "p-3 border-r border-b border-slate-200 dark:border-slate-800 text-right text-sm tabular-nums",
                                            row.isTotalRow ? "font-bold text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400",
                                            row.isGrandTotal && "text-emerald-700 dark:text-emerald-400 font-black"
                                        )}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {!loading && tableData.length === 0 && (
                                <tr>
                                    <td colSpan={tableColumns.length + 1} className="p-6 text-center text-slate-500 italic">
                                        {filters.costTypes.length === 0 ? "Please select Cost Categories (RCCY) from the dropdown above to view data." : "No cost data found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* --- COST INPUT MODAL --- */}
            <CostInputModal 
                isOpen={isCostInputOpen} 
                onClose={() => setIsCostInputOpen(false)} 
            />
        </div>
    );
};

export default CostPage;
