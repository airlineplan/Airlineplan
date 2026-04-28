import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../../apiConfig";
import {
    Calculator, Settings, Download, Edit, RefreshCw, Layers,
    Search, ArrowUp, ArrowDown, X, Trash2, Gauge
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useEscapeKey from "../../../hooks/useEscapeKey";


// --- COMPONENTS ---
const TableInput = ({ name, value, onChange, placeholder }) => (
    <div className="relative group mt-1">
        <input
            type="text"
            name={name}
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full h-8 px-2.5 py-1 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all font-normal"
        />
        <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
);

const modalEditableInputClass = "w-full min-w-[96px] h-9 px-2.5 py-1.5 text-sm leading-5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100";
const calendarEditableInputClass = "w-full min-w-[120px] h-8 px-2.5 py-1 text-sm leading-5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100";
const modalEditableSelectClass = `${modalEditableInputClass} appearance-none cursor-pointer`;
const targetCategoryOptions = ["Conserve", "Run-down"];
const STATUS_LABELS = {
    tsn: { code: "TSN", description: "Time since new" },
    csn: { code: "CSN", description: "Cycles since new" },
    dsn: { code: "DSN", description: "Days since new" },
    tso: { code: "TSO/TSRtrtn", description: "Time since Overhaul/Restoration" },
    cso: { code: "CSO/CSRtrtn", description: "Cycles since Overhaul/Restoration" },
    dso: { code: "DSO/DSRtrtn", description: "Days since Overhaul/Restoration" },
    tsr: { code: "TSRplmt", description: "Time since Replacement" },
    csr: { code: "CSRplmt", description: "Cycles since Replacement" },
    dsr: { code: "DSRplmt", description: "Days since Replacement" }
};
const MAINTENANCE_STATUS_COLUMNS = [
    STATUS_LABELS.tsn,
    STATUS_LABELS.csn,
    STATUS_LABELS.dsn,
    STATUS_LABELS.tso,
    STATUS_LABELS.cso,
    STATUS_LABELS.dso,
    STATUS_LABELS.tsr,
    STATUS_LABELS.csr,
    STATUS_LABELS.dsr
];
const FORECAST_STATUS_COLUMNS = MAINTENANCE_STATUS_COLUMNS;
const formatStatusExportLabel = (column) => `${column.code} - ${column.description}`;
const StatusHeaderLabel = ({ column }) => (
    <span className="flex flex-col items-center justify-center gap-0.5">
        <span className="font-semibold">{column.code}</span>
        <span className="text-xs font-normal leading-tight text-slate-500 dark:text-slate-400">{column.description}</span>
    </span>
);
const statusHeaderClass = "p-2 border border-slate-200 dark:border-slate-700 min-w-[220px] whitespace-normal leading-tight";
const modalStatusHeaderClass = "p-2 border-r border-slate-200 dark:border-slate-700 text-center font-semibold min-w-[220px] whitespace-normal leading-tight";
const targetStatusHeaderClass = "p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 text-center min-w-[220px] whitespace-normal leading-tight";
const targetLastStatusHeaderClass = "p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm text-center min-w-[220px] whitespace-normal leading-tight";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_INDEX = MONTHS.reduce((acc, month, index) => {
    acc[month.toLowerCase()] = index;
    return acc;
}, {});

const pad2 = (value) => String(value).padStart(2, "0");

const toIsoDate = (value) => {
    if (!value) return "";
    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return text;

    const displayMatch = text.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{2}|\d{4})$/);
    if (!displayMatch) return "";

    const day = Number(displayMatch[1]);
    const month = MONTH_INDEX[displayMatch[2].toLowerCase()];
    const yearPart = displayMatch[3];
    const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
    const parsed = new Date(Date.UTC(year, month, day));

    if (
        month === undefined ||
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month ||
        parsed.getUTCDate() !== day
    ) {
        return "";
    }

    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
};

const formatDateForDisplay = (value) => {
    const isoDate = toIsoDate(value);
    if (!isoDate) return value || "";
    const [, month, day] = isoDate.split("-");
    return `${day}-${MONTHS[Number(month) - 1]}-${isoDate.slice(2, 4)}`;
};

const DateTextInput = ({ value, onChange, className = "", placeholder = "dd-mmm-yy" }) => {
    const [displayValue, setDisplayValue] = useState(formatDateForDisplay(value));

    useEffect(() => {
        setDisplayValue(formatDateForDisplay(value));
    }, [value]);

    const commitValue = (nextValue) => {
        if (!nextValue.trim()) {
            onChange("");
            setDisplayValue("");
            return;
        }

        const isoDate = toIsoDate(nextValue);
        if (isoDate) {
            onChange(isoDate);
            setDisplayValue(formatDateForDisplay(isoDate));
        }
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={(e) => {
                const nextValue = e.target.value;
                setDisplayValue(nextValue);
                if (!nextValue.trim()) {
                    onChange("");
                    return;
                }
                const isoDate = toIsoDate(nextValue);
                if (isoDate) {
                    onChange(isoDate);
                }
            }}
            onBlur={(e) => commitValue(e.target.value)}
            placeholder={placeholder}
            className={className}
        />
    );
};

const DatePickerInput = ({ value, onChange, className = "" }) => (
    <input
        type="date"
        value={toIsoDate(value)}
        onChange={(e) => onChange(e.target.value)}
        className={className}
    />
);

const MaintenanceDashboard = () => {
    const [selectedDate, setSelectedDate] = useState("2025-10-12");
    const [selectedMsn, setSelectedMsn] = useState("");

    // Dynamic State for Main Tables
    const [maintenanceData, setMaintenanceData] = useState([]);
    const [targetData, setTargetData] = useState([]);
    const [calendarData, setCalendarData] = useState([]);
    const [isEditingCalendar, setIsEditingCalendar] = useState(false);

    const isPersistedId = (id) => id && !String(id).startsWith("temp-");
    const deleteIconButtonClass = "inline-flex items-center justify-center p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors";
    const actionHeaderClass = "p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-100 dark:bg-slate-800/90 min-w-[100px]";
    const actionCellClass = "p-2 border-l border-slate-200 dark:border-slate-700 text-center bg-white dark:bg-slate-800";

    const fetchDashboardData = async () => {
        setMaintenanceData([]);
        try {
            const res = await api.get('/maintenance/dashboard', {
                params: {
                    date: selectedDate,
                    msnEsn: selectedMsn || undefined
                }
            });
            setMaintenanceData(Array.isArray(res.data?.data?.maintenanceData) ? res.data.data.maintenanceData : []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    };

    const fetchTargetsData = async () => {
        setTargetData([]);
        try {
            const res = await api.get('/maintenance/targets', {
                params: {
                    date: selectedDate,
                    msnEsn: selectedMsn || undefined
                }
            });
            setTargetData(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (error) {
            console.error("Failed to fetch targets data:", error);
        }
    };

    const fetchCalendarData = async () => {
        try {
            const res = await api.get('/maintenance/calendar');
            if (res.data && res.data.success) {
                setCalendarData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch calendar data:", error);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchDashboardData();
            fetchTargetsData();
        }, 300);

        fetchCalendarData();

        return () => clearTimeout(timeoutId);
    }, [selectedDate, selectedMsn]);

    const handleCalendarFieldChange = (id, field, value) => {
        setCalendarData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleDeleteCalendarRow = async (row) => {
        try {
            setCalendarData(prev => prev.filter(item => item.id !== row.id));
            setIsEditingCalendar(true);
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/calendar/${row.id}`);
                toast.success("Calendar input deleted.");
            }
        } catch (error) {
            console.error("Failed to delete calendar row", error);
            toast.error(error.response?.data?.message || "Failed to delete calendar input.");
            fetchCalendarData();
        }
    };

    const handleDeleteMaintenanceRow = async (row) => {
        try {
            setMaintenanceData(prev => prev.filter(item => item.id !== row.id));
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/reset-records/${row.id}`);
                toast.success("Maintenance reset record deleted.");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Failed to delete maintenance status row", error);
            toast.error(error.response?.data?.message || "Failed to delete maintenance status row.");
            fetchDashboardData();
        }
    };

    const handleDeleteTargetStatusRow = async (row) => {
        try {
            setTargetData(prev => prev.filter(item => item.id !== row.id));
            setTargetsData(prev => prev.filter(item => item.id !== row.id));
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/targets/${row.id}`);
                toast.success("Target maintenance status deleted.");
                fetchTargetsData();
            }
        } catch (error) {
            console.error("Failed to delete target maintenance status row", error);
            toast.error(error.response?.data?.message || "Failed to delete target maintenance status row.");
            fetchTargetsData();
        }
    };

    const handleAddCalendarRow = () => {
        const newRow = {
            id: `temp-${Date.now()}`,
            isNew: true,
            calLabel: "", lineBase: "", calMsn: "", schEvent: "", calPn: "", snBn: "",
            eTsn: "", eCsn: "", eDsn: "", eTso: "", eCso: "", eDso: "", eTsr: "", eCsr: "", eDsr: "",
            lastOccurre: "", nextEstima: "", downDays: "", avgDownda: "", occurrence: "", soTsr: ""
        };
        setCalendarData([...calendarData, newRow]);
        setIsEditingCalendar(true);
    };

    const handleUpdateCalendar = async () => {
        try {
            await api.post('/maintenance/calendar', { calendarData: calendarData });
            setIsEditingCalendar(false);
            fetchCalendarData();
        } catch (error) {
            console.error("Failed to update calendar", error);
        }
    };

    // State for Sorting and Filtering (Main Page)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });
    const [filters, setFilters] = useState({});

    // --- MODAL STATE & LOGIC ---
    const [showSetResetModal, setShowSetResetModal] = useState(false);
    const [resetAssetSN, setResetAssetSN] = useState("");
    const [resetDate, setResetDate] = useState("");
    const [modalTableData, setModalTableData] = useState([]);
    const [isEditingModal, setIsEditingModal] = useState(false);
    const [modalSortConfig, setModalSortConfig] = useState({ key: null, direction: "Up" });
    const [modalFilters, setModalFilters] = useState({ msnEsn: "", pn: "", snBn: "" });
    const [isComputing, setIsComputing] = useState(false);
    const [isUpdatingResetRecords, setIsUpdatingResetRecords] = useState(false);
    const [assetSnOptions, setAssetSnOptions] = useState([]);

    const openSetResetModal = ({ msnEsn = "", date = "" } = {}) => {
        setModalFilters({ msnEsn: "", pn: "", snBn: "" });
        setModalSortConfig({ key: null, direction: "Up" });
        setModalTableData([]);
        setResetAssetSN(msnEsn);
        setResetDate(date || selectedDate || "");
        setShowSetResetModal(true);
    };

    // Filter Modal Table whenever Asset SN or Date changes (now via API)
    useEffect(() => {
        if (!showSetResetModal) return;

        const fetchRecords = async () => {
            if (!resetAssetSN && !resetDate) {
                setModalTableData([]);
                return;
            }

            try {
                const res = await api.get('/maintenance/reset-records', {
                    params: {
                        date: resetDate || undefined,
                        msnEsn: resetAssetSN || undefined
                    }
                });

                if (res.data && res.data.success) {
                    const records = res.data.data;

                    // Populate table
                    setModalTableData(records);
                }
            } catch (error) {
                console.error("Failed to fetch reset records:", error);
            }
        };

        // Debounce API calls slightly
        const timeoutId = setTimeout(() => {
            fetchRecords();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [showSetResetModal, resetAssetSN, resetDate]);

    const handleModalSort = (key) => {
        setModalSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
        }));
    };

    const handleModalFilterChange = (e) => {
        const { name, value } = e.target;
        setModalFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredModalTableData = useMemo(() => {
        let processed = [...modalTableData];
        // Filter logic
        Object.entries(modalFilters).forEach(([key, value]) => {
            if (value !== "") {
                processed = processed.filter(row =>
                    row[key] !== undefined &&
                    String(row[key]).toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });
        // Sort logic
        if (modalSortConfig.key) {
            processed.sort((a, b) => {
                let valA = a[modalSortConfig.key] || "";
                let valB = b[modalSortConfig.key] || "";
                if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }
                if (valA < valB) return modalSortConfig.direction === "Up" ? -1 : 1;
                if (valA > valB) return modalSortConfig.direction === "Up" ? 1 : -1;
                return 0;
            });
        }
        return processed;
    }, [modalTableData, modalFilters, modalSortConfig]);

    const duplicateResetCombos = useMemo(() => {
        const comboCounts = new Map();

        modalTableData.forEach(row => {
            const msnEsn = String(row.msnEsn || "").trim();
            const pn = String(row.pn || "").trim();
            const snBn = String(row.snBn || "").trim();

            if (!msnEsn || !pn || !snBn) {
                return;
            }

            const key = `${msnEsn.toUpperCase()}|${pn.toUpperCase()}|${snBn.toUpperCase()}`;
            comboCounts.set(key, (comboCounts.get(key) || 0) + 1);
        });

        return [...comboCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([key]) => {
                const [msnEsn, pn, snBn] = key.split("|");
                return { msnEsn, pn, snBn };
            });
    }, [modalTableData]);

    const duplicateResetWarning = duplicateResetCombos.length > 0
        ? `Each MSN/ESN + PN + SN/BN can have only one reset row. Duplicate combo${duplicateResetCombos.length > 1 ? "s" : ""} found: ${duplicateResetCombos
            .map(item => `${item.msnEsn}/${item.pn}/${item.snBn}`)
            .join(", ")}.`
        : "";

    const handleAddModalRow = () => {
        const newRow = {
            id: `temp-${Date.now()}`,
            date: resetDate || selectedDate || "",
            msnEsn: "", pn: "", snBn: "",
            tsn: "", csn: "", dsn: "", tso: "", cso: "", dso: "", tsr: "", csr: "", dsr: "", metric: "BH",
            isNew: true
        };
        setModalTableData(prev => [...prev, newRow]);
        setIsEditingModal(true);
    };

    const handleModalFieldChange = (id, field, value) => {
        setModalTableData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleDeleteModalRow = async (row) => {
        try {
            setModalTableData(prev => prev.filter(item => item.id !== row.id));
            setIsEditingModal(true);
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/reset-records/${row.id}`);
                toast.success("Maintenance reset record deleted.");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Failed to delete reset record", error);
            toast.error(error.response?.data?.message || "Failed to delete maintenance reset record.");
            if (resetAssetSN || resetDate) {
                const res = await api.get('/maintenance/reset-records', {
                    params: {
                        date: resetDate || undefined,
                        msnEsn: resetAssetSN || undefined
                    }
                });
                if (res.data && res.data.success) setModalTableData(res.data.data);
            }
        }
    };

    const handleUpdateModal = async () => {
        try {
            if (duplicateResetCombos.length > 0) {
                toast.warning("Duplicate PN + SN/BN reset rows found. Please keep only one reset row for each MSN/ESN + PN + SN/BN combination.");
                return;
            }

            if (!resetDate && modalTableData.some(row => !row.date)) {
                toast.warning("Please select an As on date before saving reset records.");
                return;
            }

            setIsUpdatingResetRecords(true);
            const rowsToSave = modalTableData.map(row => ({
                ...row,
                date: row.date || resetDate || selectedDate || ""
            }));

            const res = await api.post('/maintenance/reset-records', {
                resetData: rowsToSave,
                resetDate: resetDate || selectedDate || ""
            });
            toast.success(res.data?.message || "Maintenance reset records updated successfully!");

            setIsEditingModal(false);
            setShowSetResetModal(false); // Close modal on success

            // Refresh main dashboard table after a successful reset
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to update records", error);
            toast.error(error.response?.data?.message || "Failed to save maintenance reset records.");
        } finally {
            setIsUpdatingResetRecords(false);
        }
    };

    // --- ROTABLES MODAL STATE & LOGIC ---
    const [showRotablesModal, setShowRotablesModal] = useState(false);
    const [rotablesData, setRotablesData] = useState([]);
    const [isEditingRotables, setIsEditingRotables] = useState(false);
    const [rotablesSortConfig, setRotablesSortConfig] = useState({ key: null, direction: "Up" });
    const [rotablesFilters, setRotablesFilters] = useState({ label: "", date: "", pn: "", msn: "", acftRegn: "", position: "", removedSN: "", installedSN: "" });

    const fetchRotablesData = async () => {
        try {
            const res = await api.get('/maintenance/rotables');
            if (res.data && res.data.success) {
                setRotablesData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch rotables data:", error);
        }
    };

    const handleRotablesClick = () => {
        setShowRotablesModal(true);
        fetchRotablesData();
    };

    const handleRotablesSort = (key) => {
        setRotablesSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
        }));
    };

    const handleRotablesFilterChange = (e) => {
        const { name, value } = e.target;
        setRotablesFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredRotablesData = useMemo(() => {
        let processed = [...rotablesData];
        Object.entries(rotablesFilters).forEach(([key, value]) => {
            if (value !== "") {
                processed = processed.filter(row =>
                    row[key] !== undefined &&
                    String(row[key]).toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });
        if (rotablesSortConfig.key) {
            processed.sort((a, b) => {
                let valA = a[rotablesSortConfig.key] || "";
                let valB = b[rotablesSortConfig.key] || "";
                if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }
                if (valA < valB) return rotablesSortConfig.direction === "Up" ? -1 : 1;
                if (valA > valB) return rotablesSortConfig.direction === "Up" ? 1 : -1;
                return 0;
            });
        }
        return processed;
    }, [rotablesData, rotablesFilters, rotablesSortConfig]);

    const handleRotablesFieldChange = (id, field, value) => {
        setRotablesData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleDeleteRotablesRow = async (row) => {
        try {
            setRotablesData(prev => prev.filter(item => item.id !== row.id));
            setIsEditingRotables(true);
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/rotables/${row.id}`);
                toast.success("Rotable movement deleted.");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Failed to delete rotable movement", error);
            toast.error(error.response?.data?.message || "Failed to delete rotable movement.");
            fetchRotablesData();
        }
    };

    const handleAddRotablesRow = () => {
        const newRow = {
            id: `temp-${Date.now()}`,
            isNew: true,
            label: "", date: "", pn: "", msn: "", acftRegn: "", position: "", removedSN: "", installedSN: ""
        };
        setRotablesData([...rotablesData, newRow]);
        setIsEditingRotables(true);
    };

    const handleUpdateRotables = async () => {
        try {
            await api.post('/maintenance/rotables', { rotablesData: rotablesData });
            setIsEditingRotables(false);
            setShowRotablesModal(false);
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to update rotables", error);
        }
    };

    const downloadRotablesExcel = () => {
        if (!rotablesData || rotablesData.length === 0) {
            toast.warning("No rotables data available to download.");
            return;
        }
        const exportData = rotablesData.map(row => ({
            "Label": row.label || "",
            "Date (EoD)": formatDateForDisplay(row.date),
            "PN": row.pn || "",
            "MSN": row.msn || "",
            "ACFT Regn": row.acftRegn || "",
            "Position (for PN)": row.position || "",
            "Removed SN": row.removedSN || "",
            "Installed SN": row.installedSN || ""
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Major Rotables Movement");
        XLSX.writeFile(workbook, "Major_Rotables_Movement.xlsx");
    };

    // --- TARGETS MODAL STATE & LOGIC ---
    const [showTargetsModal, setShowTargetsModal] = useState(false);
    const [targetsData, setTargetsData] = useState([]);
    const [isEditingTargets, setIsEditingTargets] = useState(false);
    const [targetsSortConfig, setTargetsSortConfig] = useState({ key: null, direction: "Up" });
    const [targetsFilters, setTargetsFilters] = useState({ label: "", msnEsn: "", pn: "", snBn: "", category: "", date: "" });
    const [showUtilisationModal, setShowUtilisationModal] = useState(false);
    const [utilisationData, setUtilisationData] = useState([]);
    const [isEditingUtilisation, setIsEditingUtilisation] = useState(false);
    const [utilisationSortConfig, setUtilisationSortConfig] = useState({ key: null, direction: "Up" });
    const [utilisationFilters, setUtilisationFilters] = useState({ msn: "", fromDate: "", toDate: "", hours: "", cycles: "", avgDowndays: "" });

    useEffect(() => {
        if (!showSetResetModal && !showTargetsModal && !showUtilisationModal) return;

        let isActive = true;

        const fetchFleetOptions = async () => {
            try {
                const res = await api.get("/fleet");
                const fleetRows = Array.isArray(res.data?.data) ? res.data.data : [];
                const uniqueSnValues = [...new Set(
                    fleetRows
                        .map(asset => String(asset?.sn || "").trim())
                        .filter(Boolean)
                )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

                if (isActive) {
                    setAssetSnOptions(uniqueSnValues);
                }
            } catch (error) {
                console.error("Failed to fetch fleet options:", error);
                if (isActive) {
                    setAssetSnOptions([]);
                }
            }
        };

        fetchFleetOptions();

        return () => {
            isActive = false;
        };
    }, [showSetResetModal, showTargetsModal, showUtilisationModal]);

    useEscapeKey(
        showSetResetModal || showRotablesModal || showTargetsModal || showUtilisationModal,
        () => {
            setShowSetResetModal(false);
            setShowRotablesModal(false);
            setShowTargetsModal(false);
            setShowUtilisationModal(false);
        }
    );

    const fetchTargetsModalData = async () => {
        try {
            const res = await api.get('/maintenance/targets');
            if (res.data && res.data.success) {
                setTargetsData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch targets data:", error);
        }
    };

    const handleTargetsClick = () => {
        setShowTargetsModal(true);
        fetchTargetsModalData();
    };

    const handleTargetsSort = (key) => {
        setTargetsSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
        }));
    };

    const handleTargetsFilterChange = (e) => {
        const { name, value } = e.target;
        setTargetsFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredTargetsData = useMemo(() => {
        let processed = [...targetsData];
        Object.entries(targetsFilters).forEach(([key, value]) => {
            if (value !== "") {
                processed = processed.filter(row =>
                    row[key] !== undefined &&
                    String(row[key]).toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });
        if (targetsSortConfig.key) {
            processed.sort((a, b) => {
                let valA = a[targetsSortConfig.key] || "";
                let valB = b[targetsSortConfig.key] || "";
                if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }
                if (valA < valB) return targetsSortConfig.direction === "Up" ? -1 : 1;
                if (valA > valB) return targetsSortConfig.direction === "Up" ? 1 : -1;
                return 0;
            });
        }
        return processed;
    }, [targetsData, targetsFilters, targetsSortConfig]);

    const handleTargetsFieldChange = (id, field, value) => {
        setTargetsData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleDeleteTargetsRow = async (row) => {
        try {
            setTargetsData(prev => prev.filter(item => item.id !== row.id));
            setIsEditingTargets(true);
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/targets/${row.id}`);
                toast.success("Target maintenance status deleted.");
                fetchDashboardData();
                fetchTargetsData();
            }
        } catch (error) {
            console.error("Failed to delete target maintenance status", error);
            toast.error(error.response?.data?.message || "Failed to delete target maintenance status.");
            fetchTargetsModalData();
        }
    };

    const handleAddTargetsRow = () => {
        const newRow = {
            id: `temp-${Date.now()}`,
            isNew: true,
            label: "", msnEsn: "", pn: "", snBn: "", category: "", date: "", tsn: "", csn: "", dsn: "", tso: "", cso: "", dso: "", tsRplmt: "", csRplmt: "", dsRplmt: ""
        };
        setTargetsData([...targetsData, newRow]);
        setIsEditingTargets(true);
    };

    const handleUpdateTargets = async () => {
        try {
            const res = await api.post('/maintenance/targets', { targetData: targetsData });
            toast.success(res.data?.message || "Target maintenance status updated successfully.");
            setIsEditingTargets(false);
            setShowTargetsModal(false);
            fetchDashboardData();
            fetchTargetsData();
        } catch (error) {
            console.error("Failed to update targets", error);
            toast.error(error.response?.data?.message || "Failed to update target maintenance status.");
        }
    };

    // --- UTILISATION ASSUMPTIONS MODAL LOGIC ---
    const fetchUtilisationData = async () => {
        try {
            const res = await api.get('/maintenance/utilisation-assumptions');
            if (res.data && res.data.success) {
                setUtilisationData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch utilisation assumptions:", error);
        }
    };

    const handleUtilisationClick = () => {
        setShowUtilisationModal(true);
        fetchUtilisationData();
    };

    const handleUtilisationSort = (key) => {
        setUtilisationSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
        }));
    };

    const handleUtilisationFilterChange = (e) => {
        const { name, value } = e.target;
        setUtilisationFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredUtilisationData = useMemo(() => {
        let processed = [...utilisationData];
        Object.entries(utilisationFilters).forEach(([key, value]) => {
            if (value !== "") {
                processed = processed.filter(row =>
                    row[key] !== undefined &&
                    String(row[key]).toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });
        if (utilisationSortConfig.key) {
            processed.sort((a, b) => {
                let valA = a[utilisationSortConfig.key] || "";
                let valB = b[utilisationSortConfig.key] || "";
                if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }
                if (valA < valB) return utilisationSortConfig.direction === "Up" ? -1 : 1;
                if (valA > valB) return utilisationSortConfig.direction === "Up" ? 1 : -1;
                return 0;
            });
        }
        return processed;
    }, [utilisationData, utilisationFilters, utilisationSortConfig]);

    const handleUtilisationFieldChange = (id, field, value) => {
        setUtilisationData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleAddUtilisationRow = () => {
        const newRow = {
            id: `temp-${Date.now()}`,
            isNew: true,
            msn: selectedMsn || "",
            fromDate: selectedDate || "",
            toDate: selectedDate || "",
            hours: "",
            cycles: "",
            avgDowndays: ""
        };
        setUtilisationData([...utilisationData, newRow]);
        setIsEditingUtilisation(true);
    };

    const handleDeleteUtilisationRow = async (row) => {
        try {
            setUtilisationData(prev => prev.filter(item => item.id !== row.id));
            setIsEditingUtilisation(true);
            if (isPersistedId(row.id)) {
                await api.delete(`/maintenance/utilisation-assumptions/${row.id}`);
                toast.success("Utilisation assumption deleted.");
                fetchDashboardData();
                fetchTargetsData();
            }
        } catch (error) {
            console.error("Failed to delete utilisation assumption", error);
            toast.error(error.response?.data?.message || "Failed to delete utilisation assumption.");
            fetchUtilisationData();
        }
    };

    const handleUpdateUtilisation = async () => {
        try {
            const res = await api.post('/maintenance/utilisation-assumptions', { utilisationAssumptions: utilisationData });
            toast.success(res.data?.message || "Utilisation assumptions updated successfully.");
            setIsEditingUtilisation(false);
            setShowUtilisationModal(false);
            fetchDashboardData();
            fetchTargetsData();
        } catch (error) {
            console.error("Failed to update utilisation assumptions", error);
            toast.error(error.response?.data?.message || "Failed to update utilisation assumptions.");
        }
    };

    const downloadTargetsExcel = () => {
        if (!targetsData || targetsData.length === 0) {
            toast.warning("No targets data available to download.");
            return;
        }
        const exportData = targetsData.map(row => ({
            "Label": row.label || "",
            "MSN/ESN": row.msnEsn || "",
            "PN": row.pn || "",
            "SN/BN": row.snBn || "",
            "Category": row.category || "",
            "Date": formatDateForDisplay(row.date),
            [formatStatusExportLabel(STATUS_LABELS.tsn)]: row.tsn || "",
            [formatStatusExportLabel(STATUS_LABELS.csn)]: row.csn || "",
            [formatStatusExportLabel(STATUS_LABELS.dsn)]: row.dsn || "",
            [formatStatusExportLabel(STATUS_LABELS.tso)]: row.tso || "",
            [formatStatusExportLabel(STATUS_LABELS.cso)]: row.cso || "",
            [formatStatusExportLabel(STATUS_LABELS.dso)]: row.dso || "",
            [formatStatusExportLabel(STATUS_LABELS.tsr)]: row.tsRplmt || "",
            [formatStatusExportLabel(STATUS_LABELS.csr)]: row.csRplmt || "",
            [formatStatusExportLabel(STATUS_LABELS.dsr)]: row.dsRplmt || ""
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Set Target Maintenance Status");
        XLSX.writeFile(workbook, "Set_Target_Maintenance_Status.xlsx");
    };

    const handleDownloadModal = () => {
        if (modalTableData.length === 0) return;
        const exportData = modalTableData.map(row => ({
            "MSN/ESN": row.msnEsn,
            "PN": row.pn,
            "SN/BN": row.snBn,
            "As on": formatDateForDisplay(row.date || resetDate || selectedDate),
            [formatStatusExportLabel(STATUS_LABELS.tsn)]: row.tsn,
            [formatStatusExportLabel(STATUS_LABELS.csn)]: row.csn,
            [formatStatusExportLabel(STATUS_LABELS.dsn)]: row.dsn,
            [formatStatusExportLabel(STATUS_LABELS.tso)]: row.tso,
            [formatStatusExportLabel(STATUS_LABELS.cso)]: row.cso,
            [formatStatusExportLabel(STATUS_LABELS.dso)]: row.dso,
            [formatStatusExportLabel(STATUS_LABELS.tsr)]: row.tsr,
            [formatStatusExportLabel(STATUS_LABELS.csr)]: row.csr,
            [formatStatusExportLabel(STATUS_LABELS.dsr)]: row.dsr,
            "Appl time metric": row.metric
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reset_Records");
        XLSX.writeFile(wb, "Reset_Maintenance_Records.xlsx");
    };

    // --- MAIN PAGE HANDLERS ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up"
        }));
    };

    const getProcessedData = (dataset) => {
        let processed = [...dataset];
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "") {
                processed = processed.filter(row =>
                    row[key] !== undefined &&
                    String(row[key]).toLowerCase().includes(String(value).toLowerCase())
                );
            }
        });
        if (sortConfig.key) {
            processed.sort((a, b) => {
                let valA = a[sortConfig.key] || "";
                let valB = b[sortConfig.key] || "";
                if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }
                if (valA < valB) return sortConfig.direction === "Up" ? -1 : 1;
                if (valA > valB) return sortConfig.direction === "Up" ? 1 : -1;
                return 0;
            });
        }
        return processed;
    };

    const filteredMaintenanceData = useMemo(() => getProcessedData(maintenanceData), [maintenanceData, filters, sortConfig]);
    const filteredTargetData = useMemo(() => getProcessedData(targetData), [targetData, filters, sortConfig]);
    const filteredCalendarData = useMemo(() => getProcessedData(calendarData), [calendarData, filters, sortConfig]);

    const handleCompute = async () => {
        try {
            setIsComputing(true);
            const res = await api.post('/maintenance/compute');
            if (res.data && res.data.success) {
                toast.success(res.data.message || "Computation successful!");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Failed to compute maintenance logic:", error);
            toast.error(error.response?.data?.message || "Internal Server Error");
        } finally {
            setIsComputing(false);
        }
    };

    const renderHeader = (label, key, minWidth = "min-w-[140px]") => (
        <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 align-top bg-slate-100 dark:bg-slate-800/90">
            <div className={`flex flex-col gap-1 ${minWidth}`}>
                <div
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold text-slate-700 dark:text-slate-300 group"
                    onClick={() => handleSort(key)}
                >
                    {label}
                    {sortConfig.key === key ? (
                        sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                        <ArrowUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                    )}
                </div>
                <TableInput name={key} value={filters[key]} onChange={handleFilterChange} placeholder="Filter..." />
            </div>
        </th>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl font-sans overflow-auto custom-scrollbar p-6 gap-8 relative">

            {/* Header Section */}
            <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Maintenance
                        </h2>

                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <button
                            onClick={handleCompute}
                            disabled={isComputing}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all ${isComputing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
                        >
                            {isComputing ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Computing...
                                </>
                            ) : (
                                <>
                                    <Calculator size={16} /> Compute
                                </>
                            )}
                        </button>
                        <div className="flex flex-row gap-3 text-base font-medium">
                            <button
                                onClick={() => openSetResetModal({ date: selectedDate })}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                            >
                                <Settings size={14} /> Set/Reset Maintenance status
                            </button>
                            <button onClick={handleTargetsClick} className="flex items-center gap-2 text-green-600 hover:text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
                                <RefreshCw size={14} /> Set/Reset Target status
                            </button>
                            <button onClick={handleUtilisationClick} className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
                                <Gauge size={14} /> Utilisation assumptions
                            </button>
                            <button onClick={handleRotablesClick} className="flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
                                <Layers size={14} /> Major rotables movement
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE 1: Maintenance Status */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300"></span>
                        <DatePickerInput
                            value={selectedDate}
                            onChange={setSelectedDate}
                            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base px-2 py-1 rounded outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />

                    </div>

                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                                {renderHeader("MSN/ESN", "msn")}
                                {renderHeader("PN", "pn")}
                                {renderHeader("SN/BN", "sn")}
                                {renderHeader("Titled/Spare", "titled")}
                                <th colSpan={9} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-200/50 dark:bg-slate-700/50">Maintenance status</th>
                                <th rowSpan={2} className={actionHeaderClass}>Action</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                {MAINTENANCE_STATUS_COLUMNS.map((column) => (
                                    <th key={column.code} className={statusHeaderClass}>
                                        <StatusHeaderLabel column={column} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {filteredMaintenanceData.map((row) => (
                                <tr key={`maint-${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.msn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.pn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.sn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.titled}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.tsn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.csn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.dsn}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.tso}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.cso}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.dso}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.tsr}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.csr}</td>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.dsr}</td>
                                    <td className={actionCellClass}>
                                        <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openSetResetModal({ msnEsn: row.msnEsn || row.msn, date: row.asOnDate || selectedDate })}
                                            className="px-2 py-1 rounded text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            Set/Reset
                                        </button>
                                        <button type="button" onClick={() => handleDeleteMaintenanceRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                            <Trash2 size={14} />
                                        </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLE 2: Target Maintenance Status */}
            <div className="flex flex-col gap-2 pt-4">
                <div className="flex justify-between items-end">
                    <span className="text-sm text-slate-500 italic"></span>
                    <button className="flex items-center gap-1 px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Download size={12} /> Download
                    </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                                {renderHeader("Label", "targetLabel", "min-w-[140px]")}
                                {renderHeader("MSN/ESN", "targetMsn", "min-w-[140px]")}
                                {renderHeader("PN", "targetPn", "min-w-[140px]")}
                                {renderHeader("SN/BN", "targetSn", "min-w-[140px]")}
                                {renderHeader("Category", "category", "min-w-[140px]")}
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-semibold align-bottom min-w-[120px]">Date</th>
                                <th colSpan={9} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-200/50 dark:bg-slate-700/50">Target maintenance status</th>
                                <th colSpan={FORECAST_STATUS_COLUMNS.length} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-[#f4e6fa] dark:bg-fuchsia-900/30">Target value-forecasted value on target date</th>
                                <th rowSpan={2} className={actionHeaderClass}>Action</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                {MAINTENANCE_STATUS_COLUMNS.map((column) => (
                                    <th key={`target-${column.code}`} className={statusHeaderClass}>
                                        <StatusHeaderLabel column={column} />
                                    </th>
                                ))}
                                {FORECAST_STATUS_COLUMNS.map((column) => (
                                    <th key={`forecast-${column.code}`} className={statusHeaderClass}>
                                        <StatusHeaderLabel column={column} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {filteredTargetData.map((row) => {
                                const ylStyle = "font-bold bg-yellow-200 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-100";
                                const isHighlighted = (colName) => row.highlights?.includes(colName) ? ylStyle : "";

                                return (
                                    <tr key={`target-${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-medium">{row.targetLabel}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.targetMsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-mono">{row.targetPn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.targetSn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{row.category}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">{formatDateForDisplay(row.displayDate || row.date)}</td>

                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("tsn")}`}>{row.tsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("csn")}`}>{row.csn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("dsn")}`}>{row.dsn}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("tso")}`}>{row.tso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("cso")}`}>{row.cso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("dso")}`}>{row.dso}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("tsr")}`}>{row.tsr}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("csr")}`}>{row.csr}</td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 text-right ${isHighlighted("dsr")}`}>{row.dsr}</td>

                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fTsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fCsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fDsn}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fTso}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fCso}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fDso}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fTsr}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fCsr}</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">{row.fDsr}</td>
                                        <td className={actionCellClass}>
                                            <button type="button" onClick={() => handleDeleteTargetStatusRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLE 3: Calendar Inputs */}
            <div className="flex flex-col gap-2 pt-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Calendar inputs, down time and post event maintenance status
                </h3>
                <span className="text-sm text-slate-500 italic mb-1"></span>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                                {renderHeader("Label", "calLabel", "min-w-[140px]")}
                                {renderHeader("Line/Base/Shop", "lineBase", "min-w-[140px]")}
                                {renderHeader("MSN/ESN", "calMsn", "min-w-[140px]")}
                                {renderHeader("Sch.Mx.Event", "schEvent", "min-w-[140px]")}
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[140px]">
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold group" onClick={() => handleSort('calPn')}>
                                            PN
                                            {sortConfig.key === 'calPn' ? (
                                                sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                            ) : (
                                                <ArrowUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                                            )}
                                        </div>
                                        <TableInput name="calPn" value={filters.calPn} onChange={handleFilterChange} placeholder="Filter..." />
                                        <span className="text-xs font-normal text-slate-500 mt-1">Checkbox (apply to all SN)</span>
                                    </div>
                                </th>
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-semibold align-bottom min-w-[140px]">
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold group" onClick={() => handleSort('snBn')}>
                                            SN/BN
                                        </div>
                                        <TableInput name="snBn" value={filters.snBn} onChange={handleFilterChange} placeholder="Filter..." />
                                    </div>
                                </th>
                                <th colSpan={9} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-green-100/50 dark:bg-green-900/20">Earliest of, every</th>
                                <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center">Date</th>
                                <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-slate-200/50 dark:bg-slate-700/50">Next occurrence</th>
                                <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center bg-[#f4e6fa] dark:bg-fuchsia-900/30">Beyond next occurrence</th>
                                <th rowSpan={2} className="p-2 border border-slate-200 dark:border-slate-700 font-bold text-center min-w-[70px]">Action</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                {MAINTENANCE_STATUS_COLUMNS.map((column) => (
                                    <th key={`calendar-${column.code}`} className={statusHeaderClass}>
                                        <StatusHeaderLabel column={column} />
                                    </th>
                                ))}
                                <th className="p-2 border border-slate-200 dark:border-slate-700 min-w-[120px]">Last occurre</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 min-w-[120px]">Next estima</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 min-w-[110px]">Down days</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 min-w-[110px]">Avg Downda</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 min-w-[110px]">Occurrence</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 min-w-[110px]">SO/TSRtrt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {filteredCalendarData.map((row) => {
                                const grStyle = "bg-green-100/30 dark:bg-green-900/20";
                                const isHighlighted = (colName) => row.highlights?.includes(colName) ? grStyle : "";

                                return (
                                    <tr key={`cal-${row.id}`} className="bg-green-50/50 dark:bg-green-900/10">
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-medium">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.calLabel || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'calLabel', e.target.value)} className={`${calendarEditableInputClass} text-center`} /> : row.calLabel}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.lineBase || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'lineBase', e.target.value)} className={`${calendarEditableInputClass} text-center`} /> : row.lineBase}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.calMsn || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'calMsn', e.target.value)} className={`${calendarEditableInputClass} text-center`} /> : row.calMsn}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.schEvent || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'schEvent', e.target.value)} className={`${calendarEditableInputClass} text-center`} /> : row.schEvent}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-mono">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.calPn || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'calPn', e.target.value)} className={`${calendarEditableInputClass} text-center`} /> : row.calPn}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.snBn || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'snBn', e.target.value)} className={`${calendarEditableInputClass} text-center`} /> : row.snBn}
                                        </td>

                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eTsn")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eTsn || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eTsn', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eTsn}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eCsn")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eCsn || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eCsn', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eCsn}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eDsn")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eDsn || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eDsn', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eDsn}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eTso")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eTso || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eTso', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eTso}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eCso")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eCso || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eCso', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eCso}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eDso")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eDso || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eDso', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eDso}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eTsr")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eTsr || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eTsr', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eTsr}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eCsr")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eCsr || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eCsr', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eCsr}</div>}
                                        </td>
                                        <td className={`p-2 border-r border-slate-200 dark:border-slate-700 ${isHighlighted("eDsr")}`}>
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.eDsr || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'eDsr', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.eDsr}</div>}
                                        </td>

                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-pre-line leading-relaxed">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.lastOccurre || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'lastOccurre', e.target.value)} className={`${calendarEditableInputClass} text-left`} /> : row.lastOccurre}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-pre-line leading-relaxed">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.nextEstima || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'nextEstima', e.target.value)} className={`${calendarEditableInputClass} text-left`} /> : row.nextEstima}
                                        </td>

                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.downDays || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'downDays', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.downDays}</div>}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.avgDownda || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'avgDownda', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.avgDownda}</div>}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.occurrence || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'occurrence', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.occurrence}</div>}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                            {isEditingCalendar || row.isNew ? <input type="text" value={row.soTsr || ""} onChange={(e) => handleCalendarFieldChange(row.id, 'soTsr', e.target.value)} className={`${calendarEditableInputClass} text-right`} /> : <div className="text-right">{row.soTsr}</div>}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center bg-white dark:bg-slate-800">
                                            <button type="button" onClick={() => handleDeleteCalendarRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={handleAddCalendarRow} className="flex items-center gap-1 px-5 py-2 border border-blue-300 text-blue-600 rounded text-sm hover:bg-blue-50 transition-colors font-medium">
                        + Add Row
                    </button>
                    <button onClick={() => setIsEditingCalendar(!isEditingCalendar)} className={`flex items-center gap-1 px-5 py-2 border rounded text-sm transition-colors font-medium ${isEditingCalendar ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Edit size={14} /> Edit
                    </button>
                    <button onClick={handleUpdateCalendar} disabled={!isEditingCalendar} className="flex items-center gap-1 px-5 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed">
                        Update
                    </button>
                </div>
            </div>

            {/* --- SET/RESET MAINTENANCE MODAL --- */}
            {showSetResetModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-7xl rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 max-h-[95vh]">

                        {/* Modal Header */}
                        <div className="bg-blue-500 text-white px-5 py-3 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold text-base tracking-wide">Set/Reset Maintenance status</h3>
                            <button
                                onClick={() => setShowSetResetModal(false)}
                                className="hover:bg-blue-600 p-1 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-auto custom-scrollbar flex flex-col gap-6">

                            {/* Top Controls */}
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">

                                    {/* DROPDOWN for Asset SN */}
                                    <div className="flex items-center gap-3">
                                        <span className="w-16">Asset SN</span>
                                        <div className="relative w-36">
                                            <select
                                                value={resetAssetSN}
                                                onChange={(e) => setResetAssetSN(e.target.value)}
                                                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-2 rounded w-full outline-none focus:ring-1 focus:ring-blue-500 text-sm leading-5 text-slate-800 dark:text-slate-100"
                                            >
                                                <option value="">Select SN</option>
                                                {assetSnOptions.length > 0 ? (
                                                    assetSnOptions.map(opt => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>
                                                        No fleet assets found
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <span className="w-16 text-center text-slate-400 italic">(Or)</span>

                                    {/* DATE FIELD for "As on" */}
                                    <div className="flex items-center gap-3">
                                        <span className="w-16">As on</span>
                                        <DatePickerInput
                                            value={resetDate}
                                            onChange={setResetDate}
                                            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-2 rounded w-36 outline-none focus:ring-1 focus:ring-blue-500 text-base leading-5 text-slate-800 dark:text-slate-100"
                                        />
                                    </div>

                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-end">
                                        <button onClick={handleDownloadModal} className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 px-4 py-1.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                    {duplicateResetWarning ? (
                                        <div className="max-w-md rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                            {duplicateResetWarning}
                                        </div>
                                    ) : null}
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditingModal(!isEditingModal)} className={`border px-6 py-1.5 rounded text-xs transition-colors font-medium ${isEditingModal ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Edit</button>
                                        <button
                                            onClick={handleUpdateModal}
                                            disabled={isUpdatingResetRecords}
                                            className="border border-slate-300 dark:border-slate-600 px-6 py-1.5 rounded text-xs transition-colors font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed"
                                        >
                                            {isUpdatingResetRecords ? "Updating..." : "Update"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Dynamic Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-white dark:bg-slate-800 shadow-sm min-h-[150px]">
                                <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-2 border-r border-slate-200 dark:border-slate-700 font-semibold text-center min-w-[140px]">
                                                <div className="flex flex-col gap-1">
                                                    <div
                                                        className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                                                        onClick={() => handleModalSort("msnEsn")}
                                                    >
                                                        MSN/ESN
                                                        {modalSortConfig.key === "msnEsn" ? (
                                                            modalSortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                                        ) : (
                                                            <ArrowUp size={12} className="opacity-0 group-hover:opacity-30" />
                                                        )}
                                                    </div>
                                                    <TableInput name="msnEsn" value={modalFilters.msnEsn} onChange={handleModalFilterChange} placeholder="Filter..." />
                                                </div>
                                            </th>
                                            <th className="p-2 border-r border-slate-200 dark:border-slate-700 font-semibold text-center min-w-[140px]">
                                                <div className="flex flex-col gap-1">
                                                    <div
                                                        className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                                                        onClick={() => handleModalSort("pn")}
                                                    >
                                                        PN
                                                        {modalSortConfig.key === "pn" ? (
                                                            modalSortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                                        ) : (
                                                            <ArrowUp size={12} className="opacity-0 group-hover:opacity-30" />
                                                        )}
                                                    </div>
                                                    <TableInput name="pn" value={modalFilters.pn} onChange={handleModalFilterChange} placeholder="Filter..." />
                                                </div>
                                            </th>
                                            <th className="p-2 border-r border-slate-200 dark:border-slate-700 font-semibold text-center min-w-[140px]">
                                                <div className="flex flex-col gap-1">
                                                    <div
                                                        className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                                                        onClick={() => handleModalSort("snBn")}
                                                    >
                                                        SN/BN
                                                        {modalSortConfig.key === "snBn" ? (
                                                            modalSortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                                        ) : (
                                                            <ArrowUp size={12} className="opacity-0 group-hover:opacity-30" />
                                                        )}
                                                    </div>
                                                    <TableInput name="snBn" value={modalFilters.snBn} onChange={handleModalFilterChange} placeholder="Filter..." />
                                                </div>
                                            </th>
                                            <th colSpan="9" className="p-2 border-r border-slate-200 dark:border-slate-700 font-bold text-center border-b">
                                                Maintenance status
                                            </th>
                                            <th rowSpan="2" className="p-2 font-semibold align-bottom text-center min-w-[110px]">
                                                Appl time metric
                                            </th>
                                            <th rowSpan="2" className="sticky right-0 z-20 p-2 font-semibold align-bottom text-center min-w-[70px] bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.6)]">
                                                Action
                                            </th>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                                            <th className="border-r border-slate-200 dark:border-slate-700"></th>
                                            <th className="border-r border-slate-200 dark:border-slate-700"></th>
                                            <th className="border-r border-slate-200 dark:border-slate-700"></th>
                                            {MAINTENANCE_STATUS_COLUMNS.map((column) => (
                                                <th key={`reset-${column.code}`} className={modalStatusHeaderClass}>
                                                    <StatusHeaderLabel column={column} />
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-800 dark:text-slate-200 bg-[#dcfce7] dark:bg-green-900/20">

                                        {/* Dynamic Rows from State */}
                                        {filteredModalTableData.length > 0 ? (
                                            filteredModalTableData.map(row => (
                                                <tr key={`reset-${row.id}`}>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50 font-medium">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.msnEsn || ""} onChange={(e) => handleModalFieldChange(row.id, 'msnEsn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.msnEsn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.pn || ""} onChange={(e) => handleModalFieldChange(row.id, 'pn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.pn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.snBn || ""} onChange={(e) => handleModalFieldChange(row.id, 'snBn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.snBn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.tsn || ""} onChange={(e) => handleModalFieldChange(row.id, 'tsn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.tsn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.csn || ""} onChange={(e) => handleModalFieldChange(row.id, 'csn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.csn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.dsn || ""} onChange={(e) => handleModalFieldChange(row.id, 'dsn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.dsn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.tso || ""} onChange={(e) => handleModalFieldChange(row.id, 'tso', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.tso}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.cso || ""} onChange={(e) => handleModalFieldChange(row.id, 'cso', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.cso}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.dso || ""} onChange={(e) => handleModalFieldChange(row.id, 'dso', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.dso}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.tsr || ""} onChange={(e) => handleModalFieldChange(row.id, 'tsr', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.tsr}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.csr || ""} onChange={(e) => handleModalFieldChange(row.id, 'csr', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.csr}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingModal || row.isNew ? <input type="text" value={row.dsr || ""} onChange={(e) => handleModalFieldChange(row.id, 'dsr', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.dsr}
                                                    </td>
                                                    <td className="p-1 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                                                        <select
                                                            value={row.metric || "BH"}
                                                            onChange={(e) => handleModalFieldChange(row.id, 'metric', e.target.value)}
                                                            disabled={!isEditingModal && !row.isNew}
                                                            className={`${modalEditableSelectClass} text-center disabled:bg-slate-50 dark:disabled:bg-slate-900/50`}
                                                        >
                                                            <option value="BH">BH</option>
                                                            <option value="FH">FH</option>
                                                        </select>
                                                    </td>
                                                    <td className="sticky right-0 z-10 p-1 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 text-center shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.6)]">
                                                        <button type="button" onClick={() => handleDeleteModalRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="14" className="p-6 text-center text-slate-500 italic">No matching records found.</td>
                                            </tr>
                                        )}

                                        {/* Footer Row */}
                                        <tr className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                            <td colSpan="3" className="p-2 text-center">
                                                <button onClick={handleAddModalRow} className="text-blue-600 font-semibold hover:underline flex items-center justify-center w-full">
                                                    +Add
                                                </button>
                                            </td>
                                            <td colSpan="9" className="p-2" />
                                            <td className="p-1 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                                            </td>
                                            <td className="p-1 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* --- UTILISATION ASSUMPTIONS MODAL --- */}
            {showUtilisationModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Gauge className="text-cyan-500" size={20} />
                                    Utilisation assumptions (/day)
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    This is applied on days rotations are not assigned to Aircraft.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditingUtilisation(!isEditingUtilisation)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${isEditingUtilisation ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>Edit</button>
                                <button onClick={handleUpdateUtilisation} disabled={!isEditingUtilisation} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-sm">Update</button>
                                <button onClick={() => setShowUtilisationModal(false)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-900">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                                <table className="w-full text-left border-collapse min-w-max text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                            {[
                                                ["msn", "MSN"],
                                                ["fromDate", "From Dt"],
                                                ["toDate", "To Dt"],
                                                ["hours", "Hours"],
                                                ["cycles", "Cycles"],
                                                ["avgDowndays", "Avg Downdays"]
                                            ].map(([key, label]) => (
                                                <th key={key} className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleUtilisationSort(key)}>
                                                    <div className="flex justify-between items-center group">
                                                        {label} {utilisationSortConfig.key === key && (utilisationSortConfig.direction === "Up" ? <ArrowUp size={12} className="text-cyan-500" /> : <ArrowDown size={12} className="text-cyan-500" />)}
                                                    </div>
                                                    <TableInput name={key} value={utilisationFilters[key]} onChange={handleUtilisationFilterChange} placeholder="Filter..." />
                                                </th>
                                            ))}
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm text-center min-w-[70px]">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredUtilisationData.length > 0 ? (
                                            filteredUtilisationData.map((row, index) => (
                                                <tr key={row.id || index} className="hover:bg-cyan-50/30 dark:hover:bg-cyan-900/10 transition-colors">
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingUtilisation || row.isNew ? (
                                                            <select value={row.msn || ""} onChange={(e) => handleUtilisationFieldChange(row.id, "msn", e.target.value)} className={`${modalEditableSelectClass} text-center`}>
                                                                <option value="">Select MSN</option>
                                                                {assetSnOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                        ) : row.msn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingUtilisation || row.isNew ? <DateTextInput value={row.fromDate || ""} onChange={(value) => handleUtilisationFieldChange(row.id, "fromDate", value)} className={`${modalEditableInputClass} text-center`} /> : formatDateForDisplay(row.fromDate)}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingUtilisation || row.isNew ? <DateTextInput value={row.toDate || ""} onChange={(value) => handleUtilisationFieldChange(row.id, "toDate", value)} className={`${modalEditableInputClass} text-center`} /> : formatDateForDisplay(row.toDate)}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingUtilisation || row.isNew ? <input type="number" step="0.01" value={row.hours || ""} onChange={(e) => handleUtilisationFieldChange(row.id, "hours", e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.hours}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingUtilisation || row.isNew ? <input type="number" step="1" value={row.cycles || ""} onChange={(e) => handleUtilisationFieldChange(row.id, "cycles", e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.cycles}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingUtilisation || row.isNew ? <input type="number" step="0.01" value={row.avgDowndays || ""} onChange={(e) => handleUtilisationFieldChange(row.id, "avgDowndays", e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.avgDowndays}
                                                    </td>
                                                    <td className="p-2 text-center bg-white dark:bg-slate-800 border-l border-slate-200/50 dark:border-slate-700/50">
                                                        <button type="button" onClick={() => handleDeleteUtilisationRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="p-6 text-center text-slate-500 italic">No matching records found.</td>
                                            </tr>
                                        )}
                                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                                            <td colSpan="7" className="p-2 text-center">
                                                <button onClick={handleAddUtilisationRow} className="text-blue-600 font-semibold hover:underline">
                                                    +Add
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* --- MAJOR ROTABLES MOVEMENT MODAL --- */}
            {showRotablesModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Layers className="text-purple-500" size={20} />
                                Major rotables changes (Engines, LG..etc)
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditingRotables(!isEditingRotables)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${isEditingRotables ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>Edit</button>
                                <button onClick={handleUpdateRotables} disabled={!isEditingRotables} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-sm">Update</button>
                                <button onClick={() => setShowRotablesModal(false)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-900">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                                <table className="w-full text-left border-collapse min-w-max text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('label')}>
                                                <div className="flex justify-between items-center group">
                                                    Label {rotablesSortConfig.key === 'label' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="label" value={rotablesFilters.label} onChange={handleRotablesFilterChange} placeholder="Filter Label..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('date')}>
                                                <div className="flex justify-between items-center group">
                                                    Date (EoD) {rotablesSortConfig.key === 'date' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="date" value={rotablesFilters.date} onChange={handleRotablesFilterChange} placeholder="Filter Date..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('pn')}>
                                                <div className="flex justify-between items-center group">
                                                    PN {rotablesSortConfig.key === 'pn' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="pn" value={rotablesFilters.pn} onChange={handleRotablesFilterChange} placeholder="Filter PN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('msn')}>
                                                <div className="flex justify-between items-center group">
                                                    MSN {rotablesSortConfig.key === 'msn' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="msn" value={rotablesFilters.msn} onChange={handleRotablesFilterChange} placeholder="Filter MSN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('acftRegn')}>
                                                <div className="flex justify-between items-center group">
                                                    ACFT Regn {rotablesSortConfig.key === 'acftRegn' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="acftRegn" value={rotablesFilters.acftRegn} onChange={handleRotablesFilterChange} placeholder="Filter Regn..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('position')}>
                                                <div className="flex justify-between items-center group">
                                                    Position (for PN) {rotablesSortConfig.key === 'position' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="position" value={rotablesFilters.position} onChange={handleRotablesFilterChange} placeholder="Filter Pos..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('removedSN')}>
                                                <div className="flex justify-between items-center group">
                                                    Removed SN {rotablesSortConfig.key === 'removedSN' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="removedSN" value={rotablesFilters.removedSN} onChange={handleRotablesFilterChange} placeholder="Filter Rem SN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleRotablesSort('installedSN')}>
                                                <div className="flex justify-between items-center group">
                                                    Installed SN {rotablesSortConfig.key === 'installedSN' && (rotablesSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="installedSN" value={rotablesFilters.installedSN} onChange={handleRotablesFilterChange} placeholder="Filter Inst SN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm text-center min-w-[70px]">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredRotablesData.length > 0 ? (
                                            filteredRotablesData.map((row, index) => (
                                                <tr key={row.id || index} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.label || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'label', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.label}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <DateTextInput value={row.date || ""} onChange={(value) => handleRotablesFieldChange(row.id, 'date', value)} className={`${modalEditableInputClass} text-center`} /> : formatDateForDisplay(row.date)}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.pn || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'pn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.pn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.msn || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'msn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.msn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.acftRegn || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'acftRegn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.acftRegn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.position || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'position', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.position}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.removedSN || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'removedSN', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.removedSN}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {isEditingRotables || row.isNew ? <input type="text" value={row.installedSN || ""} onChange={(e) => handleRotablesFieldChange(row.id, 'installedSN', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.installedSN}
                                                    </td>
                                                    <td className="p-2 text-center bg-white dark:bg-slate-800 border-l border-slate-200/50 dark:border-slate-700/50">
                                                        <button type="button" onClick={() => handleDeleteRotablesRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="9" className="p-6 text-center text-slate-500 italic">No matching records found.</td>
                                            </tr>
                                        )}

                                        {/* Footer Row */}
                                        <tr className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                            <td colSpan="2" className="p-2 text-center">
                                                <button onClick={handleAddRotablesRow} className="text-blue-600 font-semibold hover:underline flex items-center justify-center w-full">
                                                    +Add
                                                </button>
                                            </td>
                                            <td colSpan="6"></td>
                                            <td className="p-2 text-right">
                                                <button onClick={downloadRotablesExcel} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold transition-colors ml-auto text-xs border border-emerald-600 px-2 py-1 rounded">
                                                    <Download size={12} /> Download
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* --- TARGET MAINTENANCE MODAL --- */}
            {showTargetsModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-screen-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <RefreshCw className="text-green-500" size={20} />
                                Set target maintenance status
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditingTargets(!isEditingTargets)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${isEditingTargets ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>Edit</button>
                                <button onClick={handleUpdateTargets} disabled={!isEditingTargets} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-sm">Update</button>
                                <button onClick={() => setShowTargetsModal(false)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-900">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                                <table className="w-full text-left border-collapse min-w-max text-sm">
                                    <thead>
                                        {/* Multi-tier Header */}
                                        <tr className="bg-slate-200/50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 text-center">
                                            <th colSpan="6" className="p-1 border-r border-slate-200 dark:border-slate-700">Target Identifiers</th>
                                            <th colSpan="9" className="p-1">Target maintenance status</th>
                                            <th rowSpan="2" className="p-2 border-l border-slate-200 dark:border-slate-700 text-center min-w-[70px]">Action</th>
                                        </tr>
                                        <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleTargetsSort('label')}>
                                                <div className="flex justify-between items-center group">
                                                    Label {targetsSortConfig.key === 'label' && (targetsSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="label" value={targetsFilters.label} onChange={handleTargetsFilterChange} placeholder="Filter Label..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleTargetsSort('msnEsn')}>
                                                <div className="flex justify-between items-center group">
                                                    MSN/ESN {targetsSortConfig.key === 'msnEsn' && (targetsSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="msnEsn" value={targetsFilters.msnEsn} onChange={handleTargetsFilterChange} placeholder="Filter MSN/ESN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleTargetsSort('pn')}>
                                                <div className="flex justify-between items-center group">
                                                    PN {targetsSortConfig.key === 'pn' && (targetsSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="pn" value={targetsFilters.pn} onChange={handleTargetsFilterChange} placeholder="Filter PN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleTargetsSort('snBn')}>
                                                <div className="flex justify-between items-center group">
                                                    SN/BN {targetsSortConfig.key === 'snBn' && (targetsSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="snBn" value={targetsFilters.snBn} onChange={handleTargetsFilterChange} placeholder="Filter SN/BN..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleTargetsSort('category')}>
                                                <div className="flex justify-between items-center group">
                                                    Category {targetsSortConfig.key === 'category' && (targetsSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="category" value={targetsFilters.category} onChange={handleTargetsFilterChange} placeholder="Filter Cat..." />
                                            </th>
                                            <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]" onClick={() => handleTargetsSort('date')}>
                                                <div className="flex justify-between items-center group">
                                                    Date {targetsSortConfig.key === 'date' && (targetsSortConfig.direction === 'Up' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                                </div>
                                                <TableInput name="date" value={targetsFilters.date} onChange={handleTargetsFilterChange} placeholder="Filter Date..." />
                                            </th>
                                            {MAINTENANCE_STATUS_COLUMNS.slice(0, -1).map((column) => (
                                                <th key={`target-modal-${column.code}`} className={targetStatusHeaderClass}>
                                                    <StatusHeaderLabel column={column} />
                                                </th>
                                            ))}
                                            <th className={targetLastStatusHeaderClass}>
                                                <StatusHeaderLabel column={STATUS_LABELS.dsr} />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredTargetsData.length > 0 ? (
                                            filteredTargetsData.map((row, index) => (
                                                <tr key={row.id || index} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.label || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'label', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.label}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? (
                                                            <select
                                                                value={row.msnEsn || ""}
                                                                onChange={(e) => handleTargetsFieldChange(row.id, 'msnEsn', e.target.value)}
                                                                className={`${modalEditableSelectClass} text-center`}
                                                            >
                                                                <option value="">Select SN</option>
                                                                {assetSnOptions.map((opt) => (
                                                                    <option key={opt} value={opt}>
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : row.msnEsn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.pn || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'pn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.pn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.snBn || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'snBn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.snBn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? (
                                                            <select
                                                                value={row.category || ""}
                                                                onChange={(e) => handleTargetsFieldChange(row.id, 'category', e.target.value)}
                                                                className={`${modalEditableSelectClass} text-center`}
                                                            >
                                                                <option value="">Select Category</option>
                                                                {targetCategoryOptions.map((opt) => (
                                                                    <option key={opt} value={opt}>
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : row.category}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <DatePickerInput value={row.date || ""} onChange={(value) => handleTargetsFieldChange(row.id, 'date', value)} className={`${modalEditableInputClass} text-center`} /> : formatDateForDisplay(row.date)}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.tsn || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'tsn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.tsn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.csn || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'csn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.csn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.dsn || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'dsn', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.dsn}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.tso || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'tso', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.tso}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.cso || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'cso', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.cso}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.dso || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'dso', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.dso}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.tsRplmt || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'tsRplmt', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.tsRplmt}
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200/50 dark:border-slate-700/50">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.csRplmt || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'csRplmt', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.csRplmt}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {isEditingTargets || row.isNew ? <input type="text" value={row.dsRplmt || ""} onChange={(e) => handleTargetsFieldChange(row.id, 'dsRplmt', e.target.value)} className={`${modalEditableInputClass} text-center`} /> : row.dsRplmt}
                                                    </td>
                                                    <td className="p-2 text-center bg-white dark:bg-slate-800 border-l border-slate-200/50 dark:border-slate-700/50">
                                                        <button type="button" onClick={() => handleDeleteTargetsRow(row)} className={deleteIconButtonClass} title="Delete Row">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="16" className="p-6 text-center text-slate-500 italic">No matching records found.</td>
                                            </tr>
                                        )}

                                        {/* Footer Row */}
                                        <tr className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                            <td colSpan="6" className="p-2 text-center">
                                                <button onClick={handleAddTargetsRow} className="text-blue-600 font-semibold hover:underline flex items-center justify-center w-full">
                                                    +Add
                                                </button>
                                            </td>
                                            <td colSpan="8"></td>
                                            <td className="p-2 text-right">
                                                <button onClick={downloadTargetsExcel} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold transition-colors ml-auto text-xs border border-emerald-600 px-2 py-1 rounded">
                                                    <Download size={12} /> Download
                                                </button>
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
        </div>
    );
};

export default MaintenanceDashboard;
