import React, { useState, useEffect } from "react";
import { Upload, Search, Info, Plus, Save, Trash2 } from "lucide-react";
import moment from "moment";
import api from "../../../apiConfig";

const CATEGORIES = ["Aircraft", "Engine", "APU", "Other"];
const STATUSES = ["Active", "Available", "Assigned", "Maintenance", "Retired"];
const OWNERSHIP_TYPES = ["Owned with no lien", "Operating lease", "Finance lease", "Wet lease"];

// STRICT COLOR LOGIC
const getStatusColor = (status, category) => {
    const s = status?.toLowerCase() || "";

    // 1. ABSOLUTE OVERRIDE: If it is on ground/maintenance, it is ALWAYS Gray.
    // This applies irrespective of assignment or category.
    if (s.includes("maintenance") || s.includes("check") || s.includes("ground")) {
        return "bg-stone-500 dark:bg-stone-700 text-white border-stone-600 font-semibold text-[10px]";
    }

    // 2. Aircraft Specific Colors
    if (category === "Aircraft") {
        // Condition 1: No assignment -> Green with "0"
        if (s === "available-aircraft" || s === "0") return "bg-[#8de08d] dark:bg-green-900/40 text-green-900 border-green-400 font-bold";
        // Condition 2: Assigned -> Default color (transparent background)
        if (s === "aircraft-assigned") return "bg-transparent text-slate-800 dark:text-slate-200 border-slate-300 font-semibold";
    }

    // 3. Fallbacks for Engine, APU, Other (Manual entry)
    if (s.includes("available")) return "bg-orange-200 dark:bg-orange-900/40 text-orange-900 border-orange-300";
    if (s.includes("assigned") || s === "1" || s === "2" || s === "0") return "bg-[#8de08d] dark:bg-green-900/40 text-green-900 border-green-400";

    return "bg-transparent";
};

// Generates an array of formatted date strings for the selected month
const generateDatesForMonth = (monthYearStr) => {
    if (!monthYearStr) return [];
    const startOfMonth = moment(monthYearStr, "MMMM YYYY").startOf('month');
    const daysInMonth = startOfMonth.daysInMonth();

    return Array.from({ length: daysInMonth }).map((_, i) =>
        moment(startOfMonth).add(i, 'days').format("DD MMM YY")
    );
};

const FleetTable = () => {
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [scheduleDates, setScheduleDates] = useState([]);
    const [metricsData, setMetricsData] = useState({});

    // Dynamic State for Assets 
    const [assets, setAssets] = useState([
        {
            id: Date.now(),
            category: "Aircraft", type: "", variant: "", sn: "", regn: "",
            entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "Available",
            schedule: {}
        }
    ]);

    // Initial Fetch: Get Available Months
    useEffect(() => {
        const fetchMonths = async () => {
            try {
                const response = await api.get("/fleet/months");
                const fetchedMonths = response.data.months;
                if (fetchedMonths && fetchedMonths.length > 0) {
                    setMonths(fetchedMonths);
                    setSelectedMonth(fetchedMonths[0]);
                } else {
                    const currentMonth = moment().format("MMMM YYYY");
                    setMonths([currentMonth]);
                    setSelectedMonth(currentMonth);
                }
            } catch (error) {
                console.error("Error fetching available months:", error);
                const currentMonth = moment().format("MMMM YYYY");
                setMonths([currentMonth]);
                setSelectedMonth(currentMonth);
            }
        };
        fetchMonths();
    }, []);

    // Fetch Date grid & Aircraft Metrics when selected month changes
    useEffect(() => {
        if (selectedMonth) {
            setScheduleDates(generateDatesForMonth(selectedMonth));
            fetchScheduleMetrics(selectedMonth);
        }
    }, [selectedMonth]);

    const fetchScheduleMetrics = async (monthStr) => {
        try {
            const response = await api.get(`/fleet/metrics?month=${encodeURIComponent(monthStr)}`);
            setMetricsData(response.data.data || {});
        } catch (error) {
            console.error("Error fetching metrics", error);
        }
    };

    // Handle Input Changes for Left Pane Details
    const handleInputChange = (id, field, value) => {
        setAssets(prev => prev.map(asset =>
            asset.id === id ? { ...asset, [field]: value } : asset
        ));
    };

    // Handle Manual Input in the Right Pane Grid (For Engines, APUs, Other)
    const handleScheduleChange = (assetId, dateStr, value) => {
        setAssets(prev => prev.map(asset => {
            if (asset.id !== assetId) return asset;

            // Auto-detect status based on user input
            let newStatus = "available";
            if (value.toLowerCase().includes("check") || value.toLowerCase().includes("maint") || value.toLowerCase().includes("ground")) {
                newStatus = "maintenance";
            } else if (value !== "") {
                newStatus = "assigned";
            }

            return {
                ...asset,
                schedule: { ...asset.schedule, [dateStr]: { label: value, status: newStatus } }
            };
        }));
    };

    const handleAddRow = () => {
        setAssets([...assets, {
            id: Date.now(),
            category: "Aircraft", type: "", variant: "", sn: "", regn: "",
            entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "Available",
            schedule: {}
        }]);
    };

    const handleDeleteRow = (id) => {
        if (assets.length > 1) {
            setAssets(assets.filter(a => a.id !== id));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const validAssets = assets.filter(a => a.sn && a.sn.trim() !== "");
            if (validAssets.length === 0) {
                alert("No valid assets to save. Please enter at least a Serial Number.");
                setIsSaving(false); return;
            }
            await api.post("/fleet/bulk-save", { fleetData: validAssets });
            alert("Fleet data saved successfully!");
        } catch (error) {
            console.error("Error saving fleet", error);
            alert("Failed to save fleet data. " + (error.response?.data?.message || ""));
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAssets = assets.filter(a =>
        a.regn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.sn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl font-sans">
            {/* Header & Toolbars */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Fleet Status & Asset Management
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors">
                            <Upload size={16} /> Import
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all disabled:opacity-70">
                            <Save size={18} /> {isSaving ? "Saving..." : "Save Fleet Data"}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex gap-4 items-center">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white font-medium cursor-pointer"
                        >
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search Regn, SN, Type..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-200 border-orange-300 border"></span> Available (Spare)</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#8de08d] border-green-400 border"></span> 0 / Assigned</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-stone-500 border-stone-600 border"></span> Maintenance</div>
                    </div>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 overflow-auto p-6">
                <div className="inline-flex min-w-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">

                    {/* LEFT PANE: Full Asset Details */}
                    <div className="flex-shrink-0 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r-2 border-slate-300 shadow-xl">

                        {/* Headers */}
                        <div className="flex font-semibold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider bg-[#f4e6fa] dark:bg-fuchsia-900/30 border-b border-slate-200">
                            <div className="w-10 p-2 border-r text-center">S.No</div>
                            <div className="w-28 p-2 border-r">Asset Category</div>
                            <div className="w-24 p-2 border-r">Asset Type</div>
                            <div className="w-24 p-2 border-r">Asset Variant</div>
                            <div className="w-24 p-2 border-r">Asset SN *</div>
                            <div className="w-24 p-2 border-r">Asset Regn</div>
                            <div className="w-28 p-2 border-r">Fleet Entry</div>
                            <div className="w-28 p-2 border-r">Fleet Exit</div>
                            <div className="w-24 p-2 border-r">Titled/Spare</div>
                            <div className="w-32 p-2 border-r">Ownership</div>
                            <div className="w-24 p-2 border-r text-right">MTOW (Kg)</div>
                            <div className="w-28 p-2 border-r">Status Today</div>
                            <div className="w-10 p-2"></div>
                        </div>

                        {/* Editable Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredAssets.map((asset, index) => (
                                <div key={asset.id} className="flex text-xs text-slate-800 dark:text-slate-200 bg-[#fbf5fd] dark:bg-fuchsia-900/10 hover:bg-white transition-colors">
                                    <div className="w-10 p-2 border-r flex items-center justify-center font-medium text-slate-500">{index + 1}</div>
                                    <div className="w-28 p-1 border-r">
                                        <select value={asset.category} onChange={e => handleInputChange(asset.id, "category", e.target.value)} className="w-full h-full bg-transparent outline-none cursor-pointer">
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="text" value={asset.type} onChange={e => handleInputChange(asset.id, "type", e.target.value)} className="w-full h-full bg-transparent outline-none px-1" placeholder="e.g. A320ceo" />
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="text" value={asset.variant} onChange={e => handleInputChange(asset.id, "variant", e.target.value)} className="w-full h-full bg-transparent outline-none px-1" placeholder="e.g. A320-214" />
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="text" value={asset.sn} onChange={e => handleInputChange(asset.id, "sn", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 font-bold text-emerald-600" required placeholder="Required" />
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="text" value={asset.regn} onChange={e => handleInputChange(asset.id, "regn", e.target.value.toUpperCase())} className="w-full h-full bg-transparent outline-none px-1 uppercase font-semibold" placeholder="VT-XXX" />
                                    </div>
                                    <div className="w-28 p-1 border-r">
                                        <input type="date" value={asset.entry} onChange={e => handleInputChange(asset.id, "entry", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-[11px] cursor-text" />
                                    </div>
                                    <div className="w-28 p-1 border-r">
                                        <input type="date" value={asset.exit} onChange={e => handleInputChange(asset.id, "exit", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-[11px] cursor-text" />
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="text" value={asset.titled} onChange={e => handleInputChange(asset.id, "titled", e.target.value)} className="w-full h-full bg-transparent outline-none px-1" placeholder="e.g. VT-DKU #1" />
                                    </div>
                                    <div className="w-32 p-1 border-r">
                                        <select value={asset.ownership} onChange={e => handleInputChange(asset.id, "ownership", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 cursor-pointer">
                                            <option value="" disabled className="text-gray-400">Select Lease</option>
                                            {OWNERSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="number" value={asset.mtow} onChange={e => handleInputChange(asset.id, "mtow", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-right" placeholder="e.g. 77000" />
                                    </div>
                                    <div className="w-28 p-1 border-r">
                                        <select value={asset.status} onChange={e => handleInputChange(asset.id, "status", e.target.value)} className="w-full h-full bg-transparent outline-none cursor-pointer">
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-10 p-1 flex items-center justify-center">
                                        <button onClick={() => handleDeleteRow(asset.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete Row"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Row Button */}
                        <div className="p-2 border-t border-slate-200 bg-slate-50 dark:bg-slate-800">
                            <button onClick={handleAddRow} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors px-2 py-1">
                                <Plus size={14} /> Add Asset Row
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANE: Dynamic Schedule & Auto-Calculated Metrics Grid */}
                    <div className="flex-grow flex flex-col w-max bg-white dark:bg-slate-800">
                        {/* Dates Header */}
                        <div className="flex flex-col bg-[#fae6da] dark:bg-orange-900/30 border-b border-slate-200">
                            <div className="flex text-xs font-semibold text-slate-800 dark:text-slate-100 pb-0.5 pt-6">
                                {scheduleDates.map((date, i) => (
                                    <div key={`date-${i}`} className="w-20 flex-shrink-0 p-2 px-1 border-r border-slate-300 text-center whitespace-nowrap">
                                        {date}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Date Input/Metric Cells */}
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAssets.map((asset) => (
                                <div key={`sched-${asset.id}`} className="flex h-8">
                                    {scheduleDates.map((date) => {
                                        // Pull manually entered data by default (For Engines, APU, etc.)
                                        let dayData = asset.schedule[date] || { status: "available", label: "" };
                                        let cellTitle = "";
                                        let isReadOnly = false;

                                        // Override Logic ONLY for Aircraft (Backend Metrics Check)
                                        if (asset.category === "Aircraft" && asset.sn) {
                                            isReadOnly = true;
                                            const snStr = String(asset.sn).trim();
                                            const metric = metricsData[snStr]?.[date];

                                            if (metric) {
                                                dayData = { status: metric.status, label: metric.label };

                                                // Only show assignment metrics if it's NOT a maintenance day
                                                if (metric.status === "aircraft-assigned" && !metric.status.includes("maintenance")) {
                                                    cellTitle = `Block Hrs: ${metric.bh?.toFixed(2)}\nFlight Hrs: ${metric.fh?.toFixed(2)}\nDepartures: ${metric.dep}`;
                                                }
                                            } else {
                                                // Not assigned, not in ground table
                                                dayData = { status: "available-aircraft", label: "0" };
                                            }
                                        }

                                        const classes = getStatusColor(dayData.status, asset.category);

                                        return (
                                            <div
                                                key={`${asset.id}-${date}`}
                                                className={`w-20 flex-shrink-0 border-r border-b ${classes} transition-all relative group`}
                                                title={cellTitle}
                                            >
                                                <input
                                                    type="text"
                                                    value={dayData.label}
                                                    readOnly={isReadOnly}
                                                    onChange={(e) => handleScheduleChange(asset.id, date, e.target.value)}
                                                    placeholder="-"
                                                    className={`w-full h-full bg-transparent outline-none text-center text-[11px] placeholder:text-black/20 dark:placeholder:text-white/20 focus:bg-white/50 dark:focus:bg-black/20 ${isReadOnly ? "cursor-default select-none" : ""}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 min-h-[40px] border-l border-slate-200 bg-slate-50/50" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-b-xl flex justify-between">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Info size={14} />
                    <span><strong>Aircraft</strong> rows are read-only in the schedule grid. Data is auto-calculated from Assignment and Ground Day tables. Maintenance days override assignments.</span>
                </div>
            </div>
        </div>
    );
};

export default FleetTable;