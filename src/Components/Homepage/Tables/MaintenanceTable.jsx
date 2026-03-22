import React, { useState, useMemo } from "react";
import {
    Calculator, Settings, Download, Edit, RefreshCw, Layers,
    Search, ArrowUp, ArrowDown
} from "lucide-react";

// --- DUMMY DATA STRUCTURES (Replace with API Response later) ---

const dummyMaintenanceData = [
    { id: 1, msn: "4120", pn: "", sn: "", titled: "", tsn: "25104.45", csn: "12855", dsn: "3285", tso: "", cso: "", dso: "", tsr: "", csr: "", dsr: "", allDisplay: "All display only" },
    { id: 2, msn: "685911", pn: "", sn: "", titled: "VT-DKU #2", tsn: "20841.10", csn: "10275", dsn: "3285", tso: "746.50", cso: "315", dso: "40", tsr: "", csr: "10275", dsr: "", allDisplay: "" },
    { id: 3, msn: "685912", pn: "", sn: "", titled: "VT-DKU #1", tsn: "19376.80", csn: "9914", dsn: "3285", tso: "19376.80", cso: "9914", dso: "", tsr: "", csr: "9914", dsr: "", allDisplay: "" },
];

const dummyTargetData = [
    {
        id: 1, targetLabel: "ABC", targetMsn: "685782", targetPn: "CFM56-5B", targetSn: "685782", category: "Run-down", date: "12/Oct/25",
        tsn: "", csn: "", dsn: "", tso: "7150", cso: "3850", dso: "", tsr: "", csr: "3850", dsr: "",
        fTsn: "", fCsn: "", fDsn: "", fTso: "2.27", fCso: "-3", fDso: "",
        highlights: ["tso", "cso"] // Specify which keys should have yellow background
    },
    {
        id: 2, targetLabel: "DEF", targetMsn: "685912", targetPn: "CFM56-5B", targetSn: "685912", category: "Conserve", date: "13/Oct/25",
        tsn: "19385", csn: "9800", dsn: "", tso: "", cso: "9900", dso: "", tsr: "", csr: "", dsr: "",
        fTsn: "3.52", fCsn: "-116", fDsn: "", fTso: "", fCso: "-16", fDso: "",
        highlights: ["csn", "cso"]
    },
];

const dummyCalendarData = [
    {
        id: 1, calLabel: "XYZ", lineBase: "Base", calMsn: "4120", schEvent: "C-check", calPn: "A320ceo", snBn: "4120",
        eTsn: "", eCsn: "12860", eDsn: "3300", eTso: "", eCso: "", eDso: "", eTsr: "", eCsr: "", eDsr: "",
        lastOccurre: "14 Oct 25", nextEstima: "15 Nov 26\n19 Nov 26", downDays: "3", avgDownda: "5", occurrence: "2", soTsr: "0",
        highlights: ["eCsn", "eDsn"] // Specify which keys should have green background
    }
];

// --- COMPONENTS ---
const TableInput = ({ name, value, onChange, placeholder }) => (
    <div className="relative group mt-1">
        <input
            type="text"
            name={name}
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full h-7 px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all font-normal"
        />
        <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
);

const MaintenanceDashboard = () => {
    const [selectedDate, setSelectedDate] = useState("2025-10-12");

    // Dynamic State for Tables (Initialize with dummy data, replace with API later)
    const [maintenanceData, setMaintenanceData] = useState(dummyMaintenanceData);
    const [targetData, setTargetData] = useState(dummyTargetData);
    const [calendarData, setCalendarData] = useState(dummyCalendarData);

    // State for Sorting and Filtering
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });
    const [filters, setFilters] = useState({});

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
        }));
    };

    // Helper function to apply dynamic sorting and filtering to any dataset
    const getProcessedData = (dataset) => {
        let processed = [...dataset];

        // Apply Filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "") {
                processed = processed.filter(row =>
                    row[key] !== undefined &&
                    String(row[key]).toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });

        // Apply Sorting
        if (sortConfig.key) {
            processed.sort((a, b) => {
                let valA = a[sortConfig.key] || "";
                let valB = b[sortConfig.key] || "";

                // Handle numeric sorting if applicable
                if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }

                if (valA < valB) return sortConfig.direction === "Up" ? -1 : 1;
                if (valA > valB) return sortConfig.direction === "Up" ? 1 : -1;
                return 0;
            });
        }

        return processed;
    };

    const filteredMaintenanceData = useMemo(() => getProcessedData(maintenanceData), [maintenanceData, filters, sortConfig]);
    const filteredTargetData = useMemo(() => getProcessedData(targetData), [targetData, filters, sortConfig]);
    const filteredCalendarData = useMemo(() => getProcessedData(calendarData), [calendarData, filters, sortConfig]);

    // Helper to render sortable/filterable column headers
    const renderHeader = (label, key, minWidth = "min-w-[100px]") => (
        <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 align-top bg-slate-100 dark:bg-slate-800/90">
            <div className={`flex flex-col gap-1 ${minWidth}`}>
                <div
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold text-slate-700 dark:text-slate-300 group"
                    onClick={() => handleSort(key)}
                >
                    {label}
                    {sortConfig.key === key ? (
                        sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                        <ArrowUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                    )}
                </div>
                <TableInput
                    name={key}
                    value={filters[key]}
                    onChange={handleFilterChange}
                    placeholder="Filter..."
                />
            </div>
        </th>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl font-sans overflow-auto custom-scrollbar p-6 gap-8">

            {/* Header Section */}
            <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Maintenance Logic Dashboard
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
                            Application runs maintenance logic on updated data tables on click of 'Compute'
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all">
                            <Calculator size={16} /> Compute
                        </button>
                        <div className="flex flex-col gap-2 text-xs font-medium">
                            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded transition-colors w-full text-left">
                                <Settings size={14} /> Set/Reset Maintenance status
                            </button>
                            <button className="flex items-center gap-2 text-green-600 hover:text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded transition-colors w-full text-left">
                                <RefreshCw size={14} /> Set/Reset Target status
                            </button>
                            <button className="flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded transition-colors w-full text-left">
                                <Layers size={14} /> Major rotables movement
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE 1: Maintenance Status */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">User selects a date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-2 py-1 rounded"
                        />
                    </div>
                    <span className="text-[10px] text-slate-500 italic text-right max-w-sm">
                        For each MSN/ESN+PN+SN/BN, metrics can be set/reset only.<br />Metrics for all other dates (historical/forecast) will be (re)calculated.
                    </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                                {renderHeader("MSN/ESN", "msn")}
                                {renderHeader("PN", "pn")}
                                {renderHeader("SN/BN", "sn")}
                                {renderHeader("Titled/Spare", "titled")}
                                <th colSpan={9} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-200/50 dark:bg-slate-700/50">Maintenance status</th>
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-semibold align-bottom">All display</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSO/TSRtrtr</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSO/CSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSO/DSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSRplmt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {filteredMaintenanceData.map((row) => (
                                <tr key={`maint-${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.msn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.pn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.sn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.titled}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.tsn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.csn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.dsn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.tso}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.cso}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.dso}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.tsr}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.csr}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.dsr}</td>
                                    <td className={`p-2 ${row.allDisplay ? "text-slate-400 italic text-[10px]" : ""}`}>{row.allDisplay}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLE 2: Target Maintenance Status */}
            <div className="flex flex-col gap-2 pt-4">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-500 italic">Label is not user enterable on this page</span>
                    <button className="flex items-center gap-1 px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Download size={12} /> Download
                    </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                                {renderHeader("Label", "targetLabel", "min-w-[80px]")}
                                {renderHeader("MSN/ESN", "targetMsn")}
                                {renderHeader("PN", "targetPn")}
                                {renderHeader("SN/BN", "targetSn")}
                                {renderHeader("Category", "category")}
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-semibold align-bottom">Date</th>
                                <th colSpan={9} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-200/50 dark:bg-slate-700/50">Target maintenance status</th>
                                <th colSpan={6} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-[#f4e6fa] dark:bg-fuchsia-900/30">Target value-forecasted value on target date</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSO/TSRtrtr</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSO/CSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSO/DSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSO/TSRtrtr</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSO/CSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSO/DSRtrt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {filteredTargetData.map((row) => {
                                const ylStyle = "font-bold bg-yellow-200 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-100";
                                const isHighlighted = (colName) => row.highlights?.includes(colName) ? ylStyle : "";

                                return (
                                    <tr key={`target-${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-medium">{row.targetLabel}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.targetMsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-mono">{row.targetPn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.targetSn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.category}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.date}</td>

                                        {/* Target Maintenance Status */}
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("tsn")}`}>{row.tsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("csn")}`}>{row.csn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("dsn")}`}>{row.dsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("tso")}`}>{row.tso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("cso")}`}>{row.cso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("dso")}`}>{row.dso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("tsr")}`}>{row.tsr}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("csr")}`}>{row.csr}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("dsr")}`}>{row.dsr}</td>

                                        {/* Forecasted */}
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fTsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fCsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fDsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fTso}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fCso}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fDso}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLE 3: Calendar Inputs */}
            <div className="flex flex-col gap-2 pt-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Calendar inputs, down time and post event maintenance status
                </h3>
                <span className="text-[10px] text-slate-500 italic mb-1">Label is user enterable</span>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                                {renderHeader("Label", "calLabel", "min-w-[80px]")}
                                {renderHeader("Line/Base/Shop", "lineBase")}
                                {renderHeader("MSN/ESN", "calMsn")}
                                {renderHeader("Sch.Mx.Event", "schEvent")}
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 align-top">
                                    <div className="flex flex-col gap-1 min-w-[100px]">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold group" onClick={() => handleSort('calPn')}>
                                            PN
                                            {sortConfig.key === 'calPn' ? (
                                                sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                            ) : (
                                                <ArrowUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                                            )}
                                        </div>
                                        <TableInput name="calPn" value={filters.calPn} onChange={handleFilterChange} placeholder="Filter..." />
                                        <span className="text-[9px] font-normal text-slate-500 mt-1">Checkbox (apply to all SN)</span>
                                    </div>
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-semibold align-bottom">SN/BN</th>
                                <th colSpan={9} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-green-100/50 dark:bg-green-900/20">Earliest of, every</th>
                                <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center">Date</th>
                                <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-200/50 dark:bg-slate-700/50">Next occurrence</th>
                                <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-[#f4e6fa] dark:bg-fuchsia-900/30">Beyond next occurrence</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSN</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSO/TSRtrtr</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSO/CSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSO/DSRtrt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">TSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">CSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">DSRplmt</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">Last occurre</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">Next estima</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">Down days</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">Avg Downda</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">Occurrence</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700">SO/TSRtrt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {filteredCalendarData.map((row) => {
                                const grStyle = "bg-green-100/30 dark:bg-green-900/20";
                                const isHighlighted = (colName) => row.highlights?.includes(colName) ? grStyle : "";

                                return (
                                    <tr key={`cal-${row.id}`} className="bg-green-50/50 dark:bg-green-900/10">
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-medium">{row.calLabel}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.lineBase}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.calMsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.schEvent}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-mono">{row.calPn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.snBn}</td>

                                        {/* Earliest of, every */}
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eTsn")}`}>{row.eTsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eCsn")}`}>{row.eCsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eDsn")}`}>{row.eDsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eTso")}`}>{row.eTso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eCso")}`}>{row.eCso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eDso")}`}>{row.eDso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eTsr")}`}>{row.eTsr}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eCsr")}`}>{row.eCsr}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("eDsr")}`}>{row.eDsr}</td>

                                        {/* Dates */}
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-pre-line leading-relaxed">{row.lastOccurre}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-pre-line leading-relaxed">{row.nextEstima}</td>

                                        {/* Metrics */}
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right font-bold text-emerald-600 dark:text-emerald-400">{row.downDays}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.avgDownda}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.occurrence}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.soTsr}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                    <button className="flex items-center gap-1 px-5 py-2 border border-slate-300 dark:border-slate-600 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-200">
                        <Edit size={14} /> Edit
                    </button>
                    <button className="flex items-center gap-1 px-5 py-2 border border-slate-300 dark:border-slate-600 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-200">
                        Update
                    </button>
                </div>
            </div>

        </div>
    );
};

export default MaintenanceDashboard;