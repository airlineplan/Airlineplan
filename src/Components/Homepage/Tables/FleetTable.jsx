import { useState, useEffect, useRef } from "react";
import { Upload, Search, Plus, Save, Trash2 } from "lucide-react";
import moment from "moment";
import api from "../../../apiConfig";
import { toast } from "react-toastify";

const CATEGORIES = ["Aircraft", "Engine", "APU"];
const STATUSES = ["Active", "Available", "Assigned", "Maintenance", "Retired"];
const METRIC_OPTIONS = [
    { label: "FH", value: "fh" },
    { label: "BH", value: "bh" },
    { label: "Dep", value: "dep" }
];
const SUMMARY_ROWS = [
    { label: "Total BH", metricKey: "bh" },
    { label: "Total FH", metricKey: "fh" },
    { label: "Total Dep", metricKey: "dep" }
];
const DATE_LABEL_COL_CLASS = "w-24 flex-shrink-0";
const METRICS_CACHE_KEY_PREFIX = "fleet:metrics:";
const METRICS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

// STRICT COLOR LOGIC
// Aircraft/Engine/APU schedule colors:
// - available/unassigned: brown
// - assigned (aircraft): green
// - on-ground/maintenance: gray
const getStatusColor = (status, category) => {
    const s = status?.toLowerCase() || "";

    if (s.includes("maintenance") || s.includes("check") || s.includes("ground")) {
        return "bg-stone-500 dark:bg-stone-700 text-white border-stone-600 font-medium text-[10px]";
    }

    if (category === "Aircraft" && s === "aircraft-assigned") {
        return "bg-[#8de08d] dark:bg-green-900/40 text-green-900 dark:text-green-100 border-green-500 font-semibold";
    }

    if (s.includes("available") || s === "auto-available") {
        return "bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 font-semibold";
    }

    if (s.includes("assigned") || s === "1" || s === "2") {
        return "bg-[#8de08d] dark:bg-green-900/40 text-green-900 dark:text-green-100 border-green-500 font-semibold";
    }

    return "bg-transparent";
};

const normalizeNumericAssetKey = (value) => {
    if (value === null || value === undefined) return "";
    const raw = String(value).trim().toUpperCase();
    if (!raw) return "";
    const digitsOnly = raw.replace(/\D/g, "");
    return digitsOnly || raw;
};
const normalizeApuKey = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim().toUpperCase();
};
const createMetricKey = (category, value) => {
    const normalized =
        category === "APU" ? normalizeApuKey(value) : normalizeNumericAssetKey(value);

    return normalized ? `${category}:${normalized}` : "";
};

// Derive today's auto-computed status for an Aircraft from todayMetricsData
const getTodayStatus = (asset, todayMetricsData) => {
    if (!asset.sn) return asset.status || "Available";
    const todayStr = moment().format("DD MMM YY");
    const metric = todayMetricsData[createMetricKey(asset.category, asset.sn)]?.[todayStr];

    if (metric) {
        if (metric.status === "maintenance" || metric.status?.includes("check") || metric.status?.includes("ground")) return "Maintenance";
        if (metric.status === "aircraft-assigned" || metric.status === "assigned") return "Assigned";
        return "Available";
    }

    return asset.status || "Available";
};

const generateDatesForMonth = (monthYearStr) => {
    if (!monthYearStr) return [];
    const startOfMonth = moment(monthYearStr, "MMMM YYYY").startOf('month');
    const daysInMonth = startOfMonth.daysInMonth();

    return Array.from({ length: daysInMonth }).map((_, i) =>
        moment(startOfMonth).add(i, 'days').format("DD MMM YY")
    );
};

const formatMetricValue = (value, metricKey) => {
    const numericValue = Number(value) || 0;
    if (metricKey === "dep") return String(Math.round(numericValue));
    return numericValue.toFixed(2);
};

const isSpareComponentAsset = (asset) =>
    ["Engine", "APU"].includes(asset?.category) &&
    String(asset?.titled || "").trim().toLowerCase() === "spare";

const shouldDisableOwnership = (asset) =>
    ["Engine", "APU"].includes(asset?.category) && !isSpareComponentAsset(asset);

const getOwnershipOptions = (asset) => {
    const baseOptions = ["Owned with no lien", "Operating lease", "Finance lease"];
    return isSpareComponentAsset(asset)
        ? baseOptions
        : [...baseOptions, "Wet lease"];
};

const FleetTable = () => {
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedMetric, setSelectedMetric] = useState("bh");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [scheduleDates, setScheduleDates] = useState([]);
    const [metricsData, setMetricsData] = useState({});
    const [todayMetricsData, setTodayMetricsData] = useState({});
    const metricsCacheRef = useRef(new Map());
    const activeMetricsReqIdRef = useRef(0);

    const [assets, setAssets] = useState([
        {
            id: Date.now(),
            category: "Aircraft", type: "", variant: "", sn: "", regn: "",
            entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "Available",
            schedule: {}
        }
    ]);

    const fetchTodayMetrics = async () => {
        try {
            const currentMonthStr = moment().format("MMMM YYYY");
            const response = await api.get(`/fleet/metrics?month=${encodeURIComponent(currentMonthStr)}`);
            setTodayMetricsData(response.data.data || {});
        } catch (error) {
            console.error("Error fetching today metrics:", error);
        }
    };

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
        fetchTodayMetrics();
    }, []);

    useEffect(() => {
        const refreshMetrics = (forceRefresh = false) => {
            metricsCacheRef.current.clear();
            try {
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(METRICS_CACHE_KEY_PREFIX)) keysToDelete.push(key);
                }
                keysToDelete.forEach((k) => localStorage.removeItem(k));
            } catch (error) {
                console.warn("Failed to clear fleet metrics cache from localStorage", error);
            }
            if (selectedMonth) fetchScheduleMetrics(selectedMonth, { forceRefresh });
            fetchTodayMetrics();
        };

        const handleAssignmentsUpdated = () => refreshMetrics(true);
        const handleRefreshData = () => refreshMetrics(true);

        window.addEventListener("assignments:updated", handleAssignmentsUpdated);
        window.addEventListener("refreshData", handleRefreshData);
        return () => {
            window.removeEventListener("assignments:updated", handleAssignmentsUpdated);
            window.removeEventListener("refreshData", handleRefreshData);
        };
    }, [selectedMonth]);

    useEffect(() => {
        if (selectedMonth) {
            setScheduleDates(generateDatesForMonth(selectedMonth));
            fetchScheduleMetrics(selectedMonth);
        }
    }, [selectedMonth]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const fleetResponse = await api.get("/fleet");
                if (fleetResponse.data.data && fleetResponse.data.data.length > 0) {

                    // 🔥 FIX: Safely format MongoDB ISO dates to strictly 'YYYY-MM-DD' for HTML inputs
                    const formattedAssets = fleetResponse.data.data.map(a => {
                        return {
                            ...a,
                            id: a._id,
                            // Extract just the YYYY-MM-DD portion. If null, return an empty string.
                            entry: a.entry ? a.entry.substring(0, 10) : "",
                            exit: a.exit ? a.exit.substring(0, 10) : "",
                            schedule: {}
                        };
                    });

                    setAssets(formattedAssets);
                }

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
                console.error("Error fetching initial data:", error);
                const currentMonth = moment().format("MMMM YYYY");
                setMonths([currentMonth]);
                setSelectedMonth(currentMonth);
            }
        };
        fetchInitialData();
    }, []);

    const readLocalMetricsCache = (monthStr) => {
        try {
            const cacheRaw = localStorage.getItem(`${METRICS_CACHE_KEY_PREFIX}${monthStr}`);
            if (!cacheRaw) return null;
            const parsed = JSON.parse(cacheRaw);
            if (!parsed || typeof parsed !== "object") return null;
            if (!parsed.savedAt || (Date.now() - parsed.savedAt > METRICS_CACHE_TTL_MS)) return null;
            return parsed.data || {};
        } catch (error) {
            console.warn("Failed to read fleet metrics cache", error);
            return null;
        }
    };

    const writeLocalMetricsCache = (monthStr, data) => {
        try {
            localStorage.setItem(
                `${METRICS_CACHE_KEY_PREFIX}${monthStr}`,
                JSON.stringify({ savedAt: Date.now(), data })
            );
        } catch (error) {
            console.warn("Failed to write fleet metrics cache", error);
        }
    };

    const fetchScheduleMetrics = async (monthStr, options = {}) => {
        const { forceRefresh = false } = options;
        const reqId = ++activeMetricsReqIdRef.current;
        const cacheEntry = metricsCacheRef.current.get(monthStr);

        if (!forceRefresh && cacheEntry && (Date.now() - cacheEntry.savedAt <= METRICS_CACHE_TTL_MS)) {
            setMetricsData(cacheEntry.data || {});
            return;
        }

        if (!forceRefresh) {
            const localCached = readLocalMetricsCache(monthStr);
            if (localCached) {
                metricsCacheRef.current.set(monthStr, { savedAt: Date.now(), data: localCached });
                setMetricsData(localCached);
                return;
            }
        }

        try {
            const response = await api.get(`/fleet/metrics?month=${encodeURIComponent(monthStr)}`);
            if (reqId !== activeMetricsReqIdRef.current) return; // stale response guard
            const freshData = response.data.data || {};
            metricsCacheRef.current.set(monthStr, { savedAt: Date.now(), data: freshData });
            writeLocalMetricsCache(monthStr, freshData);
            setMetricsData(freshData);
        } catch (error) {
            console.error("Error fetching metrics", error);
        }
    };

    const handleInputChange = (id, field, value) => {
        setAssets(prev => prev.map(asset =>
            asset.id !== id
                ? asset
                : (() => {
                    const nextAsset = { ...asset, [field]: value };
                    if (field === "titled" || field === "category") {
                        if (shouldDisableOwnership(nextAsset)) {
                            nextAsset.ownership = "";
                        } else if (isSpareComponentAsset(nextAsset) && asset.ownership === "Wet lease") {
                            nextAsset.ownership = "";
                        }
                    }
                    if (field === "ownership" && shouldDisableOwnership(asset)) {
                        nextAsset.ownership = "";
                    }
                    return nextAsset;
                })()
        ));
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
                toast.warning("No valid assets to save. Please enter at least a Serial Number.");
                setIsSaving(false); return;
            }
            await api.post("/fleet/bulk-save", { fleetData: validAssets });
            toast.success("Fleet data saved successfully!");
        } catch (error) {
            console.error("Error saving fleet", error);
            toast.error("Failed to save fleet data. " + (error.response?.data?.message || ""));
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAssets = assets.filter(a =>
        a.regn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.sn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalsByDate = scheduleDates.reduce((acc, date) => {
        acc[date] = assets.reduce((totals, asset) => {
            if (asset.category !== "Aircraft") return totals;

            const snKey = createMetricKey("Aircraft", asset.sn);
            if (!snKey) return totals;

            const metric = metricsData[snKey]?.[date];
            if (!metric || metric.status !== "aircraft-assigned") return totals;

            totals.bh += Number(metric.bh) || 0;
            totals.fh += Number(metric.fh) || 0;
            totals.dep += Number(metric.dep) || 0;
            return totals;
        }, { bh: 0, fh: 0, dep: 0 });

        return acc;
    }, {});

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl font-sans">
            {/* Header & Toolbars */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Fleet
                        </h2>
                    </div>
                    <div className="flex gap-3">

                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all disabled:opacity-70">
                            <Save size={18} /> {isSaving ? "Saving..." : "Save Fleet Data"}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex flex-col md:flex-row gap-4 md:items-end">
                            <div className="flex gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Metric</span>
                                    <select
                                        value={selectedMetric}
                                        onChange={(e) => setSelectedMetric(e.target.value)}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white font-medium cursor-pointer"
                                    >
                                        {METRIC_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Month Ending</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white font-medium cursor-pointer"
                                    >
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
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
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-700 border-amber-900 border inline-block"></span> Available</div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#8de08d] border-green-500 border inline-block"></span> Assigned</div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-stone-500 border-stone-600 border inline-block"></span> Maintenance</div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Table Area */}
            {/* NOTE: overflow-hidden must NOT be on this table container — it breaks position:sticky on the left pane */}
            <div className="flex-1 overflow-auto">
                <div className="inline-flex min-w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm mx-6 my-6">

                    {/* ═══════════════════════════════════════════════════════
                        LEFT PANE — FROZEN  (S.No · Category · Type · Variant · SN)
                        Sticky ends here ↓ ; everything right of SN scrolls
                    ═══════════════════════════════════════════════════════ */}
                    <div className="flex-shrink-0 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r-2 border-slate-400 shadow-xl">

                        {/* Frozen Header — height matches right-pane totals + date header */}
                        <div className="flex h-[140px] font-semibold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider bg-[#f4e6fa] dark:bg-fuchsia-900/30 border-b border-slate-200">
                            <div className="w-10 flex items-center justify-center border-r">S.No</div>
                            <div className="w-28 flex items-center p-2 border-r">Asset Category</div>
                            <div className="w-24 flex items-center p-2 border-r">Asset Type</div>
                            <div className="w-24 flex items-center p-2 border-r">Asset Variant</div>
                            <div className="w-24 flex items-center p-2">Asset SN *</div>
                        </div>

                        {/* Frozen Data Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredAssets.map((asset, index) => (
                                <div key={asset.id} className="flex h-8 text-xs text-slate-800 dark:text-slate-200 bg-[#fbf5fd] dark:bg-fuchsia-900/10 hover:bg-white transition-colors">
                                    <div className="w-10 border-r flex items-center justify-center font-medium text-slate-500">{index + 1}</div>
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
                                    <div className="w-24 p-1">
                                        <input type="text" value={asset.sn} onChange={e => handleInputChange(asset.id, "sn", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 font-bold text-emerald-600" required placeholder="Required" />
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

                    {/* ═══════════════════════════════════════════════════════
                        RIGHT PANE — SCROLLABLE
                        Regn · Entry · Exit · Titled · Ownership · MTOW · Status · Delete
                        followed by the full DOW + Date calendar grid
                    ═══════════════════════════════════════════════════════ */}
                    <div className="flex-grow flex flex-col w-max bg-white dark:bg-slate-800">

                        {/* ── Header: regular columns (purple) + date 2-row header (orange) ── */}
                        <div className="flex h-[140px] border-b border-slate-200">
                            {/* Regular column headers */}
                            <div className="flex font-semibold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider bg-[#f4e6fa] dark:bg-fuchsia-900/30 border-r border-slate-300">
                                <div className="w-24 h-full flex items-center p-2 border-r">Asset Regn</div>
                                <div className="w-28 h-full flex items-center p-2 border-r">Fleet Entry</div>
                                <div className="w-28 h-full flex items-center p-2 border-r">Fleet Exit</div>
                                <div className="w-24 h-full flex items-center p-2 border-r">Titled/Spare</div>
                                <div className="w-32 h-full flex items-center p-2 border-r">Ownership</div>
                                <div className="w-24 h-full flex items-center p-2 border-r text-right justify-end">MTOW (Kg)</div>
                                <div className="w-32 h-full flex items-center p-2 border-r">Status Today</div>
                                <div className="w-10 h-full flex items-center"></div>
                            </div>
                            {/* Date column 5-row header (totals + DOW + date) */}
                            <div className="flex flex-col bg-[#fae6da] dark:bg-orange-900/30 flex-grow">
                                {SUMMARY_ROWS.map((summaryRow) => (
                                    <div
                                        key={`header-${summaryRow.metricKey}`}
                                        className="flex h-7 items-center text-[10px] font-semibold border-b border-orange-200/60"
                                    >
                                        <div className={`${DATE_LABEL_COL_CLASS} px-2 border-r border-slate-300 text-slate-700 dark:text-slate-200 flex items-center`}>
                                            {summaryRow.label}
                                        </div>
                                        {scheduleDates.map((date) => (
                                            <div
                                                key={`header-${summaryRow.metricKey}-${date}`}
                                                className="w-20 flex-shrink-0 px-1 border-r border-slate-300 text-center text-slate-700 dark:text-slate-200"
                                                title={summaryRow.label}
                                            >
                                                {formatMetricValue(totalsByDate[date]?.[summaryRow.metricKey], summaryRow.metricKey)}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {/* Row 4 – Day of week */}
                                <div className="flex h-7 items-center text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-orange-200/60 pt-0.5">
                                    <div className={`${DATE_LABEL_COL_CLASS} border-r border-slate-300`} />
                                    {scheduleDates.map((date, i) => (
                                        <div
                                            key={`dow-${i}`}
                                            className="w-20 flex-shrink-0 px-1 border-r border-slate-300 text-center transition-colors"
                                        >
                                            {moment(date, "DD MMM YY").format("ddd").toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                                {/* Row 5 – Calendar date */}
                                <div className="flex h-7 items-center text-xs font-semibold text-slate-800 dark:text-slate-100 pb-0.5">
                                    <div className={`${DATE_LABEL_COL_CLASS} border-r border-slate-300`} />
                                    {scheduleDates.map((date, i) => (
                                        <div
                                            key={`date-${i}`}
                                            className="w-20 flex-shrink-0 px-1 border-r border-slate-300 text-center whitespace-nowrap transition-colors"
                                        >
                                            {date}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Data Rows: regular cells + date cells in ONE flex row each ── */}
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAssets.map((asset) => (
                                <div key={`sched-${asset.id}`} className="flex h-8 text-xs text-slate-800 dark:text-slate-200 bg-[#fbf5fd] dark:bg-fuchsia-900/10 hover:bg-white transition-colors">

                                    {/* Regular column cells (Regn → Delete) */}
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
                                        <input
                                            type="text"
                                            value={asset.titled}
                                            onChange={e => handleInputChange(asset.id, "titled", e.target.value)}
                                            onBlur={e => {
                                                const normalized = e.target.value.trim();
                                                handleInputChange(
                                                    asset.id,
                                                    "titled",
                                                    normalized.toLowerCase() === "spare" ? "Spare" : normalized
                                                );
                                            }}
                                            className="w-full h-full bg-transparent outline-none px-1"
                                            placeholder="e.g. VT-DKU #1"
                                        />
                                    </div>
                                    <div className="w-32 p-1 border-r">
                                        {shouldDisableOwnership(asset)
                                            ? <div className="w-full h-full px-1 flex items-center" />
                                            : (
                                                <select
                                                    value={asset.ownership}
                                                    onChange={e => handleInputChange(asset.id, "ownership", e.target.value)}
                                                    className="w-full h-full bg-transparent outline-none px-1 cursor-pointer"
                                                >
                                                    <option value="" disabled className="text-gray-400">Select</option>
                                                    {getOwnershipOptions(asset).map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            )
                                        }
                                    </div>
                                    <div className="w-24 p-1 border-r">
                                        <input type="number" value={asset.mtow} onChange={e => handleInputChange(asset.id, "mtow", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-right" placeholder="e.g. 77000" />
                                    </div>
                                    <div className="w-32 p-1 border-r flex items-center">
                                        {(() => {
                                            const todayStatus = getTodayStatus(asset, todayMetricsData);
                                            const badgeColor = todayStatus === "Maintenance"
                                                ? "bg-stone-500 text-white"
                                                : todayStatus === "Assigned"
                                                    ? "bg-[#8de08d] text-green-900"
                                                    : "bg-amber-700 text-white";
                                            return (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
                                                    {todayStatus}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="w-10 p-1 border-r flex items-center justify-center">
                                        <button onClick={() => handleDeleteRow(asset.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete Row"><Trash2 size={14} /></button>
                                    </div>

                                    {/* Date cells */}
                                    <div className={`${DATE_LABEL_COL_CLASS} border-r`} />
                                    {scheduleDates.map((date) => {
                                        const manualDayData = asset.schedule[date];
                                        const hasManualOverride = Boolean(manualDayData?.label?.trim());
                                        let dayData = manualDayData || { status: "available", label: "" };
                                        let cellTitle = "";
                                        const snStr = createMetricKey(asset.category, asset.sn);
                                        const isAutoScheduleAsset = ["Aircraft", "Engine", "APU"].includes(asset.category);

                                        if (isAutoScheduleAsset && snStr && !hasManualOverride) {
                                            const metric = metricsData[snStr]?.[date];
                                            if (metric) {
                                                if (metric.status === "maintenance" || metric.status?.includes("check") || metric.status?.includes("ground")) {
                                                    const eventName = metric.event || metric.label || "Maintenance";
                                                    dayData = {
                                                        status: "maintenance",
                                                        label: eventName
                                                    };
                                                    cellTitle = `Ground Event: ${eventName}`;
                                                } else if (metric.status === "aircraft-assigned") {
                                                    dayData = {
                                                        status: "aircraft-assigned",
                                                        label: formatMetricValue(metric[selectedMetric], selectedMetric)
                                                    };
                                                    cellTitle = `BH: ${(metric.bh || 0).toFixed(2)}\nFH: ${(metric.fh || 0).toFixed(2)}\nDepartures: ${metric.dep || 0}`;
                                                } else {
                                                    dayData = { status: "auto-available", label: "0" };
                                                }
                                            } else {
                                                dayData = { status: "auto-available", label: "0" };
                                            }
                                        }

                                        const classes = getStatusColor(dayData.status, asset.category);
                                        return (
                                            <div
                                                key={`${asset.id}-${date}`}
                                                className={`w-20 flex-shrink-0 border-r ${classes} transition-all`}
                                                title={cellTitle}
                                            >
                                                <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px]">
                                                    {dayData.label || "-"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 min-h-[40px] bg-slate-50/50" />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default FleetTable;
