import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Upload, Plus, Trash2, ArrowUp, ArrowDown, 
  Search, FileSpreadsheet, X, Check, ChevronLeft, ChevronRight,
  MoreHorizontal, RefreshCw
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---

const Button = ({ children, variant = "primary", className, icon: Icon, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
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

const TableInput = ({ value, onChange, placeholder }) => (
  <div className="relative group">
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-8 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all"
    />
    <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
);

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
    {checked && <Check size={10} className="text-white" />}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 m-auto z-50 w-full max-w-lg h-fit max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// --- MAIN PAGE COMPONENT ---

const RowsPerPage = 10;

export default function NetworkTable() {
  // --- STATE ---
  const [networkTableData, setNetworkTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false); // Simplified for this demo
  
  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [arrow, setArrow] = useState({ column: "", direction: "Up" });
  const [checkedRows, setCheckedRows] = useState([]);

  // Filters State
  const [filters, setFilters] = useState({
    flight: "", depStn: "", std: "", bt: "", sta: "", arrStn: "", variant: "",
    effFromDt: "", effToDt: "", dow: "", domINTL: "", userTag1: "", userTag2: "", 
    remarks1: "", remarks2: ""
  });

  // --- HANDLERS ---
  
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleSort = (column) => {
    setArrow(prev => ({
      column,
      direction: prev.column === column && prev.direction === "Up" ? "Down" : "Up"
    }));
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("accessToken");
        // Simulated API call for demo if endpoint fails
        const response = await axios.get("https://airlineplan.com/get-data", {
          headers: { "x-access-token": accessToken },
        }).catch(err => {
            console.warn("API Fail, using fallback data"); 
            return { data: [] }; 
        });
        setNetworkTableData(response.data || []);
      } catch (error) {
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter & Sort Logic
  const filteredData = useMemo(() => {
    let data = [...networkTableData];

    // Filter
    data = data.filter(row => {
      return Object.keys(filters).every(key => {
        if (!filters[key]) return true;
        const rowVal = key.includes("Dt") 
          ? moment(row[key]).format("DD-MMM-YY") 
          : String(row[key] || "");
        return rowVal.toLowerCase().includes(filters[key].toLowerCase());
      });
    });

    // Sort
    if (arrow.column) {
      data.sort((a, b) => {
        const valA = String(a[arrow.column] || "");
        const valB = String(b[arrow.column] || "");
        return arrow.direction === "Up" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      });
    }

    return data;
  }, [networkTableData, filters, arrow]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * RowsPerPage;
    return filteredData.slice(start, start + RowsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / RowsPerPage);

  // Actions
  const handleCheckAll = () => {
    if (checkedRows.length === paginatedData.length && paginatedData.length > 0) {
      setCheckedRows([]);
    } else {
      setCheckedRows(paginatedData.map(r => r._id));
    }
  };

  const handleCheckRow = (id) => {
    setCheckedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if(!checkedRows.length) return toast.warning("Select rows to delete");
    if(!window.confirm(`Delete ${checkedRows.length} rows?`)) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      await axios.delete("https://airlineplan.com/delete", {
        data: { ids: checkedRows },
        headers: { "x-access-token": accessToken }
      });
      toast.success("Rows deleted successfully");
      setNetworkTableData(prev => prev.filter(r => !checkedRows.includes(r._id)));
      setCheckedRows([]);
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const handleFileUpload = async () => {
    if(!selectedFile) return toast.warning("Please select a file");
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    setLoading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await axios.post("https://airlineplan.com/importUser", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "x-access-token": accessToken 
        },
      });
      
      if(res.data.status === 200) {
        toast.success(res.data.msg || "Upload successful");
        setIsUploadOpen(false);
        // Trigger reload or refetch here
      } else {
        toast.warn(res.data.msg || "Upload finished with warnings");
      }
    } catch(e) {
      toast.error(e.response?.data?.msg || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  const columns = [
    { id: "flight", label: "Flight #" },
    { id: "depStn", label: "Dep Stn" },
    { id: "std", label: "STD (LT)" },
    { id: "bt", label: "BT" },
    { id: "sta", label: "STA (LT)" },
    { id: "arrStn", label: "Arr Stn" },
    { id: "variant", label: "Variant" },
    { id: "effFromDt", label: "Eff From" },
    { id: "effToDt", label: "Eff To" },
    { id: "dow", label: "DoW" },
    { id: "domINTL", label: "Dom/Intl" },
    { id: "userTag1", label: "Tag 1" },
    { id: "userTag2", label: "Tag 2" },
    { id: "remarks1", label: "Remarks 1" },
    { id: "remarks2", label: "Remarks 2" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-8 font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="absolute top-0 right-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-cyan-500 opacity-10 blur-[100px]"></div>
      <div className="absolute bottom-0 left-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-indigo-500 opacity-10 blur-[100px]"></div>

      <div className="max-w-[1600px] mx-auto relative z-10 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
              Network Schedule
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage flight schedules and network data.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button 
               variant="secondary" 
               icon={Upload} 
               onClick={() => setIsUploadOpen(true)}
             >
               Import Schedule
             </Button>
             
             {/* Placeholder for Add Menu - Logic would go here */}
             <div className="relative">
               <Button 
                 variant="primary" 
                 icon={Plus} 
                 onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
               >
                 Add New
               </Button>
               {isAddMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => toast.info("Copy Row Triggered")}>Copy Row</button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => toast.info("Add Network Triggered")}>Add Network</button>
                 </div>
               )}
             </div>

             {checkedRows.length > 0 && (
               <Button variant="danger" icon={Trash2} onClick={handleDelete}>
                 Delete ({checkedRows.length})
               </Button>
             )}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[75vh]">
          
          {/* Table Container - Scrollable */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  <th className="p-4 w-12 text-center sticky left-0 bg-slate-100/80 dark:bg-slate-800/80 z-30">
                     <Checkbox 
                       checked={checkedRows.length === paginatedData.length && paginatedData.length > 0} 
                       onChange={handleCheckAll} 
                     />
                  </th>
                  {columns.map((col) => (
                    <th key={col.id} className="p-3 min-w-[120px] font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div className="flex flex-col gap-2">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          onClick={() => handleSort(col.id)}
                        >
                          {col.label}
                          {arrow.column === col.id ? (
                             arrow.direction === "Up" ? <ArrowUp size={12}/> : <ArrowDown size={12}/> 
                          ) : (
                             <ArrowUp size={12} className="opacity-0 group-hover:opacity-30"/>
                          )}
                        </div>
                        <TableInput 
                          value={filters[col.id]} 
                          onChange={(e) => handleFilterChange(col.id, e.target.value)}
                          placeholder={`Filter...`}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                   <tr><td colSpan="16" className="p-8 text-center text-slate-500">Loading data...</td></tr>
                ) : paginatedData.length === 0 ? (
                   <tr><td colSpan="16" className="p-8 text-center text-slate-500">No records found matching filters.</td></tr>
                ) : (
                  <AnimatePresence>
                    {paginatedData.map((row) => (
                      <motion.tr
                        key={row._id || Math.random()}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                          checkedRows.includes(row._id) && "bg-indigo-50/50 dark:bg-indigo-900/10"
                        )}
                      >
                        <td className="p-4 sticky left-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-10 text-center">
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={checkedRows.includes(row._id)} 
                              onChange={() => handleCheckRow(row._id)} 
                            />
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium text-slate-700 dark:text-slate-200">{row.flight}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.depStn}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.std}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.bt}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.sta}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.arrStn}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            {row.variant}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{moment(row.effFromDt).format("DD-MMM-YY")}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{moment(row.effToDt).format("DD-MMM-YY")}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.dow}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            row.domINTL?.toLowerCase() === 'intl' 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" 
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          )}>
                            {row.domINTL}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.userTag1}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{row.userTag2}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={row.remarks1}>{row.remarks1}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={row.remarks2}>{row.remarks2}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="text-sm text-slate-500">
                Showing {paginatedData.length > 0 ? (currentPage - 1) * RowsPerPage + 1 : 0} to {Math.min(currentPage * RowsPerPage, filteredData.length)} of {filteredData.length} entries
             </div>
             
             <div className="flex items-center gap-2">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
               >
                 <ChevronLeft size={16} />
               </button>
               
               {/* Simple Pagination Logic - can be expanded */}
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 // Logic to show correct page numbers around current page
                 let pNum = i + 1;
                 if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                 if (pNum > totalPages) return null;
                 
                 return (
                   <button
                     key={pNum}
                     onClick={() => setCurrentPage(pNum)}
                     className={cn(
                       "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                       currentPage === pNum 
                         ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                         : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                     )}
                   >
                     {pNum}
                   </button>
                 );
               })}
               
               <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages || totalPages === 0}
                 className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
               >
                 <ChevronRight size={16} />
               </button>
             </div>
          </div>
        </div>

      </div>

      {/* --- MODALS --- */}
      
      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Schedule">
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
              <FileSpreadsheet className="text-indigo-500" size={24} />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {selectedFile ? selectedFile.name : "Click to browse or drag file here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports .xlsx, .csv</p>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleFileUpload} disabled={loading || !selectedFile}>
              {loading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}