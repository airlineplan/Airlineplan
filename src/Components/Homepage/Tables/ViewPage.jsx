import React, { useState } from "react";
import { ChevronDown, Calendar, Globe2, Plane, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA ---
const TIMELINE_HEADERS = [
  { day: "Monday | 04-Dec-23", start: "00:01", end: "00:00" },
  { day: "Sunday | 10-Dec-23", start: "00:01", end: "00:00" },
];

const MOCK_ROTATIONS = [
  { rot: "1", variant: "738", flights: [{ label: "DEL-BOM", left: "15%", width: "15%", connRight: true }, { label: "BOM-COK", left: "35%", width: "12%", connLeft: true }, { label: "", left: "80%", width: "10%" }] },
  { rot: "2", variant: "737", flights: [{ label: "", left: "25%", width: "15%" }, { label: "", left: "85%", width: "10%" }] },
  { rot: "3", variant: "A321", flights: [{ label: "", left: "45%", width: "20%" }] },
  { rot: "4", variant: "A330", flights: [{ label: "DMK-BOM", left: "55%", width: "20%" }] },
];

const MOCK_SECTORS = [
  { sector: "DEL-BOM", flights: [{ label: "738", left: "20%", width: "10%" }, { label: "", left: "80%", width: "10%" }] },
  { sector: "BOM-COK", flights: [{ label: "737", left: "40%", width: "10%", connLeft: true }, { label: "", left: "85%", width: "10%" }] },
  { sector: "BOM-TRV", flights: [{ label: "A320", left: "20%", width: "10%" }, { label: "A321", left: "30%", width: "10%", connRight: true }] },
  { sector: "DEL-IXJ", flights: [{ label: "DH8D", left: "40%", width: "20%" }] },
];

const MOCK_STATIONS = [
  { type: "Departures to", sector: "BOM", flights: [{ label: "738", left: "20%", width: "10%" }, { label: "", left: "80%", width: "10%" }] },
  { type: "", sector: "IXJ", flights: [{ label: "DH8D", left: "40%", width: "10%" }, { label: "", left: "85%", width: "10%" }] },
  { type: "divider" },
  { type: "Arrivals from", sector: "BOM", flights: [{ label: "A320", left: "0%", width: "10%" }] },
  { type: "", sector: "LHR", flights: [{ label: "777", left: "40%", width: "20%", connLeft: true }] },
];

const MOCK_AIRCRAFT = [
  { ac: "VT-DKU", variant: "738", flights: [{ label: "DEL-BOM", left: "15%", width: "15%" }, { label: "BOM-COK", left: "35%", width: "12%" }, { label: "", left: "80%", width: "10%" }] },
  { ac: "VT-DKP", variant: "737", flights: [{ label: "", left: "25%", width: "10%" }, { label: "", left: "85%", width: "10%" }] },
  { ac: "VT-DJJ", variant: "A321", flights: [{ label: "", left: "40%", width: "20%" }] },
  { ac: "VT-DWA", variant: "A330", flights: [{ label: "DMK-BOM", left: "50%", width: "20%", connLeft: true, connMid: true }] },
];

// --- SUB-COMPONENTS ---

const FlightBar = ({ flight }) => (
  <div
    className="absolute top-1/2 -translate-y-1/2 h-6 bg-[#e8a3d8] dark:bg-fuchsia-600/80 rounded-sm flex items-center justify-center text-[10px] font-bold text-slate-900 dark:text-white shadow-sm"
    style={{ left: flight.left, width: flight.width }}
  >
    {flight.label}
    
    {/* Connection Highlights (Green Boxes) */}
    {flight.connRight && <div className="absolute -bottom-3 right-0 w-3 h-4 bg-emerald-700 border border-slate-900 z-10" />}
    {flight.connLeft && <div className="absolute -bottom-3 left-0 w-3 h-4 bg-emerald-700 border border-slate-900 z-10" />}
    {flight.connMid && <div className="absolute -bottom-3 left-[-30%] w-4 h-4 bg-emerald-700 border border-slate-900 z-10" />}
  </div>
);

const TimelineGrid = () => (
  <div className="absolute inset-0 flex pointer-events-none">
    <div className="flex-1 border-r border-slate-300 dark:border-slate-700/50 border-dashed" />
    <div className="flex-1" />
  </div>
);

// --- MAIN COMPONENT ---

const ViewPage = () => {
  const [mode, setMode] = useState("Rotations");
  const [stationCode, setStationCode] = useState("DEL");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-4 rounded-2xl">
      
      {/* 1. Control Header */}
      <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        
        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Mode</label>
          <div className="relative">
            <select 
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
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

        {/* Dynamic Station Input (Only shows when mode is Station) */}
        {mode === "Station" && (
          <div className="flex items-center gap-2">
             <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Station</label>
             <div className="relative">
               <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
               <input 
                 type="text" 
                 value={stationCode}
                 onChange={(e) => setStationCode(e.target.value)}
                 className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-24 uppercase"
               />
             </div>
          </div>
        )}

        {/* Timezone */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Timezone</label>
          <div className="relative">
            <Globe2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <select className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer">
              <option>UTC+04:30</option>
              <option>UTC+03:30</option>
              <option>UTC+00:00</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Week */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Week</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              defaultValue="10 Dec 23"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium w-28"
            />
          </div>
        </div>

        {/* Info Legend */}
        <div className="ml-auto flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-medium px-3 py-1.5 rounded-md border border-yellow-200 dark:border-yellow-700/50">
           <div className="w-2 h-2 bg-emerald-700 border border-slate-900 inline-block" />
           Connections highlighted with end of rectangle
        </div>
      </div>

      {/* 2. Main Data View */}
      <div className="flex-1 overflow-auto mt-4 custom-scrollbar relative">
        <div className="min-w-[900px]">
          
          {/* TIMELINE HEADER */}
          <div className="flex border-b border-slate-300 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-20">
            {/* Left Column Spacer */}
            <div className="w-64 shrink-0 border-r border-slate-300 dark:border-slate-700" />
            
            {/* Days Header */}
            <div className="flex-1 flex">
              {TIMELINE_HEADERS.map((th, i) => (
                <div key={i} className="flex-1 border-r border-slate-300 dark:border-slate-700 last:border-0 flex flex-col text-xs font-medium text-slate-600 dark:text-slate-400">
                  <div className="text-center py-1 border-b border-slate-200 dark:border-slate-700/50">{th.day}</div>
                  <div className="flex justify-between px-1 py-0.5">
                    <span>{th.start}</span>
                    <span>{th.end}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LEFT COLUMN HEADERS */}
          <div className="flex border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="w-64 shrink-0 flex items-center px-4 py-2 border-r border-slate-300 dark:border-slate-700">
              {mode === "Rotations" && (
                <>
                  <div className="w-1/2">Rotation #</div>
                  <div className="w-1/2">Variant</div>
                </>
              )}
              {mode === "Sectors" && <div className="w-full text-right pr-4">Sector</div>}
              {mode === "Station" && <div className="w-full text-right pr-4">Sector</div>}
              {mode === "Aircraft" && (
                <>
                  <div className="w-1/2">Aircraft</div>
                  <div className="w-1/2">Variant</div>
                </>
              )}
            </div>
            <div className="flex-1" />
          </div>

          {/* DATA ROWS */}
          <div className="relative">
            
            {/* Mode: ROTATIONS */}
            {mode === "Rotations" && MOCK_ROTATIONS.map((row, idx) => (
              <div key={idx} className="flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors h-14">
                <div className="w-64 shrink-0 flex items-center px-4 border-r border-slate-300 dark:border-slate-700 text-sm font-medium">
                  <div className="w-1/2 pl-4">{row.rot}</div>
                  <div className="w-1/2">{row.variant}</div>
                </div>
                <div className="flex-1 relative">
                  <TimelineGrid />
                  {row.flights.map((f, i) => <FlightBar key={i} flight={f} />)}
                </div>
              </div>
            ))}

            {/* Mode: SECTORS */}
            {mode === "Sectors" && MOCK_SECTORS.map((row, idx) => (
              <div key={idx} className="flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors h-14">
                <div className="w-64 shrink-0 flex items-center justify-end px-6 border-r border-slate-300 dark:border-slate-700 text-sm font-medium">
                  {row.sector}
                </div>
                <div className="flex-1 relative">
                  <TimelineGrid />
                  {row.flights.map((f, i) => <FlightBar key={i} flight={f} />)}
                </div>
              </div>
            ))}

            {/* Mode: STATION */}
            {mode === "Station" && MOCK_STATIONS.map((row, idx) => {
              if (row.type === "divider") {
                return <div key={idx} className="border-b-2 border-slate-400 dark:border-slate-600 w-full" />;
              }
              return (
                <div key={idx} className="flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors h-14">
                  <div className="w-64 shrink-0 flex items-center px-4 border-r border-slate-300 dark:border-slate-700 text-sm font-medium">
                    <div className="w-2/3 text-xs text-slate-500 pr-2 text-right">{row.type}</div>
                    <div className="w-1/3 text-right pr-2">{row.sector}</div>
                  </div>
                  <div className="flex-1 relative">
                    <TimelineGrid />
                    {row.flights?.map((f, i) => <FlightBar key={i} flight={f} />)}
                  </div>
                </div>
              )
            })}

            {/* Mode: AIRCRAFT */}
            {mode === "Aircraft" && MOCK_AIRCRAFT.map((row, idx) => (
              <div key={idx} className="flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors h-14">
                <div className="w-64 shrink-0 flex items-center px-4 border-r border-slate-300 dark:border-slate-700 text-sm font-medium">
                  <div className="w-1/2">{row.ac}</div>
                  <div className="w-1/2">{row.variant}</div>
                </div>
                <div className="flex-1 relative">
                  <TimelineGrid />
                  {row.flights.map((f, i) => <FlightBar key={i} flight={f} />)}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPage;