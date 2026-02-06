import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import moment from "moment";
import debounce from "lodash.debounce";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Download, ArrowUp, ArrowDown, Search, 
  Plane, Calendar, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONFIGURATION ---
const COLUMNS_CONFIG = [
  { key: 'date', label: 'Date', minWidth: '100px', isDate: true },
  { key: 'day', label: 'Day', minWidth: '80px' },
  { key: 'flight', label: 'Flight #', minWidth: '100px' },
  { key: 'depStn', label: 'Dep Stn', minWidth: '80px' },
  { key: 'std', label: 'STD (LT)', minWidth: '80px' },
  { key: 'bt', label: 'BT', minWidth: '80px' },
  { key: 'sta', label: 'STA (LT)', minWidth: '80px' },
  { key: 'arrStn', label: 'Arr Stn', minWidth: '80px' },
  { key: 'sector', label: 'Sector', minWidth: '100px', masterOnly: true },
  { key: 'variant', label: 'Variant', minWidth: '100px' },
  { key: 'seats', label: 'Seats', minWidth: '80px', masterOnly: true },
  { key: 'CargoCapT', label: 'Cargo Cap', minWidth: '100px', masterOnly: true, isFloat: true },
  { key: 'dist', label: 'Dist', minWidth: '80px', masterOnly: true },
  { key: 'pax', label: 'Pax', minWidth: '80px', masterOnly: true, isInt: true },
  { key: 'CargoT', label: 'Cargo T', minWidth: '100px', masterOnly: true, isFloat: true },
  { key: 'ask', label: 'ASK', minWidth: '90px', masterOnly: true, isInt: true },
  { key: 'rsk', label: 'RSK', minWidth: '90px', masterOnly: true, isInt: true },
  { key: 'cargoAtk', label: 'Cargo ATK', minWidth: '100px', masterOnly: true, isInt: true },
  { key: 'cargoRtk', label: 'Cargo RTK', minWidth: '100px', masterOnly: true, isInt: true },
  { key: 'domIntl', label: 'Dom/Intl', minWidth: '90px', masterOnly: true },
  { key: 'userTag1', label: 'User Tag 1', minWidth: '120px', masterOnly: true },
  { key: 'userTag2', label: 'User Tag 2', minWidth: '120px', masterOnly: true },
  { key: 'remarks1', label: 'Remarks 1', minWidth: '150px', masterOnly: true },
  { key: 'remarks2', label: 'Remarks 2', minWidth: '150px', masterOnly: true },
  { key: 'rotationNumber', label: 'Rotation #', minWidth: '100px', masterOnly: true },
];

// --- COMPONENTS ---

const TableInput = ({ name, value, onChange, placeholder }) => (
  <div className="relative group mt-1">
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

const FlgtsTable = ({ isMaster = true }) => {
  // --- STATE ---
  const [flgtsTableData, setFlgtsTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [totalFlights, setTotalFlights] = useState(0);

  // Sorting & Filtering
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });
  const [filters, setFilters] = useState({});

  // Filter columns based on isMaster prop
  const visibleColumns = useMemo(() => {
    return COLUMNS_CONFIG.filter(col => isMaster || !col.masterOnly);
  }, [isMaster]);

  // --- API LOGIC ---

  // Debounced Fetch
  const fetchResults = useCallback(
    debounce(async (page, limit, currentFilters) => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) throw new Error("No access token");

        // Clean empty filters
        const activeFilters = Object.fromEntries(
          Object.entries(currentFilters).filter(([_, v]) => v !== "")
        );

        const requestBody = {
          ...activeFilters,
          page,
          limit,
        };

        const response = await axios.post(
          "https://airlineplan.com/searchflights",
          requestBody,
          {
            headers: {
              "x-access-token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        setFlgtsTableData(response.data.data || []);
        setTotalFlights(response.data.total || 0);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Trigger fetch on changes
  useEffect(() => {
    fetchResults(currentPage, rowsPerPage, filters);
  }, [currentPage, filters, fetchResults]);

  // --- HANDLERS ---

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
    }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.get("https://airlineplan.com/downloadFLGTs", {
        responseType: "blob",
        headers: { "x-access-token": accessToken },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "FLGTs.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setDownloading(false);
    }
  };

  // Client-side sorting of the *current page* (based on original logic)
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return flgtsTableData;

    return [...flgtsTableData].sort((a, b) => {
      const colA = a[sortConfig.key] || "";
      const colB = b[sortConfig.key] || "";

      if (sortConfig.direction === "Up") {
        return String(colA).localeCompare(String(colB));
      } else {
        return String(colB).localeCompare(String(colA));
      }
    });
  }, [flgtsTableData, sortConfig]);

  // Formatters
  const renderCell = (row, col) => {
    const val = row[col.key];
    if (col.isDate) return moment(val).format("DD-MMM-YY");
    if (col.isFloat) return val ? parseFloat(val).toFixed(1) : "";
    if (col.isInt) return val ? parseInt(val) : "";
    return val;
  };

  const totalPages = Math.ceil(totalFlights / rowsPerPage);

  // --- RENDER ---
  return (
    <div className="w-full space-y-4 font-sans">
      
      {/* Header Actions */}
      {isMaster && (
        <div className="flex justify-end p-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-70"
          >
            {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            <span>{downloading ? "Downloading..." : "Download Excel"}</span>
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[70vh]">
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-20 backdrop-blur-sm shadow-sm">
              <tr>
                {/* S.No Column */}
                <th className="p-3 w-16 text-center text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 sticky left-0 z-30">
                  #
                </th>
                
                {/* Dynamic Columns */}
                {visibleColumns.map((col) => (
                  <th 
                    key={col.key} 
                    className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700"
                    style={{ minWidth: col.minWidth }}
                  >
                    <div className="flex flex-col gap-1">
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === "Up" ? <ArrowUp size={12}/> : <ArrowDown size={12}/> 
                        ) : (
                          <ArrowUp size={12} className="opacity-0 group-hover:opacity-30"/>
                        )}
                      </div>
                      <TableInput 
                        name={col.key}
                        value={filters[col.key]} 
                        onChange={handleFilterChange}
                        placeholder="Filter..."
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading && flgtsTableData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                      <span className="text-sm">Loading flights...</span>
                    </div>
                  </td>
                </tr>
              ) : flgtsTableData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-10 text-center text-slate-500 text-sm italic">
                    No flights found matching your filters.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {sortedData.map((row, index) => (
                    <motion.tr
                      key={row._id || index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 text-center text-xs font-medium text-slate-500 sticky left-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </td>
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {renderCell(row, col)}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalFlights)} of {totalFlights} flights
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlgtsTable;