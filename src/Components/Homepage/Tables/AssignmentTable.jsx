import React, { useState } from "react";
import { Upload, Calendar } from "lucide-react";

// Mock data based on the provided wireframe/table
const SCENARIO_DATES = [
    "2026-03-08",
    "2026-03-15",
    "2026-03-22",
    "2026-03-29"
];

const MOCK_ASSIGNMENTS = [
    {
        rotationId: "RT-01",
        flights: [
            { flightNo: "FL101", acft: { mon: "VT-AXA", tue: "VT-AXA", wed: "VT-AXA", thu: "VT-AXA", fri: "VT-AXA", sat: "VT-AXA", sun: "VT-AXA" } },
            { flightNo: "FL102", acft: { mon: "VT-AXB", tue: "VT-AXB", wed: "VT-AXB", thu: "VT-AXB", fri: "VT-AXB", sat: "VT-AXB", sun: "VT-AXB" } },
            { flightNo: "FL103", acft: { mon: "VT-AXC", tue: "VT-AXC", wed: "VT-AXC", thu: "VT-AXC", fri: "VT-AXC", sat: "VT-AXC", sun: "VT-AXC" } },
        ]
    },
    {
        rotationId: "RT-02",
        flights: [
            { flightNo: "FL201", acft: { mon: "VT-AZA", tue: "VT-AZA", wed: "VT-AZA", thu: "VT-AZA", fri: "VT-AZA", sat: "VT-AZA", sun: "VT-AZA" } },
            { flightNo: "FL202", acft: { mon: "VT-AZB", tue: "VT-AZB", wed: "VT-AZB", thu: "VT-AZB", fri: "VT-AZB", sat: "VT-AZB", sun: "VT-AZB" } },
            { flightNo: "FL203", acft: { mon: "VT-AZC", tue: "VT-AZC", wed: "VT-AZC", thu: "VT-AZC", fri: "VT-AZC", sat: "VT-AZC", sun: "VT-AZC" } },
        ]
    },
    {
        rotationId: "RT-03",
        flights: [
            { flightNo: "FL301", acft: { mon: "VT-AXY", tue: "VT-AXY", wed: "VT-AXY", thu: "", fri: "", sat: "", sun: "" } },
            { flightNo: "FL302", acft: { mon: "VT-AYZ", tue: "VT-AYZ", wed: "VT-AYZ", thu: "VT-AYZ", fri: "VT-AYZ", sat: "", sun: "" } },
            { flightNo: "FL303", acft: { mon: "", tue: "VT-AXX", wed: "VT-AXX", thu: "", fri: "", sat: "VT-AXX", sun: "" } },
        ]
    }
];

const DAYS = [
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
    { key: "sun", label: "Sun" },
];

const generateDatesForSunday = (sundayDateStr) => {
    const sunday = new Date(sundayDateStr);
    const dates = {};

    // Go back 6 days to get Monday, then map forward
    for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() - (6 - i));
        const dayKey = DAYS[i].key;
        dates[dayKey] = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    return dates;
};

const AssignmentTable = () => {
    const [selectedWeekEnding, setSelectedWeekEnding] = useState(SCENARIO_DATES[0]);
    const weekDates = generateDatesForSunday(selectedWeekEnding);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl">
            {/* Header section with actions */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                            Assignment Table
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Assign aircraft to flights mapped by rotation
                        </p>
                    </div>
                    <div>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all">
                            <Upload size={18} />
                            Upload Assignment
                        </button>
                    </div>
                </div>

                {/* Sub Header Information Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Upload size={16} className="text-indigo-500" /> Accepted Format:
                        </p>
                        <p className="pl-6 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                            Excel spreadsheet format <br />
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">Date | Flight # | ACFT</span> <br />
                            (ACFT Regn)
                        </p>
                    </div>

                    <div className="flex flex-col justify-center">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Calendar size={14} /> Week ending (Sunday dates)
                        </label>
                        <select
                            value={selectedWeekEnding}
                            onChange={(e) => setSelectedWeekEnding(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                        >
                            {SCENARIO_DATES.map(date => (
                                <option key={date} value={date}>{date} (Sunday)</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-6">
                <div className="min-w-[900px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">

                    {/* Table Header */}
                    <div className="sticky top-0 z-10">
                        {/* Days Header */}
                        <div className="grid grid-cols-8 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <div className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center border-r border-slate-200 dark:border-slate-700">
                                Week Day
                            </div>
                            {DAYS.map(day => (
                                <div key={day.key} className="p-3 text-center font-bold text-slate-700 dark:text-slate-200 text-sm border-r last:border-0 border-slate-200 dark:border-slate-700">
                                    {day.label}
                                </div>
                            ))}
                        </div>
                        {/* Dates Header */}
                        <div className="grid grid-cols-8 bg-white dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600">
                            <div className="p-3 font-semibold text-slate-800 dark:text-slate-100 text-sm border-r border-slate-200 dark:border-slate-700">
                                Rotation #
                            </div>
                            {DAYS.map(day => (
                                <div key={`date-${day.key}`} className="p-2 text-center text-xs text-slate-500 dark:text-slate-400 border-r last:border-0 border-slate-200 dark:border-slate-700">
                                    {weekDates[day.key]}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {MOCK_ASSIGNMENTS.map((rotationGroup, index) => (
                            <div key={rotationGroup.rotationId} className="group transition-colors">
                                {/* Rotation Header Row */}
                                <div className="grid grid-cols-8 bg-slate-50 dark:bg-slate-800/50">
                                    <div className="p-2 font-bold text-indigo-700 dark:text-indigo-400 text-sm border-r border-slate-200 dark:border-slate-700">
                                        Rotation {rotationGroup.rotationId}
                                    </div>
                                    <div className="col-span-7 flex items-center px-4 text-xs text-slate-400">
                                        {/* Optional empty span or display text across rotation header */}
                                    </div>
                                </div>

                                {/* Flights under this Rotation */}
                                {rotationGroup.flights.map((flight, flightIdx) => (
                                    <div key={`${rotationGroup.rotationId}-${flight.flightNo}`} className="grid grid-cols-8 hover:bg-indigo-50 dark:hover:bg-slate-800/80 transition-colors">
                                        <div className="p-3 pl-6 text-sm font-medium text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 flex items-center">
                                            {flight.flightNo}
                                        </div>
                                        {DAYS.map(day => (
                                            <div key={`${flight.flightNo}-${day.key}`} className="p-3 text-center border-r last:border-0 border-slate-200 dark:border-slate-700">
                                                {flight.acft[day.key] ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                                        {flight.acft[day.key]}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AssignmentTable;

