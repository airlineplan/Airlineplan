import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Upload, Plus, Trash2, ArrowUp, ArrowDown,
  Search, FileSpreadsheet, X, Check, ChevronLeft, ChevronRight, Network
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- EXTERNAL COMPONENTS ---
// Make sure these are properly imported from your directory structure
import UpdatePopUp from "./UpdatePopUp";
import CopyRow from "./CopyRow";
import AddNetwork from "./AddNetwork";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- UI COMPONENTS ---
const Button = ({ children, variant = "primary", className, icon: Icon, loading, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 shadow-lg shadow-indigo-500/20 hover:scale-[1.02]",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-transparent hover:bg-red-100 dark:hover:bg-red-900/30",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} disabled={loading} {...props}>
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      ) : Icon && (
        <Icon size={16} className="mr-2" />
      )}
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
    <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
  </div>
);

const Checkbox = ({ checked, onChange }) => (
  <div
    onClick={onChange}
    className={cn(
      "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0",
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
const RowsPerPage = 8;

export default function NetworkTable() {
  // --- STATE ---
  const [networkTableData, setNetworkTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Modals & Menus
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [add, setAdd] = useState(true);

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

  const menuRef = useRef(null);

  // Close Add Menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- API / DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get("http://localhost:3000/get-data", {
          headers: { "x-access-token": accessToken },
        });
        setNetworkTableData(response.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // --- HANDLERS ---
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    setArrow(prev => ({
      column,
      direction: prev.column === column && prev.direction === "Up" ? "Down" : "Up"
    }));
  };

  // Logic mapping: Exact matching of your filtering and sorting logic
  const filteredData = useMemo(() => {
    let data = [...networkTableData];

    data = data.filter(row => {
      return (
        (row?.flight || "").toLowerCase().includes(filters.flight.toLowerCase()) &&
        (row?.depStn || "").toLowerCase().includes(filters.depStn.toLowerCase()) &&
        (row?.std || "").toLowerCase().includes(filters.std.toLowerCase()) &&
        (row?.bt || "").toLowerCase().includes(filters.bt.toLowerCase()) &&
        (row?.sta || "").toLowerCase().includes(filters.sta.toLowerCase()) &&
        (row?.arrStn || "").toLowerCase().includes(filters.arrStn.toLowerCase()) &&
        (row?.variant || "").toLowerCase().includes(filters.variant.toLowerCase()) &&
        (moment(row.effFromDt).format("DD-MMM-YY") || "").toLowerCase().includes(filters.effFromDt.toLowerCase()) &&
        (moment(row?.effToDt).format("DD-MMM-YY") || "").toLowerCase().includes(filters.effToDt.toLowerCase()) &&
        (row?.dow || "").toLowerCase().includes(filters.dow.toLowerCase()) &&
        (row?.domINTL || "").toLowerCase().includes(filters.domINTL.toLowerCase()) &&
        (row?.userTag1 || "").toLowerCase().includes(filters.userTag1.toLowerCase()) &&
        (row?.userTag2 || "").toLowerCase().includes(filters.userTag2.toLowerCase()) &&
        (row?.remarks1 || "").toLowerCase().includes(filters.remarks1.toLowerCase()) &&
        (row?.remarks2 || "").toLowerCase().includes(filters.remarks2.toLowerCase())
      );
    });

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
    const startIndex = (currentPage - 1) * RowsPerPage;
    return filteredData.slice(startIndex, startIndex + RowsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / RowsPerPage);

  // Checkbox Handlers
  const handleCheckAll = () => {
    if (checkedRows.length === filteredData.length && filteredData.length > 0) {
      setCheckedRows([]);
    } else {
      setCheckedRows(filteredData.map(r => r._id));
    }
  };

  const handleCheckRow = (id) => {
    setCheckedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Data Actions
  const handleDeleteData = async () => {
    if (!checkedRows.length) return toast.warning("Select rows to delete");

    const isConfirmed = window.confirm("Are you sure you want to delete this data?");
    if (!isConfirmed) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      // Make sure your URL points to your actual API (localhost or render based on your environment)
      const response = await axios.delete("http://localhost:3000/delete", {
        data: { ids: checkedRows }, // This injects the payload into the request body
        headers: { "x-access-token": accessToken }
      });

      if (response.data && response.data.message === "Data deleted successfully") {
        toast.success("Delete Successful");

        // Clear checkboxes after successful deletion
        setCheckedRows([]);

        // Trigger table refresh without reloading the browser
        setTimeout(() => window.dispatchEvent(new Event("refreshData")), 2000);
      } else {
        toast.error("Delete Failed");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || "An error occurred while deleting";
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return toast.warning("Please select a file");

    const formData = new FormData();
    formData.append("file", selectedFile);
    setLoading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post("http://localhost:3000/importUser", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-access-token": accessToken
        },
      });

      setLoading(false);

      if (response.data.skippedRows && response.data.skippedRows.length > 0) {
        response.data.skippedRows.forEach((skippedRow) => {
          if (skippedRow.error === "Invalid flight number") toast.error("Flight number is invalid for a row.");
          else if (skippedRow.error === "Invalid departure station") toast.error("Departure station is invalid for a row.");
          else if (skippedRow.error === "Invalid Arr stn station") toast.error("Arr station is invalid for a row.");
          else if (skippedRow.error === "Invalid variant station") toast.error("Invalid variant for a row.");
          else if (skippedRow.error === "Invalid day of week") toast.error("Day of week is invalid for a row.");
          else if (skippedRow.error === "Data already exists") toast.error("Data already exists for a row.");
        });
      } else {
        setIsUploadOpen(false);
        setTimeout(() => window.dispatchEvent(new Event("refreshData")), 2000);
      }

      if (response.data.status === 200) {
        toast.success(response.data.msg);
        setIsUploadOpen(false);
        setTimeout(() => window.dispatchEvent(new Event("refreshData")), 2000);
      }

    } catch (error) {
      console.error(error);
      setLoading(false);
      const errorMessage = error.response?.data?.msg || "An error occurred";
      toast.error(errorMessage);
    }
  };

  // --- COLUMNS CONFIG ---
  const columns = [
    { id: "flight", label: "Flight #" },
    { id: "depStn", label: "Dep Stn" },
    { id: "std", label: "STD (LT)" },
    { id: "bt", label: "BT" },
    { id: "sta", label: "STA (LT)" },
    { id: "arrStn", label: "Arr Stn" },
    { id: "variant", label: "Variant" },
    { id: "effFromDt", label: "Eff From Dt" },
    { id: "effToDt", label: "Eff To Dt" },
    { id: "dow", label: "DoW" },
    { id: "domINTL", label: "Dom/Intl" },
    { id: "userTag1", label: "User Tag 1" },
    { id: "userTag2", label: "User Tag 2" },
    { id: "remarks1", label: "Remarks 1" },
    { id: "remarks2", label: "Remarks 2" },
  ];

  return (
    <div className="w-full space-y-4 font-sans relative overflow-hidden">

      <div className="mx-auto relative z-10 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
          <div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => setIsUploadOpen(true)}
            >
              Upload Schedule
            </Button>

            {/* Actual Component Integrations */}
            <div className="relative" ref={menuRef}>
              <div className="flex items-center gap-2">

                {/* Render Your Custom Update Component */}
                <UpdatePopUp checkedRows={checkedRows} />

                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                >
                  Add
                </Button>

              </div>

              {/* Add Menu Dropdown containing your native components */}
              <AnimatePresence>
                {isAddMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-2 z-50 flex flex-col"
                  >
                    <div className="px-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <CopyRow checkedRows={checkedRows} setAdd={setAdd} />
                    </div>
                    <div className="px-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">

                      <AddNetwork setAdd={setAdd} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {checkedRows.length > 0 && (
              <Button variant="danger" icon={Trash2} onClick={handleDeleteData}>
                Delete ({checkedRows.length})
              </Button>
            )}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[70vh]">

          {/* Table Container - Scrollable */}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  <th className="p-4 w-12 text-center sticky left-0 bg-slate-100/90 dark:bg-slate-800/90 z-30">
                    <Checkbox
                      checked={checkedRows.length === filteredData.length && filteredData.length > 0}
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
                            arrow.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUp size={12} className="opacity-0 group-hover:opacity-30" />
                          )}
                        </div>
                        <TableInput
                          value={filters[col.id]}
                          onChange={(e) => handleFilterChange(col.id, e.target.value)}
                          placeholder={`Filter ${col.label}...`}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedData.length === 0 ? (
                  <tr><td colSpan="16" className="p-10 text-center text-slate-500 text-sm italic">No records found matching filters.</td></tr>
                ) : (
                  <AnimatePresence>
                    {paginatedData.map((row) => (
                      <motion.tr
                        key={row._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                          checkedRows.includes(row._id) && "bg-indigo-50/50 dark:bg-indigo-900/10"
                        )}
                      >
                        <td className="p-4 sticky left-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-10 text-center border-r border-slate-100 dark:border-slate-800">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={checkedRows.includes(row._id)}
                              onChange={() => handleCheckRow(row._id)}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.flight}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.depStn}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.std}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.bt}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.sta}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.arrStn}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            {row.variant}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{moment(row.effFromDt).format("DD-MMM-YY")}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{moment(row.effToDt).format("DD-MMM-YY")}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.dow}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-medium",
                            row.domINTL?.toLowerCase() === 'intl'
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          )}>
                            {row.domINTL}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.userTag1}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.userTag2}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={row.remarks1}>{row.remarks1}</td>
                        <td className="p-3 text-xs text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={row.remarks2}>{row.remarks2}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* STANDARDIZED Footer / Pagination */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing {paginatedData.length > 0 ? (currentPage - 1) * RowsPerPage + 1 : 0} to {Math.min(currentPage * RowsPerPage, filteredData.length)} of {filteredData.length} entries
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

      </div>

      {/* --- MODALS --- */}

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
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={loading} onClick={handleFileUpload} disabled={loading || !selectedFile}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}