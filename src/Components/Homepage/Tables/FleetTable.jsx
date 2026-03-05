import React, { useState } from "react";
import { Upload, Calendar, Search, Filter, Info } from "lucide-react";

// Mock data directly derived from the example image
const MOCK_ASSETS = [
    {
        sno: 1, category: "Aircraft", type: "A320ceo", variant: "A320-214", sn: "4120", regn: "VT-DKU",
        entry: "8 Oct 25", exit: "16 Oct 25", titled: "", ownership: "Operating lease", mtow: "77000", status: "Active",
        schedule: [
            { date: "14 Oct 25", status: "assigned", label: "0" },
            { date: "15 Oct 25", status: "maintenance", label: "C-check" },
            { date: "16 Oct 25", status: "maintenance", label: "C-check" },
            { date: "17 Oct 25", status: "assigned", label: "1" },
            { date: "18 Oct 25", status: "assigned", label: "2" },
            { date: "19 Oct 25", status: "available", label: "Available" },
            { date: "20 Oct 25", status: "available", label: "Available" },
        ]
    },
    {
        sno: 2, category: "Engine", type: "CFM56-5B", variant: "5B6", sn: "685912", regn: "VT-DKU #1",
        entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "",
        schedule: [
            { date: "14 Oct 25", status: "assigned", label: "" },
            { date: "15 Oct 25", status: "maintenance", label: "C-check" },
            { date: "16 Oct 25", status: "maintenance", label: "C-check" },
            { date: "17 Oct 25", status: "assigned", label: "" },
            { date: "18 Oct 25", status: "assigned", label: "" },
            { date: "19 Oct 25", status: "available", label: "" },
            { date: "20 Oct 25", status: "available", label: "" },
        ]
    },
    {
        sno: 3, category: "Engine", type: "CFM56-5B", variant: "5B6", sn: "685911", regn: "VT-DKU #2",
        entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "",
        schedule: [
            { date: "14 Oct 25", status: "available", label: "Available" },
            { date: "15 Oct 25", status: "available", label: "Available" },
            { date: "16 Oct 25", status: "available", label: "Available" },
            { date: "17 Oct 25", status: "available", label: "Available" },
            { date: "18 Oct 25", status: "available", label: "Available" },
            { date: "19 Oct 25", status: "available", label: "Available" },
            { date: "20 Oct 25", status: "available", label: "Available" },
        ]
    },
    {
        sno: 4, category: "APU", type: "131-9A", variant: "", sn: "2910", regn: "VT-DKU",
        entry: "", exit: "", titled: "", ownership: "", mtow: "", status: "",
        schedule: [
            { date: "14 Oct 25", status: "assigned", label: "" },
            { date: "15 Oct 25", status: "maintenance", label: "C-check" },
            { date: "16 Oct 25", status: "maintenance", label: "C-check" },
            { date: "17 Oct 25", status: "assigned", label: "" },
            { date: "18 Oct 25", status: "assigned", label: "" },
            { date: "19 Oct 25", status: "maintenance", label: "C-check" },
            { date: "20 Oct 25", status: "maintenance", label: "C-check" },
        ]
    },
    {
        sno: 5, category: "Engine", type: "CFM56-5B", variant: "5B6", sn: "685782", regn: "",
        entry: "10 Oct 25", exit: "17 Oct 25", titled: "Spare", ownership: "Operating lease", mtow: "", status: "",
        schedule: [
            { date: "14 Oct 25", status: "maintenance", label: "C-check" },
            { date: "15 Oct 25", status: "maintenance", label: "C-check" },
            { date: "16 Oct 25", status: "available", label: "Available" },
            { date: "17 Oct 25", status: "available", label: "Available" },
            { date: "18 Oct 25", status: "available", label: "Available" },
            { date: "19 Oct 25", status: "assigned", label: "Assigned" },
            { date: "20 Oct 25", status: "maintenance", label: "Maintenance" },
        ]
    },
];

const DATES = ["14 Oct 25", "15 Oct 25", "16 Oct 25", "17 Oct 25", "18 Oct 25", "19 Oct 25", "20 Oct 25"];

const MONTHS = ["October 2025", "November 2025", "December 2025"];

const getStatusColor = (status) => {
    switch (status) {
        case "available":
            return "bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800";
        case "assigned":
            return "bg-[#8de08d] dark:bg-green-900/40 text-green-900 dark:text-green-200 border-green-400 dark:border-green-800"; // matches image green
        case "maintenance":
            return "bg-stone-500 dark:bg-stone-700 text-white dark:text-stone-200 border-stone-600 dark:border-stone-600"; // matches image grey
        default:
            return "bg-transparent";
    }
};

const FleetTable = () => {
    const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl">
            {/* Header section with actions */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Fleet Status & Asset Management
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Graphical display of fleet entries, exits, and daily availability.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <Filter size={16} />
                            Filter
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all">
                            <Upload size={18} />
                            Import Fleet Data
                        </button>
                    </div>
                </div>

                {/* Toolbar Context */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Regn, SN, or Type..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-200"
                        />
                    </div>

                    {/* Month selector and Legend */}
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-slate-500" />
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden md:block"></div>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-orange-200 dark:bg-orange-800 border border-orange-300 dark:border-orange-700"></span> Available
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-[#8de08d] dark:bg-green-800 border border-green-400 dark:border-green-700"></span> Assigned
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-stone-500 dark:bg-stone-600 border border-stone-600 dark:border-stone-500"></span> Maintenance
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table wrapper - Horizontal scrolling */}
            <div className="flex-1 overflow-auto p-6">
                <div className="inline-flex min-w-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">

                    {/* Frozen Left Pane (Asset Details) */}
                    <div className="flex-shrink-0 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-600 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)_inset]">
                        {/* Headers */}
                        <div className="flex font-semibold text-slate-700 dark:text-slate-200 text-xs bg-[#f4e6fa] dark:bg-fuchsia-900/30 border-b border-slate-200 dark:border-slate-700">
                            <div className="w-12 p-3 border-r border-slate-200 dark:border-slate-700 text-center">S.No</div>
                            <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">Asset category</div>
                            <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">Asset type</div>
                            <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">Asset variant</div>
                            <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">Asset SN</div>
                            <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">Asset Regn</div>
                            <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">Fleet entry</div>
                            <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">Fleet exit</div>
                            <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">Titled/Spare</div>
                            <div className="w-32 p-3 border-r border-slate-200 dark:border-slate-700">Ownership</div>
                            <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700 text-right">MTOW (Kg)</div>
                            <div className="w-28 p-3">Status today</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {MOCK_ASSETS.map((asset) => (
                                <div key={asset.sno} className="flex text-xs text-slate-800 dark:text-slate-300 bg-[#fbf5fd] dark:bg-fuchsia-900/10 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-colors">
                                    <div className="w-12 p-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium">{asset.sno}</div>
                                    <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">{asset.category}</div>
                                    <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">{asset.type}</div>
                                    <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700">{asset.variant}</div>
                                    <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">{asset.sn}</div>
                                    <div className="w-28 p-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100">{asset.regn}</div>
                                    <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">{asset.entry}</div>
                                    <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">{asset.exit}</div>
                                    <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700">{asset.titled}</div>
                                    <div className="w-32 p-3 border-r border-slate-200 dark:border-slate-700">{asset.ownership}</div>
                                    <div className="w-24 p-3 border-r border-slate-200 dark:border-slate-700 text-right">{asset.mtow}</div>
                                    <div className="w-28 p-3">{asset.status}</div>
                                </div>
                            ))}
                        </div>
                        {/* Footer Notes from image */}
                        <div className="p-3 bg-white dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 max-w-lg mt-2 space-y-1">
                            <div><span className="font-medium">User enterable fields</span>: (May preceed Fleet entry, May succeed Fleet exit)</div>
                            <div>- Available: No flight assigned for the date</div>
                            <div>- Assigned: Flight(s) assigned for the date</div>
                            <div>- Scheduled maintenance</div>
                        </div>
                    </div>

                    {/* Scrollable Right Pane (Dates/Schedule) */}
                    <div className="flex-grow flex flex-col">
                        {/* Date Headers */}
                        <div className="flex flex-col bg-[#fae6da] dark:bg-orange-900/30 border-b border-slate-200 dark:border-slate-700">
                            {/* Top level grouping info row - minimal as per image */}
                            <div className="flex text-xs font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                                {DATES.map((date, i) => (
                                    <div key={`header-g-${i}`} className="w-32 p-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center opacity-0 select-none">
                                        -
                                    </div>
                                ))}
                            </div>
                            {/* Actual Dates */}
                            <div className="flex text-xs font-semibold text-slate-800 dark:text-slate-100 pb-0.5">
                                {DATES.map((date, i) => (
                                    <div key={`date-${i}`} className="w-32 p-2 px-3 border-r border-slate-300 dark:border-slate-600 text-center whitespace-nowrap">
                                        {date}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Schedule Rows */}
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {MOCK_ASSETS.map((asset) => (
                                <div key={`sched-${asset.sno}`} className="flex">
                                    {asset.schedule.map((day, idx) => {
                                        const classes = getStatusColor(day.status);
                                        return (
                                            <div
                                                key={`day-${idx}`}
                                                className={`w-32 p-2 border-r border-b ${classes} text-xs truncate text-center flex items-center justify-center transition-opacity hover:opacity-90`}
                                            >
                                                {day.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Extra spacer rows to match height if needed */}
                        <div className="flex-1 min-h-[100px] border-l border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50" />
                    </div>

                </div>
            </div>

            {/* Legend / Info bar at bottom */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-b-xl flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Info size={14} />
                    <span>This grid is auto-populated based on Master table FH, BH and Departure metric logic. Month is dynamically selectable.</span>
                </div>
            </div>
        </div>
    );
};

export default FleetTable;
