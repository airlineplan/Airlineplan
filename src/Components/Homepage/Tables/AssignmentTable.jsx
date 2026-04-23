import React, { useState, useEffect, useRef } from "react";
import { Upload, Calendar, Loader2 } from "lucide-react";
import api from "../../../apiConfig"; // Adjust path as needed
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Hardcoded dates replaced by dynamic fetch from /master-weeks

const DAYS = [
    { key: "mon", label: "Mon", offset: -6 },
    { key: "tue", label: "Tue", offset: -5 },
    { key: "wed", label: "Wed", offset: -4 },
    { key: "thu", label: "Thu", offset: -3 },
    { key: "fri", label: "Fri", offset: -2 },
    { key: "sat", label: "Sat", offset: -1 },
    { key: "sun", label: "Sun", offset: 0 },
];

const generateDatesForSunday = (sundayDateStr) => {
    if (!sundayDateStr) return {};

    // Parse "YYYY-MM-DD" explicitly to avoid browser-specific timezone parsing quirks
    const [year, month, day] = sundayDateStr.split("-").map(Number);
    const sunday = new Date(Date.UTC(year, month - 1, day));

    const dates = {};
    DAYS.forEach(dayInfo => {
        const d = new Date(sunday);
        d.setUTCDate(sunday.getUTCDate() + dayInfo.offset);

        // Use toLocaleDateString with UTC timezone to ensure the display matches the UTC date
        dates[dayInfo.key] = d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC'
        });
    });
    return dates;
};

const AssignmentTable = () => {
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeekEnding, setSelectedWeekEnding] = useState("");
    const [assignmentsData, setAssignmentsData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const fetchWeeks = async () => {
        try {
            const response = await api.get("/master-weeks");
            const weeks = response.data.weeks || [];
            setAvailableWeeks(weeks);
            if (weeks.length > 0 && !selectedWeekEnding) {
                setSelectedWeekEnding(weeks[0]);
            }
        } catch (error) {
            console.error("Error fetching weeks", error);
        }
    };

    // Fetch available weeks on mount
    useEffect(() => {
        fetchWeeks();
    }, []);

    // Fetch data when the selected week changes
    useEffect(() => {
        if (selectedWeekEnding) {
            fetchAssignments();
        }
    }, [selectedWeekEnding]);

    const fetchAssignments = async () => {
        setIsLoadingData(true);
        try {
            const response = await api.get(`/getWeeklyAssignments?weekEnding=${selectedWeekEnding}`);
            const rawAssignments = response.data.data;

            // Transform flat DB structure into UI grouped structure
            const transformedData = formatDataForTable(rawAssignments);
            setAssignmentsData(transformedData);
        } catch (error) {
            console.error("Error fetching assignments", error);
            toast.error("Failed to load assignments");
        } finally {
            setIsLoadingData(false);
        }
    };

    // Groups flat Assignment documents into { rotationId: [ { flightNo, acft: { mon: 'VT', tue: '' } } ] }
    const formatDataForTable = (assignments) => {
        const groupedMap = new Map();

        assignments.forEach(assign => {
            const rotId = assign.rotationNumber ? `RT-${assign.rotationNumber}` : "Unassigned";
            const flightNo = assign.flightNumber;
            const reg = assign.aircraft?.registration || "";

            // Determine which day of the week this date is (0 = Sunday, 1 = Monday)
            const dateObj = new Date(assign.date);
            const jsDayOfWeek = dateObj.getDay();

            // Map JS Day (0-6) to our DAYS array keys
            const dayMap = { 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 0: "sun" };
            const dayKey = dayMap[jsDayOfWeek];

            if (!groupedMap.has(rotId)) {
                groupedMap.set(rotId, new Map());
            }

            const flightsMap = groupedMap.get(rotId);
            if (!flightsMap.has(flightNo)) {
                flightsMap.set(flightNo, { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" });
            }

            // Assign the aircraft registration to the specific day
            flightsMap.get(flightNo)[dayKey] = reg;
        });

        // Convert Map back to Array structure for rendering
        const finalArray = Array.from(groupedMap, ([rotationId, flightsMap]) => {
            const flightsArray = Array.from(flightsMap, ([flightNo, acft]) => ({ flightNo, acft }));
            return { rotationId, flights: flightsArray };
        });

        // Sort rotations (handle "Unassigned" putting it at the bottom)
        return finalArray.sort((a, b) => {
            if (a.rotationId === "Unassigned") return 1;
            if (b.rotationId === "Unassigned") return -1;
            return a.rotationId.localeCompare(b.rotationId);
        });
    };

    const fileInputRef = useRef(null);
    const weekDates = selectedWeekEnding ? generateDatesForSunday(selectedWeekEnding) : {};

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);
        try {
            const response = await api.post("/uploadAssignments", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const message = response.data?.message || "Assignments uploaded successfully!";
            if (response.status === 422 || response.data?.success === false) {
                toast.error(message);
            } else if (response.data?.diagnostics?.rejections && Object.values(response.data.diagnostics.rejections).some((count) => Number(count) > 0)) {
                toast.warning(message);
            } else {
                toast.success(message);
            }
            window.dispatchEvent(new CustomEvent("assignments:updated"));
            await fetchWeeks(); // Refresh dropdown range
            fetchAssignments(); // Refresh table immediately
        } catch (error) {
            console.error("Upload error", error);
            const message = error.response?.data?.message || "Error uploading file";
            toast.error(message);
        } finally {
            setIsUploading(false);
            event.target.value = null; // Reset input
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl relative">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
            />

            {/* Header section with actions */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                            Assignment
                        </h2>

                    </div>
                    <div>
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            {isUploading ? "Uploading..." : "Upload Assignment"}
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
                            Excel/CSV format <br />
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">Date | Flight # | ACFT</span> <br />
                            <span className="text-xs text-slate-500 dark:text-slate-400">ACFT must be the aircraft registration, for example VT-AAB.</span>
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
                            {availableWeeks.length === 0 ? (
                                <option disabled value="">No flights found</option>
                            ) : (
                                availableWeeks.map(date => (
                                    <option key={date} value={date}>{date} (Sunday)</option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-6 relative">

                {isLoadingData && (
                    <div className="absolute inset-0 z-20 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                <div className="min-w-[900px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                    {/* Table Header */}
                    <div className="sticky top-0 z-10">
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
                        {assignmentsData.length === 0 && !isLoadingData ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                No assignments found for this week. Please upload an assignment file.
                            </div>
                        ) : (
                            assignmentsData.map((rotationGroup) => (
                                <div key={rotationGroup.rotationId} className="group transition-colors">
                                    <div className="grid grid-cols-8 bg-slate-50 dark:bg-slate-800/50">
                                        <div className="p-2 font-bold text-indigo-700 dark:text-indigo-400 text-sm border-r border-slate-200 dark:border-slate-700">
                                            {rotationGroup.rotationId !== "Unassigned" ? `Rotation ${rotationGroup.rotationId.replace('RT-', '')}` : "Unassigned Flights"}
                                        </div>
                                        <div className="col-span-7 flex items-center px-4 text-xs text-slate-400"></div>
                                    </div>

                                    {rotationGroup.flights.map((flight) => (
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
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentTable;
