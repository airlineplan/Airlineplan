import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, Calendar, Globe2, MapPin, Search, ArrowUp, ArrowDown } from "lucide-react";
import axios from "axios";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useVirtualizer } from "@tanstack/react-virtual";

// --- CONSTANTS ---
const TIMEZONES = [
  'UTC-12:00', 'UTC-11:45', 'UTC-11:30', 'UTC-11:15', 'UTC-11:00', 'UTC-10:45', 'UTC-10:30', 'UTC-10:15', 'UTC-10:00', 'UTC-9:45', 'UTC-9:30', 'UTC-9:15', 'UTC-9:00', 'UTC-8:45', 'UTC-8:30', 'UTC-8:15', 'UTC-8:00', 'UTC-7:45', 'UTC-7:30', 'UTC-7:15', 'UTC-7:00', 'UTC-6:45', 'UTC-6:30', 'UTC-6:15', 'UTC-6:00', 'UTC-5:45', 'UTC-5:30', 'UTC-5:15', 'UTC-5:00', 'UTC-4:45', 'UTC-4:30', 'UTC-4:15', 'UTC-4:00', 'UTC-3:45', 'UTC-3:30', 'UTC-3:15', 'UTC-3:00', 'UTC-2:45', 'UTC-2:30', 'UTC-2:15', 'UTC-2:00', 'UTC-1:45', 'UTC-1:30', 'UTC-1:15', 'UTC-1:00', 'UTC-0:45', 'UTC-0:30', 'UTC-0:15', 'UTC+0:00', 'UTC+0:15', 'UTC+0:30', 'UTC+0:45', 'UTC+1:00', 'UTC+1:15', 'UTC+1:30', 'UTC+1:45', 'UTC+2:00', 'UTC+2:15', 'UTC+2:30', 'UTC+2:45', 'UTC+3:00', 'UTC+3:15', 'UTC+3:30', 'UTC+3:45', 'UTC+4:00', 'UTC+4:15', 'UTC+4:30', 'UTC+4:45', 'UTC+5:00', 'UTC+5:15', 'UTC+5:30', 'UTC+5:45', 'UTC+6:00', 'UTC+6:15', 'UTC+6:30', 'UTC+6:45', 'UTC+7:00', 'UTC+7:15', 'UTC+7:30', 'UTC+7:45', 'UTC+8:00', 'UTC+8:15', 'UTC+8:30', 'UTC+8:45', 'UTC+9:00', 'UTC+9:15', 'UTC+9:30', 'UTC+9:45', 'UTC+10:00', 'UTC+10:15', 'UTC+10:30', 'UTC+10:45', 'UTC+11:00', 'UTC+11:15', 'UTC+11:30', 'UTC+11:45', 'UTC+12:00'
];

// Configuration for dynamic left-hand columns
const MODE_COLUMNS = {
  Rotations: [{ key: 'rot', label: 'Rotation #' }, { key: 'variant', label: 'Variant' }],
  Sectors: [{ key: 'sector', label: 'Sector' }],
  Station: [{ key: 'type', label: 'Type' }, { key: 'sector', label: 'Sector' }],
  Aircraft: [{ key: 'ac', label: 'Aircraft' }, { key: 'variant', label: 'Variant' }]
};

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const calculateTruePosition = (flightDate, std, bt, weekStartStr, localTimezone, viewTimezone) => {
  if (!flightDate || !std || !bt || !weekStartStr) return { left: "0%", width: "0%" };

  const totalMinutesWeek = 7 * 24 * 60;
  const localOffset = parseUTCOffsetToMinutes(localTimezone);
  const viewOffset = parseUTCOffsetToMinutes(viewTimezone);

  const flightLocal = new Date(flightDate);
  const [stdH, stdM] = std.split(":").map(Number);
  flightLocal.setHours(stdH || 0, stdM || 0, 0, 0);

  const flightUTC = new Date(flightLocal.getTime() - localOffset * 60000);
  const flightInViewTZ = new Date(flightUTC.getTime() + viewOffset * 60000);

  const weekStart = new Date(weekStartStr);
  weekStart.setHours(0, 0, 0, 0);

  const elapsedMinutes = (flightInViewTZ - weekStart) / (1000 * 60);

  const [btH, btM] = bt.split(":").map(Number);
  const durationMinutes = (btH || 0) * 60 + (btM || 0);

  const leftPercent = (elapsedMinutes / totalMinutesWeek) * 100;
  const widthPercent = (durationMinutes / totalMinutesWeek) * 100;

  return {
    left: `${Math.max(0, leftPercent)}%`,
    width: `${Math.min(100 - Math.max(0, leftPercent), widthPercent)}%`
  };
};

const parseUTCOffsetToMinutes = (tz) => {
  const sign = tz.includes("+") ? 1 : -1;
  const [hours, minutes] = tz.replace("UTC", "").replace("+", "").replace("-", "").split(":").map(Number);
  return sign * ((hours || 0) * 60 + (minutes || 0));
};

// --- SUB-COMPONENTS ---
const TableInput = ({ name, value, onChange, placeholder }) => (
  <div className="relative group mt-1" onClick={(e) => e.stopPropagation()}>
    <input
      type="text"
      name={name}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-7 px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all"
    />
    <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
  </div>
);

const FlightBar = ({ flight, weekStart, mode, timezone }) => {
  const pos = calculateTruePosition(
    flight.date,
    flight.std,
    flight.bt,
    weekStart,
    flight.localTimezone || "UTC+5:30",
    timezone
  );
  
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
  const [timezone, setTimezone] = useState("UTC+5:30");
  
  // API Driven Weeks
  const [weeks, setWeeks] = useState([]);
  const [weekStart, setWeekStart] = useState("");
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter & Sort State
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });

  // 1. Fetch available Sundays from Master Table
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const res = await axios.get("https://airlineplan.com/master-weeks", {
          headers: { "x-access-token": accessToken }
        });

        if (res.data?.weeks?.length) {
          setWeeks(res.data.weeks);
          setWeekStart(res.data.weeks[0]); // Default to the first available Sunday
        }
      } catch (err) {
        console.error("Failed to fetch weeks", err);
      }
    };

    fetchWeeks();
  }, []);

  // 2. Reset filters and sorting when mode changes
  useEffect(() => {
    setFilters({});
    setSortConfig({ key: null, direction: "Up" });
  }, [mode]);

  // 3. Fetch Timeline Data when dependencies change
  useEffect(() => {
    if (!weekStart) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get("https://airlineplan.com/view-page-data", {
          headers: { "x-access-token": accessToken },
          params: { mode, station: stationCode, weekStart, viewTimezone: timezone }
        });

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
  }, [mode, stationCode, weekStart, timezone]);

  // --- Handlers for Filtering & Sorting ---
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up",
    }));
  };

  // --- Processed Data (Filtered & Sorted on Frontend) ---
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply Filters
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key]?.toLowerCase();
      if (filterValue) {
        result = result.filter((row) => {
          const cellValue = row.leftColumn?.[key];
          return cellValue && String(cellValue).toLowerCase().includes(filterValue);
        });
      }
    });

    // Apply Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a.leftColumn?.[sortConfig.key] || "";
        const valB = b.leftColumn?.[sortConfig.key] || "";
        
        if (typeof valA === "number" && typeof valB === "number") {
            return sortConfig.direction === "Up" ? valA - valB : valB - valA;
        }

        if (sortConfig.direction === "Up") {
          return String(valA).localeCompare(String(valB), undefined, { numeric: true });
        } else {
          return String(valB).localeCompare(String(valA), undefined, { numeric: true });
        }
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  // --- VIRTUALIZATION SETUP ---
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // 56px matches the h-14 Tailwind class we use for rows
    overscan: 10, // Buffer items to render outside the viewport
  });

  // UI Date Helpers
  const getEndOfWeek = (startStr) => {
    if (!startStr) return "";
    const end = new Date(startStr);
    end.setDate(end.getDate() + 6);
    return end;
  };

  const endOfWeek = getEndOfWeek(weekStart);

  const formatDateHeader = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ' |');
  };

  const formatDropdownDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-4 rounded-2xl relative">

      {/* 1. Control Header */}
      <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800 shrink-0">

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

        {/* Timezone */}
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

        {/* Week Start Picker (API Driven Sunday Dropdown) */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Week</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-h-60 overflow-y-auto"
              disabled={weeks.length === 0}
            >
              {weeks.length === 0 ? (
                <option value="">Loading weeks...</option>
              ) : (
                weeks.map((wk, idx) => (
                  <option key={idx} value={wk}>
                    {formatDropdownDate(wk)}
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Info Legend */}
        <div className="ml-auto flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-medium px-3 py-1.5 rounded-md border border-yellow-200 dark:border-yellow-700/50 hidden sm:flex">
          <div className="w-2 h-2 bg-emerald-700 border border-slate-900 inline-block" />
          Connections highlighted with end of rectangle
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Loading Timeline...</span>
          </div>
        </div>
      )}

      {/* 2. Main Data View - Structure adjusted for Virtualization */}
      <div className="flex-1 overflow-x-auto mt-4 custom-scrollbar flex flex-col">
        <div className="min-w-[1200px] flex-1 flex flex-col">

          {/* TIMELINE HEADER (Static/Outside Scroll Container) */}
          <div className="flex border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
            {/* Left Header Section */}
            <div className="w-64 shrink-0 flex items-stretch border-r border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90">
              {MODE_COLUMNS[mode].map((col) => (
                <div key={col.key} className="flex-1 px-3 py-2 flex flex-col gap-1 border-r last:border-0 border-slate-300 dark:border-slate-700">
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortConfig.key === col.key ? (
                      sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUp size={12} className="opacity-0 hover:opacity-30 transition-opacity" />
                    )}
                  </div>
                  <TableInput
                    name={col.key}
                    value={filters[col.key]}
                    onChange={handleFilterChange}
                    placeholder="Filter..."
                  />
                </div>
              ))}
            </div>

            {/* Right Timeline Date Headers */}
            <div className="flex-1 flex">
              <div className="flex-1 border-r border-slate-300 dark:border-slate-700 flex flex-col justify-center text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="text-left px-2 py-1 border-b border-slate-200 dark:border-slate-700/50">
                  {weekStart ? formatDateHeader(weekStart) : "Loading..."}
                </div>
                <div className="px-2 py-0.5">00:01</div>
              </div>
              <div className="flex-1 flex flex-col justify-center text-xs font-medium text-slate-600 dark:text-slate-400 text-right">
                <div className="px-2 py-1 border-b border-slate-200 dark:border-slate-700/50">
                  {endOfWeek ? formatDateHeader(endOfWeek) : "Loading..."}
                </div>
                <div className="px-2 py-0.5">00:00</div>
              </div>
            </div>
          </div>

          {/* VIRTUALIZED DATA ROWS CONTAINER */}
          <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
            {processedData.length === 0 && !loading ? (
              <div className="h-32 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
                {data.length === 0 ? "No flights found for this selection." : "No flights match your filter criteria."}
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = processedData[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Left Metadata Column */}
                      <div className="w-64 shrink-0 flex items-stretch border-r border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800/30 relative z-10">
                        {MODE_COLUMNS[mode].map((col) => (
                          <div key={col.key} className="flex-1 flex items-center px-3 border-r last:border-0 border-slate-200 dark:border-slate-700/50 truncate">
                            {row.leftColumn?.[col.key] || "-"}
                          </div>
                        ))}
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
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewPage;