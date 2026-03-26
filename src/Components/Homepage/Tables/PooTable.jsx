import React, { useState, useEffect, useCallback } from "react";
import api from "../../../apiConfig";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "react-toastify";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const PooTable = () => {
    // ── State ──
    const [poo, setPoo] = useState("DEL");
    const [date, setDate] = useState("");
    const [pooCcy, setPooCcy] = useState("INR");
    const [pooCcyToRccy, setPooCcyToRccy] = useState(1);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: "sNo", dir: "asc" });
    const [filterText, setFilterText] = useState({});

    // ── Styles ──
    const thClass = "px-3 py-2 border-b border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-[11px] bg-slate-100 dark:bg-slate-800/50 whitespace-nowrap align-bottom";
    const tdClass = "px-3 py-2 border-b border-r border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap";
    const inputBg = "bg-green-100/50 dark:bg-green-900/20";
    const headerInput = "px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500";

    // ── Fetch existing records ──
    const fetchData = useCallback(async () => {
        if (!poo || !date) return;
        setLoading(true);
        try {
            const res = await api.get("/poo", { params: { poo, date } });
            setRecords(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch POO data");
        } finally {
            setLoading(false);
        }
    }, [poo, date]);

    useEffect(() => {
        if (poo && date) fetchData();
    }, []);

    // ── Populate ──
    const handlePopulate = async () => {
        if (!poo || !date) return toast.warn("Enter POO & Date first");
        setLoading(true);
        try {
            const res = await api.post("/poo/populate", { poo, date });
            setRecords(res.data.data || []);
            toast.success(res.data.message || "Populated");
        } catch (err) {
            console.error(err);
            toast.error("Populate failed");
        } finally {
            setLoading(false);
        }
    };

    // ── Update / Save ──
    const handleUpdate = async () => {
        if (!records.length) return toast.warn("No records to update");
        setLoading(true);
        try {
            const payload = records.map(r => ({ ...r, pooCcy, pooCcyToRccy }));
            await api.post("/poo/update", { records: payload });
            toast.success("Records updated & revenue computed");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Update failed");
        } finally {
            setLoading(false);
        }
    };

    // ── Edit cell ──
    const updateField = (idx, field, value) => {
        setRecords(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    // ── Sort ──
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc"
        }));
    };

    // ── Filter + Sort applied ──
    const getFilteredSorted = () => {
        let data = [...records];
        // Filter
        Object.keys(filterText).forEach(key => {
            const val = filterText[key]?.toLowerCase();
            if (val) {
                data = data.filter(r => String(r[key] || "").toLowerCase().includes(val));
            }
        });
        // Sort
        if (sortConfig.key) {
            data.sort((a, b) => {
                const av = a[sortConfig.key] ?? "";
                const bv = b[sortConfig.key] ?? "";
                if (typeof av === "number" && typeof bv === "number") {
                    return sortConfig.dir === "asc" ? av - bv : bv - av;
                }
                return sortConfig.dir === "asc"
                    ? String(av).localeCompare(String(bv))
                    : String(bv).localeCompare(String(av));
            });
        }
        return data;
    };

    // Group by identifier
    const groupRecords = (data) => {
        const groups = { 'Non-Stop': [], 'Connecting': [], 'Transit': [] };
        data.forEach(r => {
            const id = r.identifier || 'Non-Stop';
            if (!groups[id]) groups[id] = [];
            groups[id].push(r);
        });
        return groups;
    };

    const displayData = getFilteredSorted();
    const grouped = groupRecords(displayData);

    const fmt = (v) => {
        const n = parseFloat(v);
        if (isNaN(n)) return "0";
        return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    // ── Column definitions ──
    const columns = [
        { key: "od", label: "OD", filterable: true },
        { key: "odDI", label: "Dom/INTL", filterable: true },
        { key: "flightNumber", label: "Flight(s)", filterable: true },
        { key: "stops", label: "Stop", filterable: true },
        { key: "sectorGcd", label: "Total GCD", sortable: true },
        { key: "maxPax", label: "Max Pax", sortable: true },
        { key: "maxCargoT", label: "Max Cargo T", sortable: true },
        { key: "pax", label: "Pax", editable: true },
        { key: "cargoT", label: "Cargo", editable: true },
        { key: "legFare", label: "Fare", editable: true },
        { key: "legRate", label: "Rate", editable: true },
        { key: "legPaxRev", label: "Pax Rev", computed: true },
        { key: "legCargoRev", label: "Cargo Rev", computed: true },
        { key: "legTotalRev", label: "Total Rev", computed: true },
    ];

    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return <span className="ml-1 opacity-30">↕</span>;
        return <span className="ml-1">{sortConfig.dir === "asc" ? "↑" : "↓"}</span>;
    };

    // ── Render ──
    return (
        <div className="flex flex-col h-full w-full">
            {/* ── Header Controls ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <div className="flex flex-wrap items-center gap-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">POO</label>
                        <input
                            type="text"
                            value={poo}
                            onChange={e => setPoo(e.target.value.toUpperCase())}
                            className={cn(headerInput, "w-20 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800")}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className={cn(headerInput, "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">POO CCY</label>
                        <input
                            type="text"
                            value={pooCcy}
                            onChange={e => setPooCcy(e.target.value.toUpperCase())}
                            className={cn(headerInput, "w-20 bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800")}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">CCY → RCCY Rate</label>
                        <input
                            type="number"
                            step="0.01"
                            value={pooCcyToRccy}
                            onChange={e => setPooCcyToRccy(parseFloat(e.target.value) || 1)}
                            className={cn(headerInput, "w-24 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePopulate}
                        disabled={loading}
                        className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded shadow-sm transition-colors"
                    >
                        {loading ? "Loading…" : "Populate"}
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={loading || !records.length}
                        className="px-5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded shadow-sm transition-colors"
                    >
                        Update
                    </button>
                </div>
            </div>

            {/* ── Table Area ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-4">
                {records.length === 0 && !loading && (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                        <p className="text-lg">No POO records</p>
                        <p className="text-sm mt-1">Select a POO station and date, then click <strong>Populate</strong></p>
                    </div>
                )}

                {records.length > 0 && (
                    <table className="min-w-max w-full border-collapse text-xs border border-slate-200 dark:border-slate-700">
                        <thead>
                            <tr>
                                <th className={thClass}>#</th>
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        className={cn(thClass, "cursor-pointer select-none")}
                                        onClick={() => handleSort(col.key)}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            <SortIcon colKey={col.key} />
                                        </div>
                                        {col.filterable && (
                                            <input
                                                type="text"
                                                placeholder="Filter…"
                                                className="mt-1 w-full px-1 py-0.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                                                value={filterText[col.key] || ""}
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => setFilterText(p => ({ ...p, [col.key]: e.target.value }))}
                                            />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900/30">
                            {Object.entries(grouped).map(([groupName, items]) => {
                                if (!items.length) return null;
                                return (
                                    <React.Fragment key={groupName}>
                                        {/* Group header */}
                                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                                            <td colSpan={columns.length + 1} className="px-3 py-2 font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                                                {groupName}
                                                <span className="ml-2 text-xs font-normal text-slate-400">({items.length} records)</span>
                                            </td>
                                        </tr>
                                        {items.map((rec) => {
                                            // Find the original index for editing
                                            const idx = records.findIndex(r => r._id === rec._id || (r.sNo === rec.sNo && r.od === rec.od));
                                            return (
                                                <tr key={rec._id || rec.sNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className={tdClass}>{rec.sNo}</td>
                                                    {columns.map(col => {
                                                        if (col.editable) {
                                                            return (
                                                                <td key={col.key} className={cn(tdClass, inputBg)}>
                                                                    <input
                                                                        type="number"
                                                                        step="any"
                                                                        value={rec[col.key] ?? ""}
                                                                        onChange={e => updateField(idx, col.key, e.target.value)}
                                                                        className="w-16 px-1 py-0.5 text-xs bg-transparent border border-green-300/50 dark:border-green-700/50 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-right"
                                                                    />
                                                                </td>
                                                            );
                                                        }
                                                        if (col.computed) {
                                                            return (
                                                                <td key={col.key} className={cn(tdClass, "text-right font-medium")}>
                                                                    {fmt(rec[col.key])}
                                                                </td>
                                                            );
                                                        }
                                                        return (
                                                            <td key={col.key} className={tdClass}>
                                                                {col.key === "sectorGcd" || col.key === "maxPax" || col.key === "maxCargoT"
                                                                    ? fmt(rec[col.key])
                                                                    : rec[col.key] ?? ""}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PooTable;