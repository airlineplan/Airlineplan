import React, { useState, useEffect } from "react";
import { Upload, Calendar, Search, Filter, Info, Plus, Save, Trash2 } from "lucide-react";
import moment from "moment";

// Helper to generate dates for the schedule view
const generateDates = (startDate, count = 7) => {
    return Array.from({ length: count }).map((_, i) =>
        moment(startDate).add(i, 'days').format("DD MMM YY")
    );
};

const MONTHS = ["October 2025", "November 2025", "December 2025"];
const CATEGORIES = ["Aircraft", "Engine", "APU", "Other"];
const STATUSES = ["Active", "Available", "Assigned", "Maintenance", "Retired"];
// Added Ownership Types
const OWNERSHIP_TYPES = ["Owned with no lien", "Operating lease", "Finance lease", "Wet lease"];

const getStatusColor = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("available")) return "bg-orange-200 dark:bg-orange-900/40 text-orange-900 border-orange-300";
    if (s.includes("assigned") || s === "1" || s === "2" || s === "0") return "bg-[#8de08d] dark:bg-green-900/40 text-green-900 border-green-400";
    if (s.includes("maintenance") || s.includes("check")) return "bg-stone-500 dark:bg-stone-700 text-white border-stone-600";
    return "bg-transparent";
};

const FleetTable = () => {
    const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Base schedule dates
    const [scheduleDates, setScheduleDates] = useState(generateDates("2025-10-14", 7));

    // Dynamic State for Assets (Start with one empty row)
    const [assets, setAssets] = useState([
        {
            id: Date.now(),
            category: "Aircraft", type: "", variant: "", sn: "", regn: "",
            entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "Available",
            schedule: Array(7).fill({ status: "available", label: "" })
        }
    ]);

    // Handle Input Changes for Asset Details
    const handleInputChange = (id, field, value) => {
        setAssets(prev => prev.map(asset =>
            asset.id === id ? { ...asset, [field]: value } : asset
        ));
    };

    // Handle Schedule Cell Changes (for entering C-checks, etc.)
    const handleScheduleChange = (assetId, dayIndex, value) => {
        setAssets(prev => prev.map(asset => {
            if (asset.id !== assetId) return asset;
            const newSchedule = [...asset.schedule];
            // Auto-detect status based on user input
            let newStatus = "available";
            if (value.toLowerCase().includes("check") || value.toLowerCase().includes("maint")) newStatus = "maintenance";
            else if (value !== "") newStatus = "assigned";

            newSchedule[dayIndex] = { label: value, status: newStatus };
            return { ...asset, schedule: newSchedule };
        }));
    };

    const handleAddRow = () => {
        setAssets([...assets, {
            id: Date.now(),
            category: "Aircraft", type: "", variant: "", sn: "", regn: "",
            entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "Available",
            schedule: Array(7).fill({ status: "available", label: "" })
        }]);
    };

    const handleDeleteRow = (id) => {
        if (assets.length > 1) {
            setAssets(assets.filter(a => a.id !== id));
        }
    };

    // Save to Backend (Placeholder for your API call)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Filter out empty rows (where user hasn't typed an SN yet)
            const validAssets = assets.filter(a => a.sn && a.sn.trim() !== "");

            if (validAssets.length === 0) {
                alert("No valid assets to save. Please enter at least a Serial Number.");
                setIsSaving(false);
                return;
            }

            // await api.post("/fleet/bulk-save", { fleetData: validAssets });
            alert("Fleet data saved successfully!");

            // Optional: Re-fetch the data to get the true MongoDB _ids
            // fetchFleetData(); 
        } catch (error) {
            console.error("Error saving fleet", error);
            alert(error.response?.data?.message || "Failed to save fleet data.");
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
            {/* Header section */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Fleet Status & Asset Management
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Editable display of fleet entries, exits, and daily availability.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors">
                            <Upload size={16} /> Import
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all disabled:opacity-70"
                        >
                            <Save size={18} /> {isSaving ? "Saving..." : "Save Fleet Data"}
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Regn, SN, Type..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                        />
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-200 border-orange-300 border"></span> Available</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#8de08d] border-green-400 border"></span> Assigned</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-stone-500 border-stone-600 border"></span> Maintenance</div>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-6">
                <div className="inline-flex min-w-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">

                    {/* Left Pane: Asset Details */}
                    <div className="flex-shrink-0 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r-2 border-slate-300 shadow-xl">
                        {/* Headers */}
                        <div className="flex font-semibold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider bg-[#f4e6fa] dark:bg-fuchsia-900/30 border-b border-slate-200">
                            <div className="w-10 p-2 border-r text-center">#</div>
                            <div className="w-28 p-2 border-r">Category</div>
                            <div className="w-24 p-2 border-r">Type</div>
                            <div className="w-24 p-2 border-r">Variant</div>
                            <div className="w-24 p-2 border-r">Asset SN *</div>
                            <div className="w-24 p-2 border-r">Regn</div>
                            <div className="w-28 p-2 border-r">Entry Dt</div>
                            <div className="w-28 p-2 border-r">Exit Dt</div>
                            <div className="w-24 p-2 border-r">Title/Spare</div>
                            <div className="w-32 p-2 border-r">Ownership</div>
                            <div className="w-24 p-2 border-r text-right">MTOW</div>
                            <div className="w-28 p-2 border-r">Status</div>
                            <div className="w-10 p-2"></div>
                        </div>

                        {/* Editable Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredAssets.map((asset, index) => (
                                <div key={asset.id} className="flex text-xs text-slate-800 dark:text-slate-200 bg-[#fbf5fd] dark:bg-fuchsia-900/10 hover:bg-white transition-colors">
                                    <div className="w-10 p-2 border-r flex items-center justify-center font-medium text-slate-500">{index + 1}</div>
                                    <div className="w-28 p-1 border-r">
                                        <select value={asset.category} onChange={e => handleInputChange(asset.id, "category", e.target.value)} className="w-full h-full bg-transparent outline-none">
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24 p-1 border-r"><input type="text" value={asset.type} onChange={e => handleInputChange(asset.id, "type", e.target.value)} className="w-full h-full bg-transparent outline-none px-1" placeholder="e.g. A320" /></div>
                                    <div className="w-24 p-1 border-r"><input type="text" value={asset.variant} onChange={e => handleInputChange(asset.id, "variant", e.target.value)} className="w-full h-full bg-transparent outline-none px-1" /></div>
                                    <div className="w-24 p-1 border-r"><input type="text" value={asset.sn} onChange={e => handleInputChange(asset.id, "sn", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 font-bold text-emerald-600" required /></div>
                                    <div className="w-24 p-1 border-r"><input type="text" value={asset.regn} onChange={e => handleInputChange(asset.id, "regn", e.target.value.toUpperCase())} className="w-full h-full bg-transparent outline-none px-1 uppercase font-semibold" placeholder="VT-XXX" /></div>
                                    <div className="w-28 p-1 border-r"><input type="date" value={asset.entry} onChange={e => handleInputChange(asset.id, "entry", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-[11px]" /></div>
                                    <div className="w-28 p-1 border-r"><input type="date" value={asset.exit} onChange={e => handleInputChange(asset.id, "exit", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-[11px]" /></div>
                                    <div className="w-24 p-1 border-r"><input type="text" value={asset.titled} onChange={e => handleInputChange(asset.id, "titled", e.target.value)} className="w-full h-full bg-transparent outline-none px-1" /></div>

                                    {/* UPDATED: Ownership is now a dropdown */}
                                    <div className="w-32 p-1 border-r">
                                        <select value={asset.ownership} onChange={e => handleInputChange(asset.id, "ownership", e.target.value)} className="w-full h-full bg-transparent outline-none px-1">
                                            <option value="" disabled className="text-gray-400">Select Lease</option>
                                            {OWNERSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>

                                    <div className="w-24 p-1 border-r"><input type="number" value={asset.mtow} onChange={e => handleInputChange(asset.id, "mtow", e.target.value)} className="w-full h-full bg-transparent outline-none px-1 text-right" /></div>
                                    <div className="w-28 p-1 border-r">
                                        <select value={asset.status} onChange={e => handleInputChange(asset.id, "status", e.target.value)} className="w-full h-full bg-transparent outline-none">
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-10 p-1 flex items-center justify-center">
                                        <button onClick={() => handleDeleteRow(asset.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
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

                    {/* Right Pane: Schedule/Ground Days */}
                    <div className="flex-grow flex flex-col">
                        <div className="flex flex-col bg-[#fae6da] dark:bg-orange-900/30 border-b border-slate-200">
                            <div className="flex text-xs font-semibold text-slate-800 dark:text-slate-100 pb-0.5 pt-6">
                                {scheduleDates.map((date, i) => (
                                    <div key={`date-${i}`} className="w-32 p-2 px-3 border-r border-slate-300 text-center whitespace-nowrap">
                                        {date}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAssets.map((asset) => (
                                <div key={`sched-${asset.id}`} className="flex h-8">
                                    {asset.schedule.map((day, idx) => {
                                        const classes = getStatusColor(day.status);
                                        return (
                                            <div key={`day-${idx}`} className={`w-32 border-r border-b ${classes} transition-all`}>
                                                <input
                                                    type="text"
                                                    value={day.label}
                                                    onChange={(e) => handleScheduleChange(asset.id, idx, e.target.value)}
                                                    placeholder="-"
                                                    className="w-full h-full bg-transparent outline-none text-center text-xs placeholder:text-black/20 dark:placeholder:text-white/20 focus:bg-white/50 dark:focus:bg-black/20"
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
                    <span>Type "C-check" or "Maintenance" in the schedule grid to register ground days.</span>
                </div>
            </div>
        </div>
    );
};

export default FleetTable;