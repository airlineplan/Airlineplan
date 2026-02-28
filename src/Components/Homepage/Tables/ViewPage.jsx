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

// Configuration for dynamic left-hand columns (Matches exact screenshot functionality)
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

const parseUTCOffsetToMinutes = (tz) => {
  const sign = tz.includes("+") ? 1 : -1;
  const [hours, minutes] = tz.replace("UTC", "").replace("+", "").replace("-", "").split(":").map(Number);
  return sign * ((hours || 0) * 60 + (minutes || 0));
};

const calculateTruePosition = (flightDate, std, bt, timelineStartStr, localTimezone, viewTimezone) => {
  if (!flightDate || !std || !bt || !timelineStartStr) return { left: "0%", width: "0%" };

  const totalMinutesWeek = 7 * 24 * 60;
  const localOffset = parseUTCOffsetToMinutes(localTimezone);
  const viewOffset = parseUTCOffsetToMinutes(viewTimezone);

  const flightLocal = new Date(flightDate);
  const [stdH, stdM] = std.split(":").map(Number);
  flightLocal.setHours(stdH || 0, stdM || 0, 0, 0);

  const flightUTC = new Date(flightLocal.getTime() - localOffset * 60000);
  const flightInViewTZ = new Date(flightUTC.getTime() + viewOffset * 60000);

  const weekStart = new Date(timelineStartStr);
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

// --- FORMATTERS ---
// Format to exact screenshot match: "10-Dec-23"
const formatWeekDisplay = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const parts = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).split(' ');
  return `${parts[0]}-${parts[1]}-${parts[2]}`; 
};

const formatDateHeader = (dateObj) => {
  if (!dateObj) return "";
  return dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ' |');
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
      className="w-full h-6 px-1.5 py-1 text-[10px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
    />
    <Search size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 pointer-events-none" />
  </div>
);

const FlightBar = ({ flight, timelineStart, mode, timezone }) => {
  const pos = calculateTruePosition(
    flight.date,
    flight.std,
    flight.bt,
    timelineStart, // Uses Monday start date
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
  
  const [weeks, setWeeks] = useState([]);
  const [weekStart, setWeekStart] = useState(""); // The selected Sunday
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });

  // 1. Fetch available Sundays and set to LATEST week by default
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const res = await axios.get("https://airlineplan.com/master-weeks", {
          headers: { "x-access-token": accessToken }
        });

        if (res.data?.weeks?.length) {
          setWeeks(res.data.weeks);
          // Set to the latest Sunday as requested
          setWeekStart(res.data.weeks[res.data.weeks.length - 1]); 
        }
      } catch (err) {
        console.error("Failed to fetch weeks", err);
      }
    };

    fetchWeeks();
  }, []);

  // 2. Reset filters/sort when mode changes
  useEffect(() => {
    setFilters({});
    setSortConfig({ key: null, direction: "Up" });
  }, [mode]);

  // 3. Fetch Data
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

        setData(response.data?.rows || []);
      } catch (error) {
        console.error("Error fetching view data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, stationCode, weekStart, timezone]);

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

  const processedData = useMemo(() => {
    let result = [...data];

    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key]?.toLowerCase();
      if (filterValue) {
        result = result.filter((row) => {
          const cellValue = row.leftColumn?.[key];
          return cellValue && String(cellValue).toLowerCase().includes(filterValue);
        });
      }
    });

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

  // --- Date Math for UI (Monday Start, Sunday End) ---
  const timelineStart = useMemo(() => {
    if (!weekStart) return null;
    const start = new Date(weekStart);
    start.setDate(start.getDate() - 6); // Subtract 6 days to get Monday
    return start;
  }, [weekStart]);

  const timelineEnd = useMemo(() => {
    if (!weekStart) return null;
    return new Date(weekStart); // The Sunday
  }, [weekStart]);


  // --- Virtualization ---
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Compact 48px row height to match screenshot density
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-xl relative text-slate-800 dark:text-slate-200">

      {/* 1. Header Legend */}
      <div className="flex justify-end mb-2">
         <div className="flex items-center gap-2 bg-yellow-200 text-yellow-900 text-[10px] font-semibold px-2 py-1 border border-yellow-400">
          Connections highlighted with end of rectangle
        </div>
      </div>

      {/* 2. Control Header */}
      <div className="flex flex-wrap items-center gap-6 pb-4 border-b border-slate-300 dark:border-slate-700 shrink-0">

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">Mode</label>
          <select
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 text-sm rounded px-2 py-1 w-28 cursor-pointer"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="Rotations">Rotations</option>
            <option value="Sectors">Sectors</option>
            <option value="Station">Station</option>
            <option value="Aircraft">Aircraft</option>
          </select>
        </div>

        {mode === "Station" && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value.toUpperCase())}
              className="bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 text-sm rounded px-2 py-1 w-20 uppercase"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 text-sm rounded px-2 py-1 w-32 cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* Compact Dropdown displaying exactly 10-Dec-23 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">Week</label>
          <select
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 text-sm rounded px-2 py-1 w-28 cursor-pointer"
            disabled={weeks.length === 0}
          >
            {weeks.length === 0 ? (
              <option value="">Loading...</option>
            ) : (
              weeks.map((wk, idx) => (
                <option key={idx} value={wk}>
                  {formatWeekDisplay(wk)}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 3. Main Data View */}
      <div className="flex-1 overflow-x-auto mt-2 custom-scrollbar flex flex-col">
        <div className="min-w-[1000px] flex-1 flex flex-col">

          {/* TIMELINE HEADER */}
          <div className="flex border-b-2 border-slate-800 dark:border-slate-500 bg-white dark:bg-slate-900 shrink-0">
            {/* Left Header Section - DYNAMIC FILTER + SORT */}
            <div className="w-64 shrink-0 flex items-end border-r-2 border-slate-400 bg-slate-50 dark:bg-slate-800/90 pb-1">
              {MODE_COLUMNS[mode].map((col) => (
                <div key={col.key} className="flex-1 px-2 flex flex-col gap-1 border-r border-slate-300 dark:border-slate-700 last:border-0">
                   <div className="text-[9px] text-slate-500 font-semibold mb-[-2px]">Filter + Sort</div>
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-bold uppercase"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortConfig.key === col.key ? (
                      sortConfig.direction === "Up" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                    ) : (
                      <ArrowUp size={10} className="opacity-0 hover:opacity-30" />
                    )}
                  </div>
                  <TableInput
                    name={col.key}
                    value={filters[col.key]}
                    onChange={handleFilterChange}
                  />
                </div>
              ))}
            </div>

            {/* Right Timeline Date Headers */}
            <div className="flex-1 flex">
              <div className="flex-1 border-r border-slate-300 dark:border-slate-700 flex flex-col justify-end text-xs font-medium">
                <div className="text-center px-2 py-0.5 border-b border-slate-300">
                  {timelineStart ? formatDateHeader(timelineStart) : ""}
                </div>
                <div className="px-2 py-0.5 text-left text-[10px]">0:01</div>
              </div>
              <div className="flex-1 flex flex-col justify-end text-xs font-medium">
                <div className="text-center px-2 py-0.5 border-b border-slate-300">
                  {timelineEnd ? formatDateHeader(timelineEnd) : ""}
                </div>
                <div className="px-2 py-0.5 text-right text-[10px]">00:00</div>
              </div>
            </div>
          </div>

          {/* VIRTUALIZED DATA ROWS */}
          <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
            {processedData.length === 0 && !loading ? (
              <div className="h-32 flex items-center justify-center text-slate-500 text-sm font-medium">
                No flights match your criteria.
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
                      className="flex border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Left Metadata Column */}
                      <div className="w-64 shrink-0 flex items-stretch border-r border-slate-300 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 relative z-10">
                        {MODE_COLUMNS[mode].map((col) => (
                          <div key={col.key} className="flex-1 flex items-center px-3 border-r last:border-0 border-slate-200 dark:border-slate-700/50 truncate">
                            {row.leftColumn?.[col.key] || ""}
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
                            timelineStart={timelineStart}
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