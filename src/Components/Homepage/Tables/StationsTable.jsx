import React, { useState, useEffect } from 'react';
import axios from "axios";
import dayjs from 'dayjs';
import { twMerge } from "tailwind-merge";
import { Save, Clock, RadioTower } from "lucide-react";
import { clsx } from "clsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- CONSTANTS ---
const TIMEZONES = [
  'UTC-12:00', 'UTC-11:45', 'UTC-11:30', 'UTC-11:15', 'UTC-11:00', 'UTC-10:45', 'UTC-10:30', 'UTC-10:15', 'UTC-10:00', 'UTC-9:45', 'UTC-9:30', 'UTC-9:15', 'UTC-9:00', 'UTC-8:45', 'UTC-8:30', 'UTC-8:15', 'UTC-8:00', 'UTC-7:45', 'UTC-7:30', 'UTC-7:15', 'UTC-7:00', 'UTC-6:45', 'UTC-6:30', 'UTC-6:15', 'UTC-6:00', 'UTC-5:45', 'UTC-5:30', 'UTC-5:15', 'UTC-5:00', 'UTC-4:45', 'UTC-4:30', 'UTC-4:15', 'UTC-4:00', 'UTC-3:45', 'UTC-3:30', 'UTC-3:15', 'UTC-3:00', 'UTC-2:45', 'UTC-2:30', 'UTC-2:15', 'UTC-2:00', 'UTC-1:45', 'UTC-1:30', 'UTC-1:15', 'UTC-1:00', 'UTC-0:45', 'UTC-0:30', 'UTC-0:15', 'UTC+0:00', 'UTC+0:15', 'UTC+0:30', 'UTC+0:45', 'UTC+1:00', 'UTC+1:15', 'UTC+1:30', 'UTC+1:45', 'UTC+2:00', 'UTC+2:15', 'UTC+2:30', 'UTC+2:45', 'UTC+3:00', 'UTC+3:15', 'UTC+3:30', 'UTC+3:45', 'UTC+4:00', 'UTC+4:15', 'UTC+4:30', 'UTC+4:45', 'UTC+5:00', 'UTC+5:15', 'UTC+5:30', 'UTC+5:45', 'UTC+6:00', 'UTC+6:15', 'UTC+6:30', 'UTC+6:45', 'UTC+7:00', 'UTC+7:15', 'UTC+7:30', 'UTC+7:45', 'UTC+8:00', 'UTC+8:15', 'UTC+8:30', 'UTC+8:45', 'UTC+9:00', 'UTC+9:15', 'UTC+9:30', 'UTC+9:45', 'UTC+10:00', 'UTC+10:15', 'UTC+10:30', 'UTC+10:45', 'UTC+11:00', 'UTC+11:15', 'UTC+11:30', 'UTC+11:45', 'UTC+12:00'
];

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const StyledInput = ({ value, onChange, error, placeholder, type = "text", ...props }) => (
  <div className="flex flex-col w-full">
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className={twMerge(cn(
        "w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900/50 border rounded focus:outline-none focus:ring-2 transition-all",
        error 
          ? "border-red-400 focus:ring-red-400 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300" 
          : "border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
      ))}
      {...props}
    />
    {error && <span className="text-[10px] text-red-500 mt-0.5 leading-tight">{error}</span>}
  </div>
);

const StyledSelect = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value || ""}
      onChange={onChange}
      className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 cursor-pointer appearance-none pr-6"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1 text-slate-500">
      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
const StationsTable = () => {
  const [selectedHomeTimeZone, setSelectedHomeTimeZone] = useState('UTC+5:30');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // --- LOGIC ---
  const handleTimeZoneChange = (e) => setSelectedHomeTimeZone(e.target.value);

  const handleInputChange = (e, rowIndex, columnName) => {
    let value = e.target ? e.target.value : e;
    
    if (value instanceof Date) {
        value = dayjs(value).format('YYYY-MM-DD');
    }

    setData(prevData => {
      const newData = [...prevData];
      newData[rowIndex] = { ...newData[rowIndex], [columnName]: value };
      return newData;
    });
  };

  const normalizeTimeFormat = (time) => {
    if(!time) return '';
    const extractedDigits = String(time).match(/\d+/g);
    if (!extractedDigits || extractedDigits.length < 2) return '';
    const [hours, minutes] = extractedDigits.slice(0, 2).map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isInRange = (value, [min, max]) => value >= min && value <= max;

  const validateTime = (value, range) => {
    const normalized = normalizeTimeFormat(value);
    return !normalized || isInRange(normalized, range);
  };

  const ranges = {
    range1: ['00:20', '03:00'],
    range2: ['00:30', '04:00'],
    range3: ['02:00', '10:00']
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get("http://localhost:3000/get-stationData", {
          headers: { "x-access-token": accessToken },
        });
        if(response.data?.data) {
          setData(response.data.data);
          if(response.data.hometimeZone) setSelectedHomeTimeZone(response.data.hometimeZone);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load station data");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, []);

  const saveStation = async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const requestData = {
        stations: data,
        homeTimeZone: selectedHomeTimeZone,
      };

      const response = await axios.post('http://localhost:3000/saveStation', requestData, {
        headers: {
          "x-access-token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 201 || response.status === 200) {
        toast.success("Stations updated successfully!");
        setTimeout(() => window.dispatchEvent(new Event("refreshData")), 1500);
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // FIX 1: Removed h-[calc(100vh-140px)] and replaced with dynamic overflow layout like NetworkTable
    <div className="w-full space-y-4 font-sans relative overflow-hidden p-4 md:p-6">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
        <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Clock size={16} className="text-indigo-500" />
                Home Timezone
            </div>
            <div className="relative">
                <select
                    value={selectedHomeTimeZone}
                    onChange={handleTimeZoneChange}
                    className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-1.5 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>
      </div>

      {/* --- TABLE CARD --- */}
      {/* FIX 2: Applied h-[70vh] with min-h-[400px] to ensure it always renders tall enough in landscape */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[70vh] min-h-[400px]">
        
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/95 dark:bg-slate-800/95 sticky top-0 z-30 backdrop-blur-md shadow-sm">
              <tr>
                {/* FIX 3: Made # and Station headers sticky to the left so they stay visible when horizontally scrolling */}
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[40px] text-xs font-bold text-slate-500 dark:text-slate-400 sticky left-0 z-40 bg-slate-100/95 dark:bg-slate-800/95">#</th>
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[120px] text-xs font-bold text-slate-500 dark:text-slate-400 sticky left-[40px] z-40 bg-slate-100/95 dark:bg-slate-800/95 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">Station</th>
                
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[100px] text-xs font-bold text-slate-500 dark:text-slate-400">Avg Taxi-Out</th>
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[100px] text-xs font-bold text-slate-500 dark:text-slate-400">Avg Taxi-In</th>

                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[120px] text-xs font-bold text-slate-500 dark:text-slate-400">STD TZ</th>
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[120px] text-xs font-bold text-slate-500 dark:text-slate-400">DST TZ</th>
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[140px] text-xs font-bold text-slate-500 dark:text-slate-400">Next DST Start</th>
                <th rowSpan={2} className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[140px] text-xs font-bold text-slate-500 dark:text-slate-400">Next DST End</th>
                
                <th colSpan={2} className="p-1 border-r border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10">Dom - Dom</th>
                <th colSpan={2} className="p-1 border-r border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/10">Dom - INTL</th>
                <th colSpan={2} className="p-1 border-r border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">INTL - Dom</th>
                <th colSpan={2} className="p-1 border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10">INTL - INTL</th>
              </tr>
              <tr>
                {/* Min Widths added to sub-headers to prevent input crushing */}
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-indigo-50/30">Min CT</th>
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-indigo-50/30">Max CT</th>
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-cyan-50/30">Min CT</th>
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-cyan-50/30">Max CT</th>
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-emerald-50/30">Min CT</th>
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-emerald-50/30">Max CT</th>
                <th className="p-2 border-r border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-purple-50/30">Min CT</th>
                <th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center min-w-[90px] text-[10px] text-slate-500 font-semibold bg-purple-50/30">Max CT</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isFetching ? (
                <tr>
                  <td colSpan={16} className="p-10 text-center text-slate-500 text-sm">Loading station data...</td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="p-2 text-center text-xs font-medium text-slate-500 border-r border-slate-100 dark:border-slate-800 sticky left-0 z-20 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50">{index + 1}</td>
                    <td className="p-2 text-center text-xs font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 sticky left-[40px] z-20 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.02)]">{row.stationName}</td>
                    
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-orange-50/10">
                      <StyledInput 
                        value={row.avgTaxiOutTime} 
                        onChange={(e) => handleInputChange(e, index, 'avgTaxiOutTime')} 
                        placeholder="00:00"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-orange-50/10">
                      <StyledInput 
                        value={row.avgTaxiInTime} 
                        onChange={(e) => handleInputChange(e, index, 'avgTaxiInTime')} 
                        placeholder="00:00"
                      />
                    </td>

                    <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                      <StyledSelect value={row.stdtz} options={TIMEZONES} onChange={(e) => handleInputChange(e, index, 'stdtz')} />
                    </td>
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                      <StyledSelect value={row.dsttz} options={TIMEZONES} onChange={(e) => handleInputChange(e, index, 'dsttz')} />
                    </td>
                    
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                      <StyledInput 
                        type="date" 
                        value={dayjs(row.nextDSTStart).isValid() ? dayjs(row.nextDSTStart).format('YYYY-MM-DD') : ''} 
                        onChange={(e) => handleInputChange(e, index, 'nextDSTStart')} 
                      />
                    </td>
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                      <StyledInput 
                        type="date" 
                        value={dayjs(row.nextDSTEnd).isValid() ? dayjs(row.nextDSTEnd).format('YYYY-MM-DD') : ''} 
                        onChange={(e) => handleInputChange(e, index, 'nextDSTEnd')} 
                      />
                    </td>

                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-indigo-50/10">
                      <StyledInput value={row.ddMinCT} onChange={(e) => handleInputChange(e, index, 'ddMinCT')} error={!validateTime(row.ddMinCT, ranges.range1) && "00:20 - 03:00"} />
                    </td>
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-indigo-50/10">
                      <StyledInput value={row.ddMaxCT} onChange={(e) => handleInputChange(e, index, 'ddMaxCT')} error={!validateTime(row.ddMaxCT, ranges.range3) && "02:00 - 10:00"} />
                    </td>

                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-cyan-50/10">
                      <StyledInput value={row.dInMinCT} onChange={(e) => handleInputChange(e, index, 'dInMinCT')} error={!validateTime(row.dInMinCT, ranges.range2) && "00:30 - 04:00"} />
                    </td>
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-cyan-50/10">
                      <StyledInput value={row.dInMaxCT} onChange={(e) => handleInputChange(e, index, 'dInMaxCT')} error={!validateTime(row.dInMaxCT, ranges.range3) && "02:00 - 10:00"} />
                    </td>

                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-emerald-50/10">
                      <StyledInput value={row.inDMinCT} onChange={(e) => handleInputChange(e, index, 'inDMinCT')} error={!validateTime(row.inDMinCT, ranges.range1) && "00:20 - 03:00"} />
                    </td>
                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-emerald-50/10">
                      <StyledInput value={row.inDMaxCT} onChange={(e) => handleInputChange(e, index, 'inDMaxCT')} error={!validateTime(row.inDMaxCT, ranges.range3) && "02:00 - 10:00"} />
                    </td>

                    <td className="p-1 border-r border-slate-100 dark:border-slate-800 bg-purple-50/10">
                      <StyledInput value={row.inInMinDT} onChange={(e) => handleInputChange(e, index, 'inInMinDT')} error={!validateTime(row.inInMinDT, ranges.range2) && "00:30 - 04:00"} />
                    </td>
                    <td className="p-1 border-slate-100 dark:border-slate-800 bg-purple-50/10">
                      <StyledInput value={row.inInMaxDT} onChange={(e) => handleInputChange(e, index, 'inInMaxDT')} error={!validateTime(row.inInMaxDT, ranges.range3) && "02:00 - 10:00"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- FOOTER --- */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex justify-end">
            <button
                onClick={saveStation}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Saving Changes...
                    </>
                ) : (
                    <>
                        <Save size={16} className="mr-2" />
                        Save Changes
                    </>
                )}
            </button>
        </div>
      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default StationsTable;