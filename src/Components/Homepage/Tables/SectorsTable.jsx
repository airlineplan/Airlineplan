import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Trash2, Plus, ArrowUp, ArrowDown, Search, 
  Map, RefreshCw, ChevronLeft, ChevronRight 
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- IMPORT YOUR MODERNIZED MODAL COMPONENTS ---
import UpdateSectore from "./UpdateSectore"; 
import AddSector from "./AddSector";
import CopySector from "./CopySector";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const Button = ({ children, variant = "primary", className, icon: Icon, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 hover:scale-[1.02]",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-transparent hover:bg-red-100 dark:hover:bg-red-900/30",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} {...props}>
      {Icon && <Icon size={16} className="mr-2" />}
      {children}
    </button>
  );
};

const Checkbox = ({ checked, onChange }) => (
  <div 
    onClick={onChange}
    className={cn(
      "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all duration-200",
      checked 
        ? "bg-indigo-500 border-indigo-500" 
        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400"
    )}
  >
    {checked && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white"><div className="w-2 h-2 bg-white rounded-[1px]" /></motion.div>}
  </div>
);

const TableInput = ({ value, onChange, placeholder }) => (
  <div className="relative group mt-1">
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-8 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all"
    />
    <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
  </div>
);

// --- MAIN COMPONENT ---
const ROWS_PER_PAGE = 8;

const SectorsTable = () => {
  // --- STATE ---
  const [sectorsTableData, setSectorsTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkedRows, setCheckedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modals & Menus
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [add, setAdd] = useState(true); // Passed to modals
  
  // Sorting & Filters
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filters, setFilters] = useState({
    sector1: "", gcd: "", acftType: "", variant: "", bt: "",
    paxCapacity: "", CargoCapT: "", paxLF: "", cargoLF: "",
    fromDt: "", toDt: ""
  });

  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- API CALLS ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get("http://localhost:5001/sectors", {
          headers: { "x-access-token": accessToken },
        });
        setSectorsTableData(response.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load sector data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteData = async () => {
    if (!checkedRows.length) return toast.warn("No rows selected");
    if (!window.confirm("Are you sure you want to delete this data?")) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.delete("https://airlineplan.com/delete-sector", {
        headers: { "x-access-token": accessToken },
        data: { ids: checkedRows },
      });

      if (response.data && response.data.message === "Data deleted successfully") {
        toast.success("Delete Successful");
        setTimeout(() => { window.location.reload(); }, 2000);
      } else {
        toast.error("Delete Failed");
      }
    } catch (error) {
      toast.error("An error occurred while deleting");
      console.error(error);
    }
  };

  // --- FILTER & SORT LOGIC ---
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const processedData = useMemo(() => {
    let data = [...sectorsTableData];

    // 1. Filter logic mirroring your original structure exactly
    data = data.filter(row => {
      const match = (val, filter) => String(val || "").toLowerCase().includes(filter.toLowerCase());
      
      return (
        match(row.sector1, filters.sector1) &&
        match(row.gcd, filters.gcd) &&
        match(row.acftType, filters.acftType) &&
        match(row.variant, filters.variant) &&
        match(row.bt, filters.bt) &&
        match(row.paxCapacity, filters.paxCapacity) &&
        match(row.CargoCapT, filters.CargoCapT) &&
        match(row.paxLF, filters.paxLF) &&
        match(row.cargoLF, filters.cargoLF) &&
        match(moment(row.fromDt).format("DD-MMM-YY"), filters.fromDt) &&
        match(moment(row.toDt).format("DD-MMM-YY"), filters.toDt)
      );
    });

    // 2. Sort logic
    if (sortConfig.key) {
      data.sort((a, b) => {
        const valA = String(a[sortConfig.key] || "");
        const valB = String(b[sortConfig.key] || "");
        
        return sortConfig.direction === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      });
    }

    return data;
  }, [sectorsTableData, filters, sortConfig]);

  // --- PAGINATION ---
  const totalPages = Math.ceil(processedData.length / ROWS_PER_PAGE);
  const paginatedData = processedData.slice(
    (currentPage - 1) * ROWS_PER_PAGE, 
    currentPage * ROWS_PER_PAGE
  );

  // --- SELECTION ---
  const handleCheckRow = (id) => {
    setCheckedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleCheckAll = () => {
    if (checkedRows.length === processedData.length && processedData.length > 0) {
      setCheckedRows([]);
    } else {
      setCheckedRows(processedData.map(r => r._id));
    }
  };

  // --- RENDER HELPERS ---
  const columns = [
    { key: "sector1", label: "Sector", filterKey: "sector1" },
    { key: "gcd", label: "GCD", filterKey: "gcd" },
    { key: "acftType", label: "ACFT Type", filterKey: "acftType" },
    { key: "variant", label: "Variant", filterKey: "variant" },
    { key: "bt", label: "Block Time", filterKey: "bt" },
    { key: "paxCapacity", label: "Pax Cap", filterKey: "paxCapacity" },
    { key: "CargoCapT", label: "Cargo Cap", filterKey: "CargoCapT" },
    { key: "paxLF", label: "Pax LF%", filterKey: "paxLF" },
    { key: "cargoLF", label: "Cargo LF%", filterKey: "cargoLF" },
    { key: "fromDt", label: "From Dt", filterKey: "fromDt" },
    { key: "toDt", label: "To Dt", filterKey: "toDt" },
  ];

  return (
    <div className="w-full space-y-4 relative">
      
      {/* --- HEADER ACTIONS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1 z-30 relative">
        
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Actual Update Component Mounted Here */}
          <UpdateSectore checkedRows={checkedRows} />

          {/* Add / Copy Dropdown */}
          <div className="relative" ref={menuRef}>
            <Button 
              variant="primary" 
              icon={Plus} 
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            >
              Add
            </Button>

            <AnimatePresence>
              {isAddMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-2 z-50 flex flex-col"
                >
                  <div className="px-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {/* Actual Copy Sector Component */}
                    <CopySector checkedRows={checkedRows} setAdd={setAdd} />
                  </div>
                  <div className="px-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {/* Actual Add Sector Component */}
                    <AddSector setAdd={setAdd} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {checkedRows.length > 0 && (
            <Button variant="danger" icon={Trash2} onClick={handleDeleteData}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* --- TABLE CARD --- */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[70vh] relative z-20">
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-20 backdrop-blur-sm">
              <tr>
                <th className="p-4 w-12 text-center sticky left-0 bg-slate-100/90 dark:bg-slate-800/90 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex justify-center">
                    <Checkbox 
                      checked={processedData.length > 0 && checkedRows.length === processedData.length} 
                      onChange={handleCheckAll} 
                    />
                  </div>
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="p-3 min-w-[100px] font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={12}/> : <ArrowDown size={12}/> 
                        ) : (
                          <ArrowUp size={12} className="opacity-0 group-hover:opacity-30"/>
                        )}
                      </div>
                      <TableInput 
                        value={filters[col.filterKey]} 
                        onChange={(e) => handleFilterChange(col.filterKey, e.target.value)}
                        placeholder="Filter..."
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                      <RefreshCw className="animate-spin text-indigo-500" size={24} />
                      <span className="text-sm">Loading sectors...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-10 text-center text-slate-500 text-sm">
                    No sectors found matching your filters.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {paginatedData.map((row) => (
                    <motion.tr
                      key={row._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        checkedRows.includes(row._id) && "bg-indigo-50/50 dark:bg-indigo-900/10"
                      )}
                    >
                      <td className="p-4 sticky left-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-10 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 dark:border-slate-800">
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={checkedRows.includes(row._id)} 
                            onChange={() => handleCheckRow(row._id)} 
                          />
                        </div>
                      </td>
                      
                      <td className="p-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {row.sector1}-{row.sector2}
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.gcd}</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.acftType}</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700">
                          {row.variant}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400 font-mono">{row.bt}</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.paxCapacity}</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.CargoCapT}</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.paxLF}%</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.cargoLF}%</td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {moment(row.fromDt).format("DD-MMM-YY")}
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {moment(row.toDt).format("DD-MMM-YY")}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* --- STANDARDIZED FOOTER / PAGINATION --- */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {paginatedData.length > 0 ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0} to {Math.min(currentPage * ROWS_PER_PAGE, processedData.length)} of {processedData.length} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default SectorsTable;