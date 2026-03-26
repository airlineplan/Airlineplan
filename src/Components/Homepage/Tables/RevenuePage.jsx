import React, { useState, useEffect, useCallback } from "react";
import api from "../../../apiConfig";
import { ChevronDown, Filter, DollarSign, ChevronRight, Search, Download } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "react-toastify";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const RevenuePage = () => {
    // ── State ──
    const [filters, setFilters] = useState({
        fromDate: "", toDate: "",
        poo: "", od: "", sector: "", flightNumber: "", variant: "",
        identifier: ""
    });
    const [groupBy, setGroupBy] = useState("poo");
    const [periodicity, setPeriodicity] = useState("monthly");
    const [data, setData] = useState({});
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [selectedMetric, setSelectedMetric] = useState("totalRev");

    const inputClass = "w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors";
    const labelClass = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";
    const thClass = "px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-sm whitespace-nowrap bg-slate-100 dark:bg-slate-800/50";
    const tdClass = "px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap";

    const metrics = [
        { value: "totalRev", label: "Total Revenue" },
        { value: "paxRev", label: "Pax Revenue" },
        { value: "cargoRev", label: "Cargo Revenue" },
        { value: "legRev", label: "Leg Revenue" },
        { value: "odRev", label: "OD Revenue" },
        { value: "pax", label: "Pax Count" },
        { value: "cargoT", label: "Cargo T" },
    ];

    const groupOptions = [
        { value: "poo", label: "POO" },
        { value: "od", label: "OD" },
        { value: "sector", label: "Sector" },
        { value: "flightNumber", label: "Flight #" },
        { value: "stops", label: "Stop" },
        { value: "identifier", label: "Identifier" },
    ];

    // ── Fetch ──
    const fetchRevenue = useCallback(async () => {
        setLoading(true);
        try {
            const params = { groupBy, periodicity };
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });

            const res = await api.get("/revenue", { params });
            setData(res.data.data || {});
            setPeriods(res.data.periods || []);

            // Auto-expand first 5 groups
            const expanded = {};
            Object.keys(res.data.data || {}).slice(0, 5).forEach(k => { expanded[k] = true; });
            setExpandedGroups(expanded);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch revenue data");
        } finally {
            setLoading(false);
        }
    }, [filters, groupBy, periodicity]);

    useEffect(() => {
        fetchRevenue();
    }, []);

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const fmt = (v) => {
        const n = parseFloat(v);
        if (isNaN(n) || n === 0) return "—";
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    const fmtPeriod = (p) => {
        if (!p) return p;
        // Monthly: 2025-03 → Mar 2025
        if (/^\d{4}-\d{2}$/.test(p)) {
            const [y, m] = p.split("-");
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[parseInt(m) - 1]} ${y}`;
        }
        // Weekly: 2025-W12
        if (/^\d{4}-W\d+$/.test(p)) return p;
        // Daily: as-is
        return p;
    };

    // Compute totals per period across all groups
    const periodTotals = {};
    periods.forEach(p => {
        let total = 0;
        Object.values(data).forEach(groupData => {
            if (groupData[p]) total += (groupData[p][selectedMetric] || 0);
        });
        periodTotals[p] = total;
    });

    const grandTotal = Object.values(periodTotals).reduce((a, b) => a + b, 0);

    return (
        <div className="flex flex-col h-full w-full">
            {/* ── Header Bar ── */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <DollarSign size={20} />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Revenue Analysis</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRevenue}
                        disabled={loading}
                        className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Search size={14} />
                        {loading ? "Loading…" : "Fetch"}
                    </button>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 flex flex-col gap-6">
                {/* ── Filters Section ── */}
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Filter size={16} className="text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filtering Parameters</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-4">
                        <div>
                            <label className={labelClass}>FROM Date</label>
                            <input type="date" className={inputClass} value={filters.fromDate} onChange={e => updateFilter("fromDate", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>TO Date</label>
                            <input type="date" className={inputClass} value={filters.toDate} onChange={e => updateFilter("toDate", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>POO</label>
                            <input type="text" className={inputClass} placeholder="e.g. DEL" value={filters.poo} onChange={e => updateFilter("poo", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>OD</label>
                            <input type="text" className={inputClass} placeholder="e.g. DEL-BOM" value={filters.od} onChange={e => updateFilter("od", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Sector</label>
                            <input type="text" className={inputClass} placeholder="e.g. DEL-BOM" value={filters.sector} onChange={e => updateFilter("sector", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Flight #</label>
                            <input type="text" className={inputClass} placeholder="Flight" value={filters.flightNumber} onChange={e => updateFilter("flightNumber", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Variant</label>
                            <input type="text" className={inputClass} placeholder="Variant" value={filters.variant} onChange={e => updateFilter("variant", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Type</label>
                            <select className={inputClass} value={filters.identifier} onChange={e => updateFilter("identifier", e.target.value)}>
                                <option value="">All</option>
                                <option value="Non-Stop">Non-Stop</option>
                                <option value="Connecting">Connecting</option>
                                <option value="Transit">Transit</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Table Section ── */}
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
                    {/* Table Controls */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Group By:</label>
                            <select
                                className={cn(inputClass, "w-auto min-w-[130px] py-1 bg-white")}
                                value={groupBy}
                                onChange={e => setGroupBy(e.target.value)}
                            >
                                {groupOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Periodicity:</label>
                            <select
                                className={cn(inputClass, "w-auto min-w-[130px] py-1 bg-white")}
                                value={periodicity}
                                onChange={e => setPeriodicity(e.target.value)}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="daily">Daily</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Metric:</label>
                            <select
                                className={cn(inputClass, "w-auto min-w-[150px] py-1 bg-white")}
                                value={selectedMetric}
                                onChange={e => setSelectedMetric(e.target.value)}
                            >
                                {metrics.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        {Object.keys(data).length === 0 && !loading ? (
                            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                                <p className="text-lg">No revenue data</p>
                                <p className="text-sm mt-1">Populate POO records first, then use filters and click <strong>Fetch</strong></p>
                            </div>
                        ) : (
                            <table className="min-w-full w-full border-collapse text-left">
                                <thead>
                                    <tr>
                                        <th className={cn(thClass, "min-w-[200px] border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800")}>
                                            {groupOptions.find(g => g.value === groupBy)?.label || groupBy}
                                        </th>
                                        {periods.map(p => (
                                            <th key={p} className={thClass}>{fmtPeriod(p)}</th>
                                        ))}
                                        <th className={cn(thClass, "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300")}>Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-transparent">
                                    {Object.entries(data).map(([groupKey, periodData]) => {
                                        const isExpanded = expandedGroups[groupKey];
                                        // Row total
                                        let rowTotal = 0;
                                        periods.forEach(p => {
                                            if (periodData[p]) rowTotal += (periodData[p][selectedMetric] || 0);
                                        });

                                        return (
                                            <React.Fragment key={groupKey}>
                                                <tr
                                                    className="bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                                    onClick={() => toggleGroup(groupKey)}
                                                >
                                                    <td className={cn(tdClass, "font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/30")}>
                                                        <div className="flex items-center gap-1">
                                                            <ChevronRight size={16} className={cn("transition-transform", isExpanded && "rotate-90")} />
                                                            {groupKey}
                                                        </div>
                                                    </td>
                                                    {periods.map(p => (
                                                        <td key={p} className={cn(tdClass, "font-medium")}>
                                                            {fmt(periodData[p]?.[selectedMetric])}
                                                        </td>
                                                    ))}
                                                    <td className={cn(tdClass, "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10")}>
                                                        {fmt(rowTotal)}
                                                    </td>
                                                </tr>

                                                {/* Expanded detail rows — show all metrics */}
                                                {isExpanded && metrics.filter(m => m.value !== selectedMetric).slice(0, 3).map(metric => (
                                                    <tr key={`${groupKey}-${metric.value}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                                        <td className={cn(tdClass, "pl-10 text-slate-500 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-white dark:bg-slate-900/30")}>
                                                            {metric.label}
                                                        </td>
                                                        {periods.map(p => (
                                                            <td key={p} className={cn(tdClass, "text-slate-500")}>
                                                                {fmt(periodData[p]?.[metric.value])}
                                                            </td>
                                                        ))}
                                                        <td className={cn(tdClass, "text-slate-500 bg-indigo-50/30 dark:bg-indigo-900/5")}>
                                                            {fmt(periods.reduce((sum, p) => sum + ((periodData[p]?.[metric.value]) || 0), 0))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}

                                    {/* ── Totals Row ── */}
                                    {Object.keys(data).length > 0 && (
                                        <tr className="bg-slate-100 dark:bg-slate-800/60 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                                            <td className={cn(tdClass, "font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800/60")}>
                                                TOTAL
                                            </td>
                                            {periods.map(p => (
                                                <td key={p} className={cn(tdClass, "font-bold")}>
                                                    {fmt(periodTotals[p])}
                                                </td>
                                            ))}
                                            <td className={cn(tdClass, "font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/20")}>
                                                {fmt(grandTotal)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenuePage;