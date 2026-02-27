import React, { useState, useEffect } from "react";
import { ChevronDown, Calendar, Globe2, MapPin } from "lucide-react";
import axios from "axios";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- CONSTANTS ---
const TIMEZONES = [
  'UTC-12:00', 'UTC-11:45', 'UTC-11:30', 'UTC-11:15', 'UTC-11:00', 'UTC-10:45', 'UTC-10:30', 'UTC-10:15', 'UTC-10:00', 'UTC-9:45', 'UTC-9:30', 'UTC-9:15', 'UTC-9:00', 'UTC-8:45', 'UTC-8:30', 'UTC-8:15', 'UTC-8:00', 'UTC-7:45', 'UTC-7:30', 'UTC-7:15', 'UTC-7:00', 'UTC-6:45', 'UTC-6:30', 'UTC-6:15', 'UTC-6:00', 'UTC-5:45', 'UTC-5:30', 'UTC-5:15', 'UTC-5:00', 'UTC-4:45', 'UTC-4:30', 'UTC-4:15', 'UTC-4:00', 'UTC-3:45', 'UTC-3:30', 'UTC-3:15', 'UTC-3:00', 'UTC-2:45', 'UTC-2:30', 'UTC-2:15', 'UTC-2:00', 'UTC-1:45', 'UTC-1:30', 'UTC-1:15', 'UTC-1:00', 'UTC-0:45', 'UTC-0:30', 'UTC-0:15', 'UTC+0:00', 'UTC+0:15', 'UTC+0:30', 'UTC+0:45', 'UTC+1:00', 'UTC+1:15', 'UTC+1:30', 'UTC+1:45', 'UTC+2:00', 'UTC+2:15', 'UTC+2:30', 'UTC+2:45', 'UTC+3:00', 'UTC+3:15', 'UTC+3:30', 'UTC+3:45', 'UTC+4:00', 'UTC+4:15', 'UTC+4:30', 'UTC+4:45', 'UTC+5:00', 'UTC+5:15', 'UTC+5:30', 'UTC+5:45', 'UTC+6:00', 'UTC+6:15', 'UTC+6:30', 'UTC+6:45', 'UTC+7:00', 'UTC+7:15', 'UTC+7:30', 'UTC+7:45', 'UTC+8:00', 'UTC+8:15', 'UTC+8:30', 'UTC+8:45', 'UTC+9:00', 'UTC+9:15', 'UTC+9:30', 'UTC+9:45', 'UTC+10:00', 'UTC+10:15', 'UTC+10:30', 'UTC+10:45', 'UTC+11:00', 'UTC+11:15', 'UTC+11:30', 'UTC+11:45', 'UTC+12:00'
];

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UTILITY: Calculate true 7-day timeline position ---
const calculateTruePosition = (
  flightDate,
  std,
  bt,
  weekStartStr,
  localTimezone,
  viewTimezone
) => {
  if (!flightDate || !std || !bt) return { left: "0%", width: "0%" };

  const totalMinutesWeek = 7 * 24 * 60;

  // Offsets
  const localOffset = parseUTCOffsetToMinutes(localTimezone);
  const viewOffset = parseUTCOffsetToMinutes(viewTimezone);

  // --- Build flight local datetime ---
  const flightLocal = new Date(flightDate);
  const [stdH, stdM] = std.split(":").map(Number);
  flightLocal.setHours(stdH || 0, stdM || 0, 0, 0);

  // --- Convert Local → UTC ---
  const flightUTC = new Date(flightLocal.getTime() - localOffset * 60000);

  // --- Convert UTC → View Timezone ---
  const flightInViewTZ = new Date(flightUTC.getTime() + viewOffset * 60000);

  // --- Week Start in View Timezone ---
  const weekStart = new Date(weekStartStr);
  weekStart.setHours(0, 0, 0, 0);

  // Calculate minutes from week start
  const elapsedMinutes = (flightInViewTZ - weekStart) / (1000 * 60);

  // Duration
  const [btH, btM] = bt.split(":").map(Number);
  const durationMinutes = (btH || 0) * 60 + (btM || 0);

  const leftPercent = (elapsedMinutes / totalMinutesWeek) * 100;
  const widthPercent = (durationMinutes / totalMinutesWeek) * 100;

  return {
    left: `${Math.max(0, leftPercent)}%`,
    width: `${Math.min(100 - Math.max(0, leftPercent), widthPercent)}%`
  };
};

// --- SUB-COMPONENTS ---
const FlightBar = ({ flight, weekStart, mode, timezone }) => {
  const pos = calculateTruePosition(
    flight.date,
    flight.std,
    flight.bt,
    weekStart,
    flight.localTimezone || "UTC+5:30", // from backend (important)
    timezone
  );
  // Determine text inside the bar based on the selected mode
  let blockLabel = "";
  if (mode === "Rotations" || mode === "Aircraft") blockLabel = flight.sector || `${flight.depStn}-${flight.arrStn}`;
  if (mode === "Sectors" || mode === "Station") blockLabel = flight.variant || "N/A";

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 h-6 bg-[#e8a3d8] dark:bg-fuchsia-600/80 rounded-sm flex items-center justify-center text-[10px] font-bold text-slate-900 dark:text-white shadow-sm overflow-hidden whitespace-nowrap px-1"
      style={{ left: pos.left, width: pos.width }}
      title={`${blockLabel} | STD: ${flight.std} - BT: ${flight.bt}`}
    >
      <span className="truncate">{blockLabel}</span>

      {/* Connection Logic Placeholders (Can be driven by backend flags later) */}
      {flight.connectionRight && <div className="absolute -bottom-3 right-0 w-3 h-4 bg-emerald-700 border border-slate-900 z-10" />}
      {flight.connectionLeft && <div className="absolute -bottom-3 left-0 w-3 h-4 bg-emerald-700 border border-slate-900 z-10" />}
    </div>
  );
};

const TimelineGrid = () => (
  <div className="absolute inset-0 flex pointer-events-none">
    {[...Array(7)].map((_, i) => (
      <div key={i} className="flex-1 border-r border-slate-300 dark:border-slate-700/50 border-dashed last:border-0" />
    ))}
  </div>
);

// --- MAIN COMPONENT ---
const ViewPage = () => {
  const [mode, setMode] = useState("Rotations");
  const [stationCode, setStationCode] = useState("DEL");
  const [timezone, setTimezone] = useState("UTC+5:30"); // Added state for the timezone

  const getStartOfWeek = () => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());

    return sunday.toISOString().split("T")[0];
  };

  const [weekStart, setWeekStart] = useState(getStartOfWeek());

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get("https://airlineplan.com/view-page-data", {
          headers: { "x-access-token": accessToken },
          params: {
            mode,
            station: stationCode,
            weekStart,
            viewTimezone: timezone
          }
        });

        // Ensure we are setting the 'rows' array from our optimized backend response
        if (response.data && response.data.rows) {
          setData(response.data.rows);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching view data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, stationCode, weekStart]);

  // UI Date Helpers
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ' |');
  };

  const parseUTCOffsetToMinutes = (tz) => {
    // Example: "UTC+5:30"
    const sign = tz.includes("+") ? 1 : -1;
    const [hours, minutes] = tz.replace("UTC", "").replace("+", "").replace("-", "").split(":").map(Number);
    return sign * ((hours || 0) * 60 + (minutes || 0));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-4 rounded-2xl relative">

      {/* 1. Control Header */}
      <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Mode</label>
          <div className="relative">
            <select
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="Rotations">Rotations</option>
              <option value="Sectors">Sectors</option>
              <option value="Station">Station</option>
              <option value="Aircraft">Aircraft</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic Station Input */}
        {mode === "Station" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Station</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-3 py-1.5 w-24 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Timezone (Visual Only For Now) */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Timezone</label>
          <div className="relative">
            <Globe2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Week Start Picker */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Week Start</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Info Legend */}
        <div className="ml-auto flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-medium px-3 py-1.5 rounded-md border border-yellow-200 dark:border-yellow-700/50 hidden sm:flex">
          <div className="w-2 h-2 bg-emerald-700 border border-slate-900 inline-block" />
          Connections highlighted with end of rectangle
        </div>
      </div>

      {/* 2. Main Data View */}
      <div className="flex-1 overflow-auto mt-4 custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Loading Timeline...</span>
            </div>
          </div>
        )}

        <div className="min-w-[1200px]">

          {/* TIMELINE HEADER */}
          <div className="flex border-b border-slate-300 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-20">
            <div className="w-64 shrink-0 border-r border-slate-300 dark:border-slate-700" />

            <div className="flex-1 flex">
              <div className="flex-1 border-r border-slate-300 dark:border-slate-700 flex flex-col text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="text-left px-2 py-1 border-b border-slate-200 dark:border-slate-700/50">{formatDateHeader(weekStart)}</div>
                <div className="px-2 py-0.5">00:01</div>
              </div>
              <div className="flex-1 flex flex-col text-xs font-medium text-slate-600 dark:text-slate-400 text-right">
                <div className="px-2 py-1 border-b border-slate-200 dark:border-slate-700/50">{formatDateHeader(endOfWeek)}</div>
                <div className="px-2 py-0.5">00:00</div>
              </div>
            </div>
          </div>

          {/* LEFT COLUMN HEADERS */}
          <div className="flex border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="w-64 shrink-0 flex items-center px-4 py-2 border-r border-slate-300 dark:border-slate-700">
              {mode === "Rotations" && (<><div className="w-1/2">Rotation #</div><div className="w-1/2">Variant</div></>)}
              {(mode === "Sectors" || mode === "Station") && <div className="w-full text-right pr-4">Sector</div>}
              {mode === "Aircraft" && (<><div className="w-1/2">Aircraft</div><div className="w-1/2">Variant</div></>)}
            </div>
            <div className="flex-1" />
          </div>

          {/* DATA ROWS */}
          <div className="relative pb-10">
            {data.map((row, idx) => {

              return (
                <div key={idx} className="flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors h-14 group">

                  {/* Left Metadata Column */}
                  <div className="w-64 shrink-0 flex items-center px-4 border-r border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800/30 relative z-10">
                    {mode === "Rotations" && (<><div className="w-1/2 pl-4">{row.leftColumn?.rot}</div><div className="w-1/2">{row.leftColumn?.variant}</div></>)}
                    {mode === "Sectors" && <div className="w-full text-right pr-6">{row.leftColumn?.sector}</div>}
                    {mode === "Station" && (<><div className="w-2/3 text-xs text-slate-500 pr-2 text-right">{row.leftColumn?.type || ""}</div><div className="w-1/3 text-right pr-2">{row.leftColumn?.sector}</div></>)}
                    {mode === "Aircraft" && (<><div className="w-1/2">{row.leftColumn?.ac}</div><div className="w-1/2">{row.leftColumn?.variant}</div></>)}
                  </div>

                  {/* Timeline Row */}
                  <div className="flex-1 relative">
                    <TimelineGrid />
                    {row.flights?.map((flight, i) => (
                      <FlightBar
                        key={i}
                        flight={flight}
                        weekStart={weekStart}
                        mode={mode}
                        timezone={timezone}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {data.length === 0 && !loading && (
              <div className="h-32 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
                No flights found for this selection.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPage;