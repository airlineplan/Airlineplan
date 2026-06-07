/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    Activity,
    AlertCircle,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    DollarSign,
    Plus,
    RefreshCw,
    Settings,
    Trash2,
    UploadCloud,
    Users,
    X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../apiConfig";
import useEscapeKey from "../../../hooks/useEscapeKey";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const durationRegex = /^\d{1,3}:[0-5]\d$/;
const clockRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutesToHHMM = (minutes = 0) => {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const hhmmToMinutes = (value) => {
    if (!durationRegex.test(String(value || "").trim())) return null;
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
};

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
};

const isUtcMidnight = (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
};

const formatEndTime = (row) => {
    if (row?.category === "Rest" && isUtcMidnight(row.endDateTime) && new Date(row.endDateTime) > new Date(row.startDateTime)) {
        return "24:00";
    }
    return formatTime(row?.endDateTime);
};

const getUtcDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
};

const sortByStartTime = (left, right) => {
    const leftTime = new Date(left.startDateTime || 0).getTime();
    const rightTime = new Date(right.startDateTime || 0).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;
    return String(left.crewCode || "").localeCompare(String(right.crewCode || ""));
};

const formatMoney = (value, currency) => {
    const amount = Number(value || 0);
    if (!amount) return "-";
    const suffix = currency && currency !== "MIXED" ? ` ${currency}` : currency === "MIXED" ? " MIXED" : "";
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
};

const formatKpiValue = (metric, cell) => {
    const value = cell?.value;
    if (value === null || value === undefined || value === "") return "Not configured";
    if (metric.type === "duration") return minutesToHHMM(value);
    if (metric.type === "currency") return formatMoney(value, cell.currency);
    if (metric.type === "percent") return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : "Not configured";
    return Number(value || 0).toLocaleString();
};

const emptyUploadState = {
    members: { filename: "", loading: false, summary: null, errors: [] },
    flightDuties: { filename: "", loading: false, summary: null, errors: [] },
    otherDuties: { filename: "", loading: false, summary: null, errors: [] },
};

const uploadLabels = {
    members: "Crew Information",
    flightDuties: "Flight Duty roster",
    otherDuties: "Other Duty roster",
};

const PERIODICITY_OPTIONS = [
    { value: "MONTHLY", label: "Monthly" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "DAILY", label: "Daily" },
];

const toDropdownOptions = (values = []) => Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }));

const getUploadOutcome = (key, summary, fallbackMessage) => {
    const invalidRows = Number(summary?.invalidRows || 0);
    const changedRows = Number(summary?.rowsInserted || 0) + Number(summary?.rowsUpdated || 0);
    const label = uploadLabels[key] || "Upload";

    if (invalidRows > 0 && changedRows === 0) {
        return {
            type: "error",
            message: `${label} import failed. ${invalidRows} invalid row${invalidRows === 1 ? "" : "s"} found.`,
        };
    }

    if (invalidRows > 0) {
        return {
            type: "warning",
            message: `${label} imported with ${invalidRows} invalid row${invalidRows === 1 ? "" : "s"}.`,
        };
    }

    return { type: "success", message: fallbackMessage || `${label} import completed.` };
};

const InputTime = ({ label, placeholder = "HH:MM", value, onChange, error, className }) => (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5", className)}>
        <label className="text-base text-slate-700 dark:text-slate-300 font-medium flex-1 pr-4">{label}</label>
        <div className="flex flex-col items-start sm:items-end gap-1">
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={cn(
                    "w-24 px-3 py-1.5 text-base rounded-lg border bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm",
                    error ? "border-rose-400 dark:border-rose-500" : "border-slate-300 dark:border-slate-700"
                )}
            />
            {error && <span className="text-xs text-rose-500">{error}</span>}
        </div>
    </div>
);

const CheckboxSetting = ({ label, checked, onChange, timeValue, onTimeChange, timePlaceholder = "HH:MM", error }) => (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
        <div className="flex items-start gap-3 flex-1">
            <div className="relative flex items-start pt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="w-4 h-4 cursor-pointer mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-offset-slate-900"
                />
            </div>
            <label className="text-base text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer" onClick={() => onChange({ target: { checked: !checked } })}>
                {label}
            </label>
        </div>
        {timeValue !== undefined && (
            <div className="flex flex-col items-start sm:items-end gap-1 pl-7 sm:pl-0 mt-2 sm:mt-0">
                <input
                    type="text"
                    placeholder={timePlaceholder}
                    value={timeValue}
                    onChange={onTimeChange}
                    className={cn(
                        "w-20 px-2 py-1 text-base rounded-md border bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
                        error ? "border-rose-400 dark:border-rose-500" : "border-slate-300 dark:border-slate-700"
                    )}
                />
                {error && <span className="text-xs text-rose-500">{error}</span>}
            </div>
        )}
    </div>
);

const SectionCard = ({ title, icon: Icon, children, className }) => (
    <div className={cn("bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
            {Icon && <Icon size={18} className="text-indigo-500" />}
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <div className="p-5 flex-1 flex flex-col gap-1">
            {children}
        </div>
    </div>
);

const UploadLink = ({ label, state, onUpload }) => {
    const inputRef = useRef(null);

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
                    event.target.value = "";
                }}
            />
            <button
                type="button"
                disabled={state.loading}
                onClick={() => inputRef.current?.click()}
                className="group flex items-center justify-between w-full p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all text-left disabled:opacity-60"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center transition-colors shrink-0">
                        {state.loading ? <RefreshCw size={16} className="text-indigo-500 animate-spin" /> : <UploadCloud size={16} className="text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />}
                    </div>
                    <div className="min-w-0">
                        <span className="block text-base font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                            {label}
                        </span>
                        {state.filename && <span className="block text-xs text-slate-500 truncate max-w-[260px]">{state.filename}</span>}
                    </div>
                </div>
                <span className="text-sm font-semibold text-slate-400 group-hover:text-indigo-500 uppercase tracking-wider">
                    {state.loading ? "Importing" : "Upload"}
                </span>
            </button>
            {state.summary && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Rows {state.summary.rowsRead || 0}</span>
                    <span>Inserted {state.summary.rowsInserted || 0}</span>
                    <span>Updated {state.summary.rowsUpdated || 0}</span>
                    <span className={state.summary.invalidRows ? "text-rose-500" : ""}>Invalid {state.summary.invalidRows || 0}</span>
                </div>
            )}
            {state.errors?.slice(0, 3).map((error, index) => (
                <div key={`${label}-error-${index}`} className="mt-1 flex items-start gap-1 text-xs text-rose-500">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span>{error.message || error}</span>
                </div>
            ))}
        </div>
    );
};

const ActionButton = ({ label, icon: Icon, onClick, variant = "primary", disabled = false }) => {
    const baseStyles = "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md w-full disabled:opacity-60 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20",
        secondary: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400",
        emerald: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20",
    };
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cn(baseStyles, variants[variant])}>
            {Icon && <Icon size={18} className={disabled && label.includes("Updating") ? "animate-spin" : ""} />}
            {label}
        </button>
    );
};

const Modal = ({ isOpen, onClose, onSave, title, children, maxWidth = "max-w-4xl", isSaving = false, saveLabel = "Update" }) => {
    useEscapeKey(isOpen, onClose);
    const modalRoot = typeof document !== "undefined" ? document.body : null;

    return modalRoot
        ? createPortal(
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={isSaving ? undefined : onClose}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity"
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className={cn("pointer-events-auto w-full max-h-[calc(100vh-3rem)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", maxWidth)}
                            >
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                                    <button type="button" onClick={onClose} disabled={isSaving} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                    {children}
                                </div>
                                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-60">
                                        Close
                                    </button>
                                    {onSave && (
                                        <button type="button" onClick={onSave} disabled={isSaving} className="px-5 py-2 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-500/20 transition-colors disabled:opacity-60 flex items-center gap-2">
                                            {isSaving && <RefreshCw size={16} className="animate-spin" />}
                                            {saveLabel}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>,
            modalRoot
        )
        : null;
};

const SmallInput = ({ value, onChange, placeholder = "", className = "", type = "text" }) => (
    <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn("w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500", className)}
    />
);

const DeleteButton = ({ onClick }) => (
    <button type="button" onClick={onClick} className="p-2 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="Delete row">
        <Trash2 size={16} />
    </button>
);

const AddRowButton = ({ onClick, label = "Add row" }) => (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors">
        <Plus size={15} />
        {label}
    </button>
);

const MultiSelectDropdown = ({ placeholder, options = [], selected = [], onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const safeOptions = Array.isArray(options) ? options : [];
    const safeSelected = Array.isArray(selected) ? selected : [];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        const next = safeSelected.some((item) => item.value === option.value)
            ? safeSelected.filter((item) => item.value !== option.value)
            : [...safeSelected, option];
        onChange?.(next);
    };

    const labelText = safeSelected.length === 0
        ? placeholder
        : safeSelected.length === 1
            ? safeSelected[0].label
            : `${safeSelected.length} selected`;

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
                    isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                )}
            >
                <span className={cn("truncate font-medium", safeSelected.length ? "text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300")}>
                    {labelText}
                </span>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {safeSelected.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onChange?.([])}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                            >
                                Clear selection
                            </button>
                        )}
                        {safeOptions.map((option) => {
                            const isSelected = safeSelected.some((item) => item.value === option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleOption(option)}
                                    className="flex w-full items-center px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                                >
                                    <span className={cn(
                                        "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors shrink-0",
                                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-600"
                                    )}>
                                        {isSelected && <Check size={12} className="text-white" />}
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 truncate">{option.label}</span>
                                </button>
                            );
                        })}
                        {safeOptions.length === 0 && <div className="p-3 text-sm text-slate-400 text-center">No options</div>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SingleSelectDropdown = ({ placeholder, options = [], selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const safeOptions = Array.isArray(options) ? options : [];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
                    isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                )}
            >
                <span className="text-slate-800 dark:text-slate-100 font-medium truncate">{selected?.label || placeholder}</span>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {safeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange?.(option);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "flex w-full items-center px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left",
                                    selected?.value === option.value ? "text-indigo-700 dark:text-indigo-300 font-semibold" : "text-slate-700 dark:text-slate-300"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CrewPage = () => {
    const [modals, setModals] = useState({ utilisation: false, layover: false, positioning: false, diary: false });
    const [pageLoading, setPageLoading] = useState(true);
    const [savingModal, setSavingModal] = useState("");
    const [updatingPlan, setUpdatingPlan] = useState(false);
    const [latestRun, setLatestRun] = useState(null);
    const [counts, setCounts] = useState({});
    const [options, setOptions] = useState({ roles: [], bases: [], categories: [], subCategories: [], stations: [] });
    const [uploadState, setUploadState] = useState(emptyUploadState);

    const [dutySettings, setDutySettings] = useState({
        restThresholdMinutes: "07:00",
        breakThresholdMinutes: "03:00",
        preflightNewFdpMinutes: "01:30",
        preflightExistingDutyMinutes: "00:45",
        postflightMinutes: "00:30",
    });

    const [positioningSettings, setPositioningSettings] = useState({
        returnToBaseAfterFdpEnabled: true,
        hotacCutoffEnabled: false,
        hotacCutoffLocalTime: "20:00",
        positioningWithinCurrentFdpEnabled: true,
        defaultPositioningMinutes: "02:30",
        hotacToAirportTransferMinutes: "01:00",
    });

    const [utilisationTargets, setUtilisationTargets] = useState([]);
    const [layoverRules, setLayoverRules] = useState([]);
    const [positioningCostRules, setPositioningCostRules] = useState([]);
    const [kpiData, setKpiData] = useState({ periods: [], metrics: [] });
    const [kpiLoading, setKpiLoading] = useState(false);
    const [kpiFilters, setKpiFilters] = useState({ periodicity: "MONTHLY", roles: [], bases: [], categories: [], subCategories: [] });
    const [diaryRows, setDiaryRows] = useState([]);
    const [diarySummaryEvents, setDiarySummaryEvents] = useState([]);
    const [diaryViewMode, setDiaryViewMode] = useState("summary");
    const [diaryLoading, setDiaryLoading] = useState(false);
    const [diaryPagination, setDiaryPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [diaryFilters, setDiaryFilters] = useState({ startDate: "", endDate: "", crewCode: "", crewName: "", role: "" });

    const toggleModal = (modalName) => setModals((prev) => ({ ...prev, [modalName]: !prev[modalName] }));

    const setPositioningValue = (key, value) => {
        setPositioningSettings((prev) => ({ ...prev, [key]: value }));
    };

    const hydrateFromBootstrap = useCallback((data) => {
        const duty = data?.dutySettings || {};
        setDutySettings({
            restThresholdMinutes: minutesToHHMM(duty.restThresholdMinutes ?? 420),
            breakThresholdMinutes: minutesToHHMM(duty.breakThresholdMinutes ?? 180),
            preflightNewFdpMinutes: minutesToHHMM(duty.preflightNewFdpMinutes ?? 90),
            preflightExistingDutyMinutes: minutesToHHMM(duty.preflightExistingDutyMinutes ?? 45),
            postflightMinutes: minutesToHHMM(duty.postflightMinutes ?? 30),
        });
        const pos = data?.positioningSettings || {};
        setPositioningSettings({
            returnToBaseAfterFdpEnabled: pos.returnToBaseAfterFdpEnabled !== false,
            hotacCutoffEnabled: pos.hotacCutoffEnabled === true,
            hotacCutoffLocalTime: pos.hotacCutoffLocalTime || "20:00",
            positioningWithinCurrentFdpEnabled: pos.positioningWithinCurrentFdpEnabled !== false,
            defaultPositioningMinutes: minutesToHHMM(pos.defaultPositioningMinutes ?? 150),
            hotacToAirportTransferMinutes: minutesToHHMM(pos.hotacToAirportTransferMinutes ?? 60),
        });
        setUtilisationTargets((data?.utilisationTargets || []).map((row) => ({
            ...row,
            averageDpMinutesPerDay: minutesToHHMM(row.averageDpMinutesPerDay),
            averageFdpMinutesPerDay: minutesToHHMM(row.averageFdpMinutesPerDay),
            averageFtMinutesPerDay: minutesToHHMM(row.averageFtMinutesPerDay),
        })));
        setLayoverRules((data?.layoverRules || []).map((row) => ({
            ...row,
            thresholdMinutes: minutesToHHMM(row.thresholdMinutes),
        })));
        setPositioningCostRules(data?.positioningCostRules || []);
        setLatestRun(data?.latestRun || null);
        setCounts(data?.counts || {});
    }, []);

    const loadOptions = useCallback(async () => {
        try {
            const response = await api.get("/crew/options");
            setOptions(response.data?.data || { roles: [], bases: [], categories: [], subCategories: [], stations: [] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load Crew filters.");
        }
    }, []);

    const loadBootstrap = useCallback(async () => {
        setPageLoading(true);
        try {
            const response = await api.get("/crew/bootstrap");
            hydrateFromBootstrap(response.data?.data || {});
            await loadOptions();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load Crew module.");
        } finally {
            setPageLoading(false);
        }
    }, [hydrateFromBootstrap, loadOptions]);

    const loadKpis = useCallback(async () => {
        setKpiLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("periodicity", kpiFilters.periodicity);
            ["roles", "bases", "categories", "subCategories"].forEach((key) => {
                if (kpiFilters[key]?.length) params.set(key, kpiFilters[key].join(","));
            });
            const response = await api.get(`/crew/kpis?${params.toString()}`);
            setKpiData(response.data?.data || { periods: [], metrics: [] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load Crew KPIs.");
        } finally {
            setKpiLoading(false);
        }
    }, [kpiFilters]);

    const loadDiary = useCallback(async (page = 1, viewMode = diaryViewMode) => {
        setDiaryLoading(true);
        try {
            const isSummary = viewMode === "summary";
            const params = new URLSearchParams({ page: String(page), limit: String(isSummary ? 5000 : diaryPagination.limit) });
            if (isSummary) params.set("view", "summary");
            Object.entries(diaryFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            const response = await api.get(`/crew/diary?${params.toString()}`);
            if (isSummary) {
                setDiarySummaryEvents(response.data?.data || []);
            } else {
                setDiaryRows(response.data?.data || []);
                setDiaryPagination(response.data?.pagination || { page, limit: 50, total: 0, totalPages: 0 });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load Crew Diary.");
        } finally {
            setDiaryLoading(false);
        }
    }, [diaryFilters, diaryPagination.limit, diaryViewMode]);

    useEffect(() => {
        loadBootstrap();
    }, [loadBootstrap]);

    useEffect(() => {
        loadKpis();
    }, [loadKpis]);

    useEffect(() => {
        if (modals.diary) loadDiary(1);
    }, [modals.diary, diaryFilters, diaryViewMode, loadDiary]);

    const diarySummary = useMemo(() => {
        const sortedEvents = [...diarySummaryEvents].sort(sortByStartTime);
        const columnMap = new Map();
        const rowMap = new Map();

        sortedEvents.forEach((event) => {
            const dateKey = event.displayDate || getUtcDateKey(event.startDateTime);
            const startTime = formatTime(event.startDateTime);
            const endTime = formatEndTime(event);
            if (!dateKey || !startTime || !endTime) return;

            const columnKey = `${dateKey}|${startTime}|${endTime}`;
            if (!columnMap.has(columnKey)) {
                columnMap.set(columnKey, {
                    key: columnKey,
                    dateKey,
                    dateLabel: formatDate(`${dateKey}T00:00:00.000Z`),
                    timeLabel: `${startTime}-${endTime}`,
                });
            }

            const category = event.category || "Uncategorised";
            const rowKey = [event.crewCode || "-", event.crewName || "-", event.role || "-", category].join("|");
            if (!rowMap.has(rowKey)) {
                rowMap.set(rowKey, {
                    key: rowKey,
                    crewCode: event.crewCode || "-",
                    crewName: event.crewName || "-",
                    role: event.role || "-",
                    category,
                    cells: new Map(),
                });
            }

            const cellValues = rowMap.get(rowKey).cells.get(columnKey) || [];
            const cellParts = [
                event.subCategory && event.subCategory !== category ? event.subCategory : "",
                event.flightNumber,
                event.location,
            ].filter(Boolean);
            const cellLabel = cellParts.join(" | ") || category;
            rowMap.get(rowKey).cells.set(columnKey, [...cellValues, cellLabel]);
        });

        const columns = Array.from(columnMap.values()).sort((left, right) => {
            if (left.dateKey !== right.dateKey) return left.dateKey.localeCompare(right.dateKey);
            return left.timeLabel.localeCompare(right.timeLabel);
        });
        const rows = Array.from(rowMap.values()).sort((left, right) => {
            const crewSort = String(left.crewCode).localeCompare(String(right.crewCode));
            if (crewSort !== 0) return crewSort;
            return String(left.category).localeCompare(String(right.category));
        });
        const dateGroups = columns.reduce((groups, column) => {
            const previous = groups[groups.length - 1];
            if (previous?.dateKey === column.dateKey) {
                previous.colSpan += 1;
            } else {
                groups.push({ dateKey: column.dateKey, label: column.dateLabel, colSpan: 1 });
            }
            return groups;
        }, []);

        return { columns, rows, dateGroups };
    }, [diarySummaryEvents]);

    const dutyErrors = useMemo(() => {
        const errors = {};
        Object.entries(dutySettings).forEach(([key, value]) => {
            if (!durationRegex.test(value)) errors[key] = "HH:MM";
        });
        const rest = hhmmToMinutes(dutySettings.restThresholdMinutes);
        const brk = hhmmToMinutes(dutySettings.breakThresholdMinutes);
        if (rest !== null && brk !== null && rest <= brk) {
            errors.restThresholdMinutes = "Must exceed break";
        }
        return errors;
    }, [dutySettings]);

    const positioningErrors = useMemo(() => {
        const errors = {};
        if (positioningSettings.hotacCutoffEnabled && !clockRegex.test(positioningSettings.hotacCutoffLocalTime)) {
            errors.hotacCutoffLocalTime = "HH:MM";
        }
        if (!durationRegex.test(positioningSettings.defaultPositioningMinutes)) {
            errors.defaultPositioningMinutes = "HH:MM";
        }
        if (!durationRegex.test(positioningSettings.hotacToAirportTransferMinutes)) {
            errors.hotacToAirportTransferMinutes = "HH:MM";
        }
        return errors;
    }, [positioningSettings]);

    const buildDutyPayload = () => {
        if (Object.keys(dutyErrors).length) throw new Error("Please fix Crew Requirements & Limits values.");
        return Object.fromEntries(Object.entries(dutySettings).map(([key, value]) => [key, hhmmToMinutes(value)]));
    };

    const buildPositioningPayload = () => {
        if (Object.keys(positioningErrors).length) throw new Error("Please fix Positioning / Deadheading values.");
        return {
            returnToBaseAfterFdpEnabled: positioningSettings.returnToBaseAfterFdpEnabled,
            hotacCutoffEnabled: positioningSettings.hotacCutoffEnabled,
            hotacCutoffLocalTime: positioningSettings.hotacCutoffLocalTime,
            positioningWithinCurrentFdpEnabled: positioningSettings.positioningWithinCurrentFdpEnabled,
            defaultPositioningMinutes: hhmmToMinutes(positioningSettings.defaultPositioningMinutes),
            hotacToAirportTransferMinutes: hhmmToMinutes(positioningSettings.hotacToAirportTransferMinutes),
        };
    };

    const saveSettings = async () => {
        const dutyPayload = buildDutyPayload();
        const positioningPayload = buildPositioningPayload();
        await api.put("/crew/duty-settings", dutyPayload);
        await api.put("/crew/positioning-settings", positioningPayload);
    };

    const handleUpload = async (key, endpoint, file) => {
        setUploadState((prev) => ({ ...prev, [key]: { ...prev[key], filename: file.name, loading: true, errors: [] } }));
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await api.post(endpoint, formData, { headers: { "Content-Type": "multipart/form-data" } });
            const summary = response.data?.data;
            setUploadState((prev) => ({ ...prev, [key]: { filename: file.name, loading: false, summary, errors: summary?.errors || [] } }));
            await loadBootstrap();
            const outcome = getUploadOutcome(key, summary, response.data?.message);
            if (outcome.type === "error") toast.error(outcome.message);
            else if (outcome.type === "warning") toast.warning(outcome.message);
            else toast.success(outcome.message);
        } catch (error) {
            const message = error.response?.data?.message || "Upload failed.";
            const summary = error.response?.data?.data || null;
            setUploadState((prev) => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    loading: false,
                    summary: summary || prev[key].summary,
                    errors: summary?.errors || [{ message }],
                },
            }));
            toast.error(message);
        }
    };

    const handleUpdatePlan = async () => {
        setUpdatingPlan(true);
        try {
            await saveSettings();
            const response = await api.post("/crew/update-plan");
            setLatestRun(response.data?.data?.calculationRun || null);
            toast.success(response.data?.message || "Crew plan updated.");
            await Promise.all([loadBootstrap(), loadKpis(), modals.diary ? loadDiary(1) : Promise.resolve()]);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to update Crew plan.");
        } finally {
            setUpdatingPlan(false);
        }
    };

    const normaliseTargetRowsForSave = () => utilisationTargets
        .filter((row) => row.role || row.averageDpMinutesPerDay || row.averageFdpMinutesPerDay || row.averageFtMinutesPerDay)
        .map((row) => ({
            role: row.role || "ALL_ROLES",
            averageDpMinutesPerDay: hhmmToMinutes(row.averageDpMinutesPerDay || "00:00"),
            averageFdpMinutesPerDay: hhmmToMinutes(row.averageFdpMinutesPerDay || "00:00"),
            averageFtMinutesPerDay: hhmmToMinutes(row.averageFtMinutesPerDay || "00:00"),
        }));

    const saveUtilisationTargets = async () => {
        setSavingModal("utilisation");
        try {
            const items = normaliseTargetRowsForSave();
            if (items.some((row) => row.averageDpMinutesPerDay === null || row.averageFdpMinutesPerDay === null || row.averageFtMinutesPerDay === null)) {
                throw new Error("Utilisation target durations must use HH:MM.");
            }
            await api.post("/crew/utilisation-targets/bulk", { items });
            toast.success("Utilisation targets saved.");
            toggleModal("utilisation");
            await loadBootstrap();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to save utilisation targets.");
        } finally {
            setSavingModal("");
        }
    };

    const saveLayoverRules = async () => {
        setSavingModal("layover");
        try {
            const items = layoverRules
                .filter((row) => row.station || row.role || row.thresholdMinutes || row.costAmount)
                .map((row) => ({
                    ...row,
                    role: row.role || "ALL_ROLES",
                    station: row.station || "ALL_STATIONS",
                    thresholdMinutes: hhmmToMinutes(row.thresholdMinutes || "00:00"),
                    costAmount: Number(row.costAmount || 0),
                    currency: row.currency || "INR",
                }));
            if (items.some((row) => row.thresholdMinutes === null)) throw new Error("Layover thresholds must use HH:MM.");
            await api.post("/crew/layover-rules/bulk", { items });
            toast.success("Layover rules saved.");
            toggleModal("layover");
            await loadBootstrap();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to save layover rules.");
        } finally {
            setSavingModal("");
        }
    };

    const savePositioningCosts = async () => {
        setSavingModal("positioning");
        try {
            const items = positioningCostRules
                .filter((row) => row.departureStation || row.arrivalStation || row.sector || row.costAmount)
                .map((row) => {
                    const sectorParts = String(row.sector || "").split("-").map((part) => part.trim().toUpperCase());
                    const departureStation = (row.departureStation || sectorParts[0] || "").toUpperCase();
                    const arrivalStation = (row.arrivalStation || sectorParts[1] || "").toUpperCase();
                    return {
                        ...row,
                        departureStation,
                        arrivalStation,
                        sector: row.sector || `${departureStation}-${arrivalStation}`,
                        role: row.role || "ALL_ROLES",
                        costAmount: Number(row.costAmount || 0),
                        currency: row.currency || "INR",
                    };
                });
            await api.post("/crew/positioning-cost-rules/bulk", { items });
            toast.success("Positioning costs saved.");
            toggleModal("positioning");
            await loadBootstrap();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save positioning costs.");
        } finally {
            setSavingModal("");
        }
    };

    const updateTargetRow = (index, patch) => {
        setUtilisationTargets((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    };

    const updateLayoverRow = (id, patch) => {
        setLayoverRules((prev) => prev.map((row) => (row._id === id || row.localId === id ? { ...row, ...patch } : row)));
    };

    const updatePositioningRow = (index, patch) => {
        setPositioningCostRules((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    };

    const runStatus = latestRun
        ? `${latestRun.status}${latestRun.completedAt ? ` at ${formatDate(latestRun.completedAt)} ${formatTime(latestRun.completedAt)}` : ""}`
        : "Not calculated yet";

    const convenienceRules = layoverRules.filter((row) => row.ruleType === "CONVENIENCE");
    const hotacRules = layoverRules.filter((row) => row.ruleType === "HOTAC");
    const kpiDropdownOptions = useMemo(() => ({
        roles: toDropdownOptions(options.roles),
        bases: toDropdownOptions(options.bases),
        categories: toDropdownOptions(options.categories),
        subCategories: toDropdownOptions(options.subCategories),
    }), [options]);
    const selectedKpiOptions = (key) => {
        const optionMap = new Map((kpiDropdownOptions[key] || []).map((option) => [option.value, option]));
        return (kpiFilters[key] || []).map((value) => optionMap.get(value) || { value, label: value });
    };
    const updateKpiMultiFilter = (key, selectedOptions) => {
        setKpiFilters((prev) => ({ ...prev, [key]: selectedOptions.map((option) => option.value) }));
    };

    return (
        <div className="w-full h-full p-4 md:p-6 space-y-6 flex flex-col min-h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950/20 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Crew Settings</h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                        {pageLoading ? "Loading crew configuration..." : `Plan status: ${runStatus}`}
                    </p>
                </div>
                <div className="w-full sm:w-auto">
                    <ActionButton
                        label={updatingPlan ? "Updating Plan" : "Update Plan"}
                        icon={updatingPlan ? RefreshCw : Check}
                        variant="emerald"
                        disabled={updatingPlan || pageLoading}
                        onClick={handleUpdatePlan}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <SectionCard title="Crew Requirements & Limits" icon={Clock}>
                        <InputTime label="Rest period if time period between consecutive duties exceeds" value={dutySettings.restThresholdMinutes} error={dutyErrors.restThresholdMinutes} onChange={(event) => setDutySettings((prev) => ({ ...prev, restThresholdMinutes: event.target.value }))} />
                        <InputTime label="Break period if time period between consecutive assigned duties exceed" value={dutySettings.breakThresholdMinutes} error={dutyErrors.breakThresholdMinutes} onChange={(event) => setDutySettings((prev) => ({ ...prev, breakThresholdMinutes: event.target.value }))} />
                        <InputTime label="Preflight duty period on first flight in FDP with duty period commencing" value={dutySettings.preflightNewFdpMinutes} error={dutyErrors.preflightNewFdpMinutes} onChange={(event) => setDutySettings((prev) => ({ ...prev, preflightNewFdpMinutes: event.target.value }))} />
                        <InputTime label="Preflight duty period on first flight in FDP with duty period already in effect" value={dutySettings.preflightExistingDutyMinutes} error={dutyErrors.preflightExistingDutyMinutes} onChange={(event) => setDutySettings((prev) => ({ ...prev, preflightExistingDutyMinutes: event.target.value }))} />
                        <InputTime label="Post flight duty period after last flight in FDP" value={dutySettings.postflightMinutes} error={dutyErrors.postflightMinutes} onChange={(event) => setDutySettings((prev) => ({ ...prev, postflightMinutes: event.target.value }))} />
                    </SectionCard>

                    <SectionCard title="Positioning / Deadheading Settings" icon={Activity}>
                        <CheckboxSetting
                            label="Return to base immediately at end of FDP if Rest period follows and next DP starts at base"
                            checked={positioningSettings.returnToBaseAfterFdpEnabled}
                            onChange={(event) => setPositioningValue("returnToBaseAfterFdpEnabled", event.target.checked)}
                        />
                        <CheckboxSetting
                            label="Cutoff Local time at end of FDP for Hotac if rest period follows and next DP starts at another (non-Base) station"
                            checked={positioningSettings.hotacCutoffEnabled}
                            onChange={(event) => setPositioningValue("hotacCutoffEnabled", event.target.checked)}
                            timeValue={positioningSettings.hotacCutoffEnabled ? positioningSettings.hotacCutoffLocalTime : undefined}
                            onTimeChange={(event) => setPositioningValue("hotacCutoffLocalTime", event.target.value)}
                            error={positioningErrors.hotacCutoffLocalTime}
                        />
                        <CheckboxSetting
                            label="Positioning to (different) station with next assigned flight within current FDP"
                            checked={positioningSettings.positioningWithinCurrentFdpEnabled}
                            onChange={(event) => setPositioningValue("positioningWithinCurrentFdpEnabled", event.target.checked)}
                        />
                        {positioningSettings.positioningWithinCurrentFdpEnabled && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pl-7 pb-2 border-b border-slate-100 dark:border-slate-800/60 flex flex-col gap-2 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                                    <span className="text-base text-slate-600 dark:text-slate-400">Time taken for Positioning, if flight not available within schedule</span>
                                    <InputTime label="" value={positioningSettings.defaultPositioningMinutes} error={positioningErrors.defaultPositioningMinutes} onChange={(event) => setPositioningValue("defaultPositioningMinutes", event.target.value)} className="py-0 sm:justify-end" />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-base text-slate-600 dark:text-slate-400">DT to be considered for Transfer from Hotac to Airport for flight to Position crew</span>
                                    <InputTime label="" value={positioningSettings.hotacToAirportTransferMinutes} error={positioningErrors.hotacToAirportTransferMinutes} onChange={(event) => setPositioningValue("hotacToAirportTransferMinutes", event.target.value)} className="py-0 sm:justify-end" />
                                </div>
                            </motion.div>
                        )}
                    </SectionCard>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-6">
                    <SectionCard title="Upload Information" icon={UploadCloud}>
                        <div className="flex flex-col gap-3 py-2">
                            <UploadLink label="Crew Information" state={uploadState.members} onUpload={(file) => handleUpload("members", "/crew/upload/members", file)} />
                            <UploadLink label="Crew Roster - Flight Duty" state={uploadState.flightDuties} onUpload={(file) => handleUpload("flightDuties", "/crew/upload/flight-duties", file)} />
                            <UploadLink label="Crew Roster - Other Duty" state={uploadState.otherDuties} onUpload={(file) => handleUpload("otherDuties", "/crew/upload/other-duties", file)} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>Crew {counts.crewMembers || 0}</span>
                            <span>Flights {counts.flightAssignments || 0}</span>
                            <span>Duties {counts.otherDuties || 0}</span>
                        </div>
                    </SectionCard>

                    <SectionCard title="Configuration Tables" icon={Settings}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                            <ActionButton label="Utilisation Target" icon={Users} variant="secondary" onClick={() => toggleModal("utilisation")} />
                            <ActionButton label="Layover Settings" icon={Clock} variant="secondary" onClick={() => toggleModal("layover")} />
                            <ActionButton label="Positioning Cost" icon={DollarSign} variant="secondary" onClick={() => toggleModal("positioning")} />
                            <ActionButton label="Crew Diary" icon={Calendar} variant="secondary" onClick={() => toggleModal("diary")} />
                        </div>
                    </SectionCard>
                </div>
            </div>

            <SectionCard title="Crew KPIs" icon={Activity} className="mt-4">
                <div className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/50 w-full dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <SingleSelectDropdown
                        placeholder="Periodicity"
                        options={PERIODICITY_OPTIONS}
                        selected={PERIODICITY_OPTIONS.find((option) => option.value === kpiFilters.periodicity)}
                        onChange={(option) => setKpiFilters((prev) => ({ ...prev, periodicity: option.value }))}
                    />
                    <MultiSelectDropdown
                        placeholder="Role"
                        options={kpiDropdownOptions.roles}
                        selected={selectedKpiOptions("roles")}
                        onChange={(selectedOptions) => updateKpiMultiFilter("roles", selectedOptions)}
                    />
                    <MultiSelectDropdown
                        placeholder="Base"
                        options={kpiDropdownOptions.bases}
                        selected={selectedKpiOptions("bases")}
                        onChange={(selectedOptions) => updateKpiMultiFilter("bases", selectedOptions)}
                    />
                    <MultiSelectDropdown
                        placeholder="Category"
                        options={kpiDropdownOptions.categories}
                        selected={selectedKpiOptions("categories")}
                        onChange={(selectedOptions) => updateKpiMultiFilter("categories", selectedOptions)}
                    />
                    <MultiSelectDropdown
                        placeholder="Sub-category"
                        options={kpiDropdownOptions.subCategories}
                        selected={selectedKpiOptions("subCategories")}
                        onChange={(selectedOptions) => updateKpiMultiFilter("subCategories", selectedOptions)}
                    />
                </div>

                <div className="overflow-x-auto w-full custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-base text-left whitespace-nowrap">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                            <tr>
                                <th className="p-3 font-semibold w-[250px] sticky left-0 bg-slate-100 dark:bg-slate-800/90 z-10 border-r border-slate-200 dark:border-slate-700">Metric</th>
                                {(kpiData.periods.length ? kpiData.periods : Array.from({ length: 6 }, (_, index) => ({ label: `Period ${index + 1}` }))).map((period, index) => (
                                    <th key={`${period.label}-${index}`} className="p-3 font-semibold text-center border-l border-slate-200 dark:border-slate-700">{period.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {kpiLoading && (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-slate-500">Loading KPI values...</td>
                                </tr>
                            )}
                            {!kpiLoading && kpiData.metrics.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-slate-500">No calculated KPI values yet.</td>
                                </tr>
                            )}
                            {!kpiLoading && kpiData.metrics.map((metric) => (
                                <tr key={metric.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium sticky left-0 bg-white dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-700/50">
                                        {metric.label}
                                    </td>
                                    {Array.from({ length: 6 }, (_, index) => (
                                        <td key={`${metric.key}-${index}`} className="p-3 border-l border-slate-100 dark:border-slate-800 text-center text-slate-700 dark:text-slate-300 tabular-nums">
                                            {formatKpiValue(metric, metric.values?.[index])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            <Modal isOpen={modals.utilisation} onClose={() => toggleModal("utilisation")} onSave={saveUtilisationTargets} isSaving={savingModal === "utilisation"} title="Utilisation Target" maxWidth="max-w-3xl">
                <div className="mb-3 flex justify-end">
                    <AddRowButton label="Add target" onClick={() => setUtilisationTargets((prev) => [...prev, { role: "ALL_ROLES", averageDpMinutesPerDay: "00:00", averageFdpMinutesPerDay: "00:00", averageFtMinutesPerDay: "00:00" }])} />
                </div>
                <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center">Avg. DP/day</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center">Avg. FDP/day</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center">Avg. FT/day</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 w-12" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {utilisationTargets.map((row, index) => (
                            <tr key={row._id || index}>
                                <td className="p-2">
                                    <SmallInput value={row.role} onChange={(value) => updateTargetRow(index, { role: value })} placeholder="ALL_ROLES" className="text-left" />
                                </td>
                                <td className="p-2"><SmallInput value={row.averageDpMinutesPerDay} onChange={(value) => updateTargetRow(index, { averageDpMinutesPerDay: value })} placeholder="HH:MM" /></td>
                                <td className="p-2"><SmallInput value={row.averageFdpMinutesPerDay} onChange={(value) => updateTargetRow(index, { averageFdpMinutesPerDay: value })} placeholder="HH:MM" /></td>
                                <td className="p-2"><SmallInput value={row.averageFtMinutesPerDay} onChange={(value) => updateTargetRow(index, { averageFtMinutesPerDay: value })} placeholder="HH:MM" /></td>
                                <td className="p-2 text-center"><DeleteButton onClick={() => setUtilisationTargets((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} /></td>
                            </tr>
                        ))}
                        {utilisationTargets.length === 0 && (
                            <tr><td colSpan={5} className="p-5 text-center text-slate-500">No utilisation targets configured.</td></tr>
                        )}
                    </tbody>
                </table>
            </Modal>

            <Modal isOpen={modals.layover} onClose={() => toggleModal("layover")} onSave={saveLayoverRules} isSaving={savingModal === "layover"} title="Layover Settings" maxWidth="max-w-4xl">
                <div className="space-y-8">
                    {[
                        { title: "Convenience accom/Lounges, etc. if layover exceeds", type: "CONVENIENCE", rows: convenienceRules, costLabel: "Cost per hour" },
                        { title: "HOTAC (+Airport transfer) if layover exceeds", type: "HOTAC", rows: hotacRules, costLabel: "Cost per 24 hours" },
                    ].map((table) => (
                        <div key={table.type}>
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 ml-1 text-base bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-md">{table.title}</h4>
                                <AddRowButton label="Add rule" onClick={() => setLayoverRules((prev) => [...prev, { localId: `${table.type}-${Date.now()}`, ruleType: table.type, station: "ALL_STATIONS", role: "ALL_ROLES", thresholdMinutes: "00:00", costAmount: 0, currency: "INR" }])} />
                            </div>
                            <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Stn</th>
                                        <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                                        <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">LO time</th>
                                        <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">{table.costLabel}</th>
                                        <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">CCY</th>
                                        <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 w-12" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {table.rows.map((row) => {
                                        const id = row._id || row.localId;
                                        return (
                                            <tr key={id}>
                                                <td className="p-2"><SmallInput value={row.station} onChange={(value) => updateLayoverRow(id, { station: value.toUpperCase() })} placeholder="DEL" /></td>
                                                <td className="p-2"><SmallInput value={row.role} onChange={(value) => updateLayoverRow(id, { role: value })} placeholder="ALL_ROLES" /></td>
                                                <td className="p-2"><SmallInput value={row.thresholdMinutes} onChange={(value) => updateLayoverRow(id, { thresholdMinutes: value })} placeholder="HH:MM" /></td>
                                                <td className="p-2"><SmallInput value={row.costAmount} onChange={(value) => updateLayoverRow(id, { costAmount: value })} placeholder="Amount" type="number" /></td>
                                                <td className="p-2"><SmallInput value={row.currency} onChange={(value) => updateLayoverRow(id, { currency: value.toUpperCase() })} placeholder="INR" /></td>
                                                <td className="p-2 text-center"><DeleteButton onClick={() => setLayoverRules((prev) => prev.filter((item) => (item._id || item.localId) !== id))} /></td>
                                            </tr>
                                        );
                                    })}
                                    {table.rows.length === 0 && (
                                        <tr><td colSpan={6} className="p-5 text-center text-slate-500">No rules configured.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={modals.positioning} onClose={() => toggleModal("positioning")} onSave={savePositioningCosts} isSaving={savingModal === "positioning"} title="Positioning Cost" maxWidth="max-w-3xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-medium text-slate-600 dark:text-slate-400 text-base italic">Same as fare unless listed below</h4>
                    <AddRowButton label="Add cost" onClick={() => setPositioningCostRules((prev) => [...prev, { departureStation: "", arrivalStation: "", sector: "", role: "ALL_ROLES", costAmount: 0, currency: "INR" }])} />
                </div>
                <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Dep</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Arr</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Cost</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Cost CCY</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 w-12" />
                        </tr>
                    </thead>
                    <tbody>
                        {positioningCostRules.map((row, index) => (
                            <tr key={row._id || index}>
                                <td className="p-2"><SmallInput value={row.departureStation} onChange={(value) => updatePositioningRow(index, { departureStation: value.toUpperCase(), sector: `${value.toUpperCase()}-${row.arrivalStation || ""}` })} placeholder="DEL" /></td>
                                <td className="p-2"><SmallInput value={row.arrivalStation} onChange={(value) => updatePositioningRow(index, { arrivalStation: value.toUpperCase(), sector: `${row.departureStation || ""}-${value.toUpperCase()}` })} placeholder="BOM" /></td>
                                <td className="p-2"><SmallInput value={row.role} onChange={(value) => updatePositioningRow(index, { role: value })} placeholder="ALL_ROLES" /></td>
                                <td className="p-2"><SmallInput value={row.costAmount} onChange={(value) => updatePositioningRow(index, { costAmount: value })} placeholder="Amount" type="number" /></td>
                                <td className="p-2"><SmallInput value={row.currency} onChange={(value) => updatePositioningRow(index, { currency: value.toUpperCase() })} placeholder="INR" /></td>
                                <td className="p-2 text-center"><DeleteButton onClick={() => setPositioningCostRules((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} /></td>
                            </tr>
                        ))}
                        {positioningCostRules.length === 0 && (
                            <tr><td colSpan={6} className="p-5 text-center text-slate-500">No positioning overrides configured.</td></tr>
                        )}
                    </tbody>
                </table>
            </Modal>

            <Modal isOpen={modals.diary} onClose={() => toggleModal("diary")} title="Crew Diary" maxWidth="max-w-7xl">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <SmallInput value={diaryFilters.startDate} type="date" onChange={(value) => setDiaryFilters((prev) => ({ ...prev, startDate: value }))} />
                        <SmallInput value={diaryFilters.endDate} type="date" onChange={(value) => setDiaryFilters((prev) => ({ ...prev, endDate: value }))} />
                        <SmallInput value={diaryFilters.crewCode} placeholder="Crew ID" onChange={(value) => setDiaryFilters((prev) => ({ ...prev, crewCode: value }))} />
                        <SmallInput value={diaryFilters.crewName} placeholder="Crew Name" onChange={(value) => setDiaryFilters((prev) => ({ ...prev, crewName: value }))} />
                        <SmallInput value={diaryFilters.role} placeholder="Role" onChange={(value) => setDiaryFilters((prev) => ({ ...prev, role: value }))} />
                    </div>
                    <div className="inline-flex w-fit rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
                        {["summary", "detailed"].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setDiaryViewMode(mode)}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-colors",
                                    diaryViewMode === mode
                                        ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {diaryViewMode === "summary" ? (
                    <>
                        <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-700 rounded-lg">
                            <table className="w-full text-sm text-left min-w-[1100px]">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th rowSpan={2} className="sticky left-0 z-30 w-[110px] min-w-[110px] p-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Crew ID</th>
                                        <th rowSpan={2} className="sticky left-[110px] z-30 w-[150px] min-w-[150px] p-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Crew Name</th>
                                        <th rowSpan={2} className="sticky left-[260px] z-30 w-[100px] min-w-[100px] p-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Role</th>
                                        <th rowSpan={2} className="sticky left-[360px] z-30 w-[180px] min-w-[180px] p-3 font-semibold border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Activity</th>
                                        {diarySummary.dateGroups.length > 0 ? diarySummary.dateGroups.map((group) => (
                                            <th key={group.dateKey} colSpan={group.colSpan} className="p-3 font-semibold text-center border-b border-slate-200 dark:border-slate-700">
                                                {group.label}
                                            </th>
                                        )) : (
                                            <th className="p-3 font-semibold text-center border-b border-slate-200 dark:border-slate-700">Period</th>
                                        )}
                                    </tr>
                                    <tr>
                                        {diarySummary.columns.length > 0 ? diarySummary.columns.map((column) => (
                                            <th key={column.key} className="min-w-[130px] p-3 font-semibold text-center border-b border-l border-slate-200 dark:border-slate-700 tabular-nums">
                                                {column.timeLabel}
                                            </th>
                                        )) : (
                                            <th className="min-w-[130px] p-3 font-semibold text-center border-b border-l border-slate-200 dark:border-slate-700">No slots</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {diaryLoading && (
                                        <tr><td colSpan={4 + Math.max(diarySummary.columns.length, 1)} className="p-6 text-center text-slate-500">Loading diary summary...</td></tr>
                                    )}
                                    {!diaryLoading && diarySummary.rows.length === 0 && (
                                        <tr><td colSpan={4 + Math.max(diarySummary.columns.length, 1)} className="p-6 text-center text-slate-500">No Crew Diary rows found.</td></tr>
                                    )}
                                    {!diaryLoading && diarySummary.rows.map((row) => (
                                        <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 align-top">
                                            <td className="sticky left-0 z-20 w-[110px] min-w-[110px] p-3 font-medium border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">{row.crewCode}</td>
                                            <td className="sticky left-[110px] z-20 w-[150px] min-w-[150px] p-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">{row.crewName}</td>
                                            <td className="sticky left-[260px] z-20 w-[100px] min-w-[100px] p-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">{row.role}</td>
                                            <td className="sticky left-[360px] z-20 w-[180px] min-w-[180px] p-3 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">{row.category}</td>
                                            {diarySummary.columns.map((column) => {
                                                const values = [...new Set(row.cells.get(column.key) || [])];
                                                return (
                                                    <td key={`${row.key}-${column.key}`} className="min-w-[130px] p-3 text-center border-l border-slate-100 dark:border-slate-800">
                                                        {values.length ? (
                                                            <div className="flex flex-col gap-1">
                                                                {values.slice(0, 3).map((value) => (
                                                                    <span key={value} className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                                                                        {value}
                                                                    </span>
                                                                ))}
                                                                {values.length > 3 && <span className="text-xs text-slate-500">+{values.length - 3} more</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 dark:text-slate-700">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            {diarySummary.columns.length === 0 && <td className="p-3 text-center text-slate-400">-</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 text-sm text-slate-500">
                            <span>{diarySummaryEvents.length || 0} events in summary</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-700 rounded-lg">
                            <table className="w-full text-sm text-left min-w-[1500px]">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        {["Crew ID", "Crew Name", "Role", "Date", "From", "To", "Location", "Category", "Sub-category", "DP", "FDP", "FT", "RP", "DP Cost", "FDP Cost", "FT Cost", "Layover", "Positioning", "Reason"].map((header) => (
                                            <th key={header} className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {diaryLoading && (
                                        <tr><td colSpan={19} className="p-6 text-center text-slate-500">Loading diary rows...</td></tr>
                                    )}
                                    {!diaryLoading && diaryRows.length === 0 && (
                                        <tr><td colSpan={19} className="p-6 text-center text-slate-500">No Crew Diary rows found.</td></tr>
                                    )}
                                    {!diaryLoading && diaryRows.map((row) => (
                                        <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 align-top">
                                            <td className="p-3 font-medium">{row.crewCode}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row.crewName}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row.role}</td>
                                            <td className="p-3">{formatDate(row.startDateTime)}</td>
                                            <td className="p-3 tabular-nums">{formatTime(row.startDateTime)}</td>
                                            <td className="p-3 tabular-nums">{formatEndTime(row)}</td>
                                            <td className="p-3">{row.location || "-"}</td>
                                            <td className="p-3">{row.category}</td>
                                            <td className="p-3">{row.subCategory}</td>
                                            <td className="p-3 tabular-nums">{minutesToHHMM(row.dpMinutes)}</td>
                                            <td className="p-3 tabular-nums">{minutesToHHMM(row.fdpMinutes)}</td>
                                            <td className="p-3 tabular-nums">{minutesToHHMM(row.ftMinutes)}</td>
                                            <td className="p-3 tabular-nums">{minutesToHHMM(row.rpMinutes)}</td>
                                            <td className="p-3 tabular-nums">{formatMoney(row.dpCost, row.currency)}</td>
                                            <td className="p-3 tabular-nums">{formatMoney(row.fdpCost, row.currency)}</td>
                                            <td className="p-3 tabular-nums">{formatMoney(row.ftCost, row.currency)}</td>
                                            <td className="p-3 tabular-nums">{formatMoney(row.layoverCost, row.currency)}</td>
                                            <td className="p-3 tabular-nums">{formatMoney(row.positioningCost, row.currency)}</td>
                                            <td className="p-3 min-w-[260px] text-slate-500 dark:text-slate-400 whitespace-normal">{row.reasonText}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
                            <span>{diaryPagination.total || 0} rows</span>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={diaryPagination.page <= 1 || diaryLoading} onClick={() => loadDiary(diaryPagination.page - 1, "detailed")} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50">Prev</button>
                                <span>Page {diaryPagination.page || 1} of {diaryPagination.totalPages || 1}</span>
                                <button type="button" disabled={diaryPagination.page >= diaryPagination.totalPages || diaryLoading} onClick={() => loadDiary(diaryPagination.page + 1, "detailed")} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default CrewPage;
