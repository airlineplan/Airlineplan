import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../../apiConfig";
import * as XLSX from "xlsx";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ArrowRightLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Fuel,
  Gauge,
  Layers3,
  NotebookText,
  Plus,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function formatPeriodDate(inputDate) {
  const date = new Date(inputDate);
  if (Number.isNaN(date.getTime())) return "--";
  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

function formatNumber(value, digits = 0) {
  const raw = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(raw)) {
    return value === "" || value === null || value === undefined ? "--" : String(value);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(raw);
}

function ratio(numerator, denominator, digits = 2) {
  const n = Number(String(numerator ?? "").replace(/,/g, ""));
  const d = Number(String(denominator ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return "0.00";
  return (n / d).toFixed(digits);
}

function percentOf(numerator, denominator) {
  const n = Number(String(numerator ?? "").replace(/,/g, ""));
  const d = Number(String(denominator ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function normalizeCurrencyCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

const DEFAULT_CURRENCIES = ["EUR", "USD", "GBP", "INR", "AED", "JPY"];

const FX_BASIS_OPTIONS = [
  { label: "Absolute", value: "absolute" },
  { label: "As % of total revenue", value: "% of total revenue" },
  { label: "Per ASK", value: "per ASK" },
  { label: "Per RPK", value: "per RPK" },
  { label: "Per ATK", value: "per ATK" },
  { label: "Per RTK", value: "per RTK" },
  { label: "Per BH", value: "per BH" },
  { label: "Per FH", value: "per FH" },
  { label: "Per Departure", value: "per Departure" },
  { label: "Per Seat", value: "per seat" },
  { label: "Per Pax", value: "per pax" },
  { label: "Per Cargo capacity T", value: "per Cargo capacity T" },
  { label: "Per Cargo T", value: "per Cargo T" },
];

function buildCurrencyPairs(currencyCodes, reportingCurrency) {
  return currencyCodes.filter((code) => code !== reportingCurrency).map((code) => `${code}/${reportingCurrency}`);
}

function createFxRows(periodColumns, pairLabels, existingFxRates = []) {
  const rateLookup = new Map();
  existingFxRates.forEach((row) => {
    if (!row?.dateKey || !row?.pair) return;
    rateLookup.set(`${row.dateKey}::${row.pair}`, row.rate);
  });

  return (periodColumns || []).map((period) => {
    const dateKey = normalizeDateKey(period?.dateKey || period?.endDate || period?.date || "");
    const pairs = {};
    pairLabels.forEach((pair) => {
      const savedRate = rateLookup.get(`${dateKey}::${pair}`);
      pairs[pair] = formatFxRate(savedRate ?? "1.00");
    });

    return {
      key: period.key,
      dateKey,
      dateLabel: period.dateLabel,
      pairs,
    };
  });
}

function normalizeDateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).trim();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildFxDateColumns(flights = []) {
  const uniqueDates = [...new Set(
    (Array.isArray(flights) ? flights : [])
      .map((row) => normalizeDateKey(row?.date))
      .filter(Boolean)
  )].sort((a, b) => new Date(a) - new Date(b));

  return uniqueDates.map((dateKey) => ({
    key: dateKey,
    dateKey,
    dateLabel: formatPeriodDate(dateKey),
  }));
}

function formatFxRate(value) {
  const raw = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(raw)) return "1.00";
  return raw.toFixed(2);
}

function cnTableValue(row, period) {
  if (row.getValue) return row.getValue(period);
  const raw = period?.[row.key];
  if (raw === undefined || raw === null || raw === "") return "--";

  switch (row.format) {
    case "integer":
      return formatNumber(raw, 0);
    case "decimal1":
      return formatNumber(raw, 1);
    case "decimal2":
      return formatNumber(raw, 2);
    case "percent":
      return String(raw).includes("%") ? String(raw) : `${formatNumber(raw, 0)}%`;
    default:
      return String(raw);
  }
}

const OPERATIONAL_SECTIONS = [
  {
    title: "Traffic",
    icon: BarChart3,
    rows: [
      { label: "Destinations", key: "destinations" },
      { label: "Departures", key: "departures" },
      { label: "Seats", key: "seats" },
      { label: "Pax", key: "pax" },
      { label: "Pax SF", key: "paxSF", format: "percent" },
      { label: "Pax LF", key: "paxLF", format: "percent" },
    ],
  },
  {
    title: "Cargo",
    icon: Layers3,
    rows: [
      { label: "Cargo Ton Capacity", key: "cargoCapT", format: "decimal1" },
      { label: "Cargo Tons", key: "cargoT", format: "decimal1" },
      { label: "Cargo Tons / Cargo Ton Capacity", getValue: (p) => percentOf(p.cargoT, p.cargoCapT) },
      { label: "Cargo FTK / Cargo ATK", getValue: (p) => percentOf(p.sumOfcargoRtk, p.sumOfcargoAtk) },
    ],
  },
  {
    title: "Utilisation",
    icon: Gauge,
    rows: [
      { label: "BH", key: "bh", format: "integer" },
      { label: "FH", key: "fh", format: "integer" },
      { label: "Average Daily Utilisation", key: "adu", format: "decimal2" },
      { label: "Weighted stage length by GCD", getValue: (p) => ratio(p.sumOfGcd, p.departures, 2) },
      { label: "Weighted stage length by BH", getValue: (p) => ratio(p.bh, p.departures, 2) },
    ],
  },
  {
    title: "Connectivity",
    icon: NotebookText,
    rows: [
      { label: "Connecting Flights", key: "connectingFlights" },
      { label: "Seat cap behind flights", key: "seatCapBehindFlgts" },
      { label: "Seat cap beyond flights", key: "seatCapBeyondFlgts" },
      { label: "Cargo cap behind flights", key: "cargoCapBehindFlgts" },
      { label: "Cargo cap beyond flights", key: "cargoCapBeyondFlgts" },
    ],
  },
];

const FINANCE_SECTIONS = [
  {
    title: "Revenue",
    icon: CircleDollarSign,
    rows: [
      { label: "Pax revenue" },
      { label: "Cargo revenue" },
      { label: "Total revenue", emphasize: true },
    ],
  },
  {
    title: "Fuel",
    icon: Fuel,
    rows: [
      { label: "Total fuel cost", emphasize: true },
      { label: "Engine fuel cost" },
      { label: "APU fuel cost" },
    ],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    rows: [
      { label: "Total maintenance", emphasize: true },
      { label: "MR contributions" },
      { label: "Utilisation driven" },
      { label: "Calendar driven" },
      { label: "Sch. Mx. not cap" },
      { label: "Sch. Mx. Event 1" },
      { label: "MSN/ESN/APUN 1" },
      { label: "MSN/ESN/APUN 2" },
      { label: "Sch. Mx. Event 2" },
      { label: "MSN/ESN/APUN 1" },
    ],
  },
  {
    title: "Other DOC",
    icon: ShieldAlert,
    rows: [
      { label: "Transit maintenance" },
      { label: "Other maintenance" },
      { label: "Utilisation driven" },
      { label: "Calendar driven" },
      { label: "Rotable changes" },
      { label: "Crew total direct", emphasize: true },
      { label: "Allowances" },
      { label: "Layovers" },
      { label: "Positioning" },
      { label: "Airport cost" },
      { label: "Navigation cost" },
      { label: "Other DOC" },
      { label: "Total DOC", emphasize: true },
      { label: "Gross profit/loss", emphasize: true },
    ],
  },
];

const MultiSelectDropdown = ({ placeholder, options = [], value = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const safeOptions = Array.isArray(options) ? options : [];
  const selected = Array.isArray(value) ? value : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-dropdown-root='true']")) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt) => {
    const next = selected.some((item) => item.value === opt.value)
      ? selected.filter((item) => item.value !== opt.value)
      : [...selected, opt];
    onChange?.(next);
  };

  const labelText = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0].label : `${selected.length} selected`;

  return (
    <div className="relative w-full" data-dropdown-root="true">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
          isOpen
            ? "border-indigo-500 bg-white shadow-md shadow-indigo-500/10"
            : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-500"
        )}
      >
        <span className="truncate text-slate-700 dark:text-slate-200">{labelText}</span>
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {safeOptions.map((opt) => {
                const isSelected = selected.some((item) => item.value === opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border", isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-300 dark:border-slate-600")}>
                      {isSelected && <Check size={11} className="text-white" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SingleSelectDropdown = ({ placeholder, options = [], value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const safeOptions = Array.isArray(options) ? options : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-dropdown-root='true']")) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = safeOptions.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" data-dropdown-root="true">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
          isOpen
            ? "border-indigo-500 bg-white shadow-md shadow-indigo-500/10"
            : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-500"
        )}
      >
        <span className="truncate text-slate-700 dark:text-slate-200">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {safeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange?.(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    value === opt.value
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SmallStat = ({ label, value, accent = false }) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-3 shadow-sm",
      accent
        ? "border-indigo-200 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-500/10"
        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
    )}
  >
    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
    <div className="mt-0.5 rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300">
      <Icon size={18} />
    </div>
    <div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  </div>
);

const FxRateModal = ({
  open,
  onClose,
  currencyCodes,
  setCurrencyCodes,
  reportingCurrency,
  setReportingCurrency,
  fxRows,
  setFxRows,
  fxRowRefs,
  selectedFxDate,
  setSelectedFxDate,
  savedFxRates,
  setSavedFxRates,
  periodColumns,
}) => {
  const [currencyInput, setCurrencyInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const generatedPairs = useMemo(
    () => buildCurrencyPairs(currencyCodes, reportingCurrency),
    [currencyCodes, reportingCurrency]
  );

  const visibleFxRows = useMemo(() => {
    const selectedKey = normalizeDateKey(selectedFxDate);
    if (!selectedKey) return fxRows;
    return fxRows.filter((row) => normalizeDateKey(row.dateKey) === selectedKey);
  }, [fxRows, selectedFxDate]);

  useEffect(() => {
    if (!open) return;
    setFxRows(createFxRows(periodColumns, generatedPairs, savedFxRates));
  }, [open, generatedPairs, periodColumns, savedFxRates, setFxRows]);

  const addCurrency = () => {
    const code = normalizeCurrencyCode(currencyInput);
    if (!code) return;
    setCurrencyCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
    setCurrencyInput("");
  };

  const removeCurrency = (code) => {
    setCurrencyCodes((prev) => {
      const next = prev.filter((item) => item !== code);
      return next.length === 0 ? [reportingCurrency] : next;
    });
    if (code === reportingCurrency) {
      const fallback = currencyCodes.find((item) => item !== code) || DEFAULT_CURRENCIES[0];
      setReportingCurrency(fallback);
      setFxRows(createFxRows(periodColumns, buildCurrencyPairs(currencyCodes.filter((item) => item !== code), fallback), savedFxRates));
    }
  };

  const resetForReportingCurrency = (nextReportingCurrency) => {
    setReportingCurrency(nextReportingCurrency);
    setFxRows(createFxRows(periodColumns, buildCurrencyPairs(currencyCodes, nextReportingCurrency), savedFxRates));
  };

  const handleDateChange = (value) => {
    setSelectedFxDate(value);
    if (!value) return;
    const selectedKey = normalizeDateKey(value);
    const index = fxRows.findIndex((row) => normalizeDateKey(row.dateKey) === selectedKey);
    if (index >= 0) {
      fxRowRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const saveFxRates = async () => {
    const nextRates = visibleFxRows.flatMap((row) => Object.entries(row.pairs || {}).map(([pair, rate]) => ({
      pair,
      dateKey: row.dateKey,
      rate: Number(formatFxRate(rate)),
    })));
    const visibleDateKeys = new Set(visibleFxRows.map((row) => normalizeDateKey(row.dateKey)).filter(Boolean));
    const mergedRates = [
      ...(Array.isArray(savedFxRates) ? savedFxRates.filter((row) => !visibleDateKeys.has(normalizeDateKey(row.dateKey))) : []),
      ...nextRates,
    ];

    try {
      setSaving(true);
      await api.post("/revenue/config", {
        reportingCurrency,
        currencyCodes,
        fxRates: mergedRates,
      });
      setSavedFxRates(mergedRates);
      toast.success("FX rates saved");
    } catch (error) {
      console.error("Error saving FX rates:", error);
      toast.error("Failed to save FX rates");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[10000] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:border-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300">
              <ArrowRightLeft size={12} />
              FX rate setting
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-50">CCY pair setup</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Each non-reporting currency creates a CCY pair against the selected reporting currency. Changing the reporting currency resets all rates to 1.00.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Reporting currency</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {currencyCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => resetForReportingCurrency(code)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      reportingCurrency === code
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Enter currencies</div>
              <div className="mt-3 flex gap-2">
                <input
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCurrency();
                    }
                  }}
                  placeholder="USD"
                  className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button type="button" onClick={addCurrency} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-800">
                  <Plus size={16} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {currencyCodes.map((code, index) => (
                  <span key={code} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {code}
                    {index !== 0 && (
                      <button type="button" onClick={() => removeCurrency(code)} className="rounded-full p-0.5 text-slate-400 transition hover:text-rose-500">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-slate-50">Behavior</div>
              <ul className="mt-3 space-y-2">
                <li>Generated pairs use non-reporting currency / reporting currency.</li>
                <li>Changing the reporting currency resets all rates to 1.00.</li>
                <li>Each selected date stores its own FX rate set.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">per ASK</div>
              <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{reportingCurrency}</div>
              <button type="button" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500">
                FX rate setting
              </button>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                This setting becomes the reporting currency. Default is the first CCY entered.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Go to date</div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedFxDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-10 w-48 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button type="button" onClick={saveFxRates} disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70">
                    {saving ? "Saving..." : "Update"}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="sticky left-0 z-20 border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          Date
                        </th>
                        {generatedPairs.map((pair) => (
                          <th key={pair} className="border-b border-slate-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            {pair}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFxRows.map((row, rowIndex) => (
                        <tr
                          key={row.key}
                          ref={(node) => {
                            fxRowRefs.current[rowIndex] = node;
                          }}
                          className="hover:bg-cyan-50/40 dark:hover:bg-cyan-500/5"
                        >
                          <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            {row.dateLabel}
                          </td>
                          {generatedPairs.map((pair) => (
                            <td key={`${row.key}-${pair}`} className="border-b border-slate-200 px-2 py-2 dark:border-slate-800">
                              <input
                                type="text"
                                value={row.pairs[pair] ?? "1.00"}
                                onChange={(e) => {
                                  const next = [...fxRows];
                                  const sourceIndex = fxRows.findIndex((candidate) => candidate.key === row.key);
                                  if (sourceIndex < 0) return;
                                  next[sourceIndex] = {
                                    ...next[sourceIndex],
                                    pairs: {
                                      ...next[sourceIndex].pairs,
                                      [pair]: e.target.value,
                                    },
                                  };
                                  setFxRows(next);
                                }}
                                onBlur={(e) => {
                                  const next = [...fxRows];
                                  const sourceIndex = fxRows.findIndex((candidate) => candidate.key === row.key);
                                  if (sourceIndex < 0) return;
                                  next[sourceIndex] = {
                                    ...next[sourceIndex],
                                    pairs: {
                                      ...next[sourceIndex].pairs,
                                      [pair]: formatFxRate(e.target.value),
                                    },
                                  };
                                  setFxRows(next);
                                }}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {visibleFxRows.length === 0 && (
                <div className="border-b border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No FX row matches the selected date.
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                All FX rates are user editable. The selected date keeps its own saved currency-pair values.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

const RiskExposureModal = ({ open, onClose, exposureCurrency, setExposureCurrency, periodColumns }) => {
  const [seriesType, setSeriesType] = useState("EUR revenue & cost");

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const chartPoints = periodColumns.map((period, index) => ({
    label: period.dateLabel,
    revenue: 12 + index * 4,
    cost: 8 + index * 2,
  }));

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[10000] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldAlert size={12} />
              Risk exposures
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-50">Exposure chart scaffold</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Graphical output with MMM-YY in X axis and value on Y axis; scrollable across the entire date range of the master table.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Series</div>
              <button
                type="button"
                onClick={() => setSeriesType("EUR revenue & cost")}
                className="mt-3 inline-flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <span>{seriesType}</span>
                <ChevronDown size={15} />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-slate-50">Expected behavior</div>
              <ul className="mt-3 space-y-2">
                <li>For fuel requirement, the Y axis is the sum of engine and APU fuel consumption.</li>
                <li>For non-RCCY currencies, revenues display above the axis and costs below it.</li>
                <li>The chart area remains scrollable across the full master range.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-100">
              {exposureCurrency} revenue and cost
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {exposureCurrency}
              </div>
              <button
                type="button"
                onClick={() => setExposureCurrency("EUR")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                EUR revenue & cost
              </button>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Revenue and cost exposure per selected currency
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                Graphical output
              </div>
              <div className="overflow-x-auto p-4">
                <div className="min-w-[760px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-end gap-4">
                    {chartPoints.map((point) => (
                      <div key={point.label} className="flex w-28 flex-col items-center gap-3">
                        <div className="flex h-48 w-full items-end justify-center gap-2">
                          <div className="w-5 rounded-t-lg bg-emerald-500/80" style={{ height: `${point.revenue * 5}px` }} />
                          <div className="w-5 rounded-t-lg bg-rose-500/80" style={{ height: `${point.cost * 5}px` }} />
                        </div>
                        <div className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">{point.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                For non-RCCY currencies, two metrics are displayed on the same Y axis: revenue is displayed as a positive value and cost as a negative value.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent
  );
};

const DashboardTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedValues, setSelectedValues] = useState({
    label: "both",
    periodicity: "weekly",
  });

  const [filters, setFilters] = useState({
    flight: [],
    from: [],
    to: [],
    sector: [],
    variant: [],
    userTag1: [],
    userTag2: [],
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    flight: [],
    from: [],
    to: [],
    sector: [],
    variant: [],
    userTag1: [],
    userTag2: [],
  });

  const [showFxModal, setShowFxModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [currencyCodes, setCurrencyCodes] = useState(DEFAULT_CURRENCIES);
  const [reportingCurrency, setReportingCurrency] = useState(DEFAULT_CURRENCIES[0]);
  const [fxBasis, setFxBasis] = useState("per ASK");
  const [fxRows, setFxRows] = useState([]);
  const [fxDateColumns, setFxDateColumns] = useState([]);
  const [savedFxRates, setSavedFxRates] = useState([]);
  const [selectedFxDate, setSelectedFxDate] = useState("");
  const fxRowRefs = useRef([]);
  const [exposureCurrency, setExposureCurrency] = useState("EUR");

  const singleSelectLabelOptions = [
    { label: "Dom", value: "dom" },
    { label: "INTL", value: "intl" },
    { label: "Both", value: "both" },
  ];

  const singleSelectPeriodicityOptions = [
    { label: "Annually", value: "annually" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Monthly", value: "monthly" },
    { label: "Weekly", value: "weekly" },
    { label: "Daily", value: "daily" },
  ];

  useEffect(() => {
    const getDropdownData = async () => {
      try {
        const response = await api.get("/dashboard/populateDropDowns");
        if (response.data && typeof response.data === "object") {
          setDropdownOptions({
            flight: Array.isArray(response.data.flight) ? response.data.flight : [],
            from: Array.isArray(response.data.from) ? response.data.from : [],
            to: Array.isArray(response.data.to) ? response.data.to : [],
            sector: Array.isArray(response.data.sector) ? response.data.sector : [],
            variant: Array.isArray(response.data.variant) ? response.data.variant : [],
            userTag1: Array.isArray(response.data.userTag1) ? response.data.userTag1 : [],
            userTag2: Array.isArray(response.data.userTag2) ? response.data.userTag2 : [],
          });
        }
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
      }
    };

    getDropdownData();
  }, []);

  useEffect(() => {
    const loadRevenueConfig = async () => {
      try {
        const response = await api.get("/revenue/config");
        const config = response.data?.data || {};
        const savedCurrencyCodes = Array.isArray(config.currencyCodes) ? config.currencyCodes : [];
        const nextCurrencyCodes = [...new Set([...DEFAULT_CURRENCIES, ...savedCurrencyCodes])];
        const nextReportingCurrency = config.reportingCurrency || DEFAULT_CURRENCIES[0];
        const nextFxRates = Array.isArray(config.fxRates) ? config.fxRates : [];

        setCurrencyCodes(nextCurrencyCodes);
        setReportingCurrency(nextReportingCurrency);
        setSavedFxRates(nextFxRates);
      } catch (error) {
        console.error("Error loading revenue config:", error);
      }
    };

    loadRevenueConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadFxDates = async () => {
      try {
        const response = await api.get("/flight", { params: { page: 1, limit: 100000 } });
        const flights = Array.isArray(response.data?.data) ? response.data.data : [];
        setFxDateColumns(buildFxDateColumns(flights));
      } catch (error) {
        console.error("Error loading flight dates for FX grid:", error);
        setFxDateColumns([]);
      }
    };

    loadFxDates();
  }, []);

  const serializedFilters = useMemo(() => {
    const params = {
      label: selectedValues.label,
      periodicity: selectedValues.periodicity,
    };

    Object.entries(filters).forEach(([key, values]) => {
      params[key] = (values || []).map((item) => item.value);
    });

    return params;
  }, [filters, selectedValues]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dashboard", { params: serializedFilters });
      const payload = Array.isArray(response.data) ? response.data : Array.isArray(response.data?.data) ? response.data.data : [];
      setData(payload);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedFilters]);

  const periodColumns = useMemo(() => {
    return data.map((period, index) => ({
      key: `${index}-${period?.endDate || "period"}`,
      label: `Period ${index + 1}`,
      dateLabel: formatPeriodDate(period?.endDate),
      data: period,
    }));
  }, [data]);

  const loadingOverlay =
    loading && typeof document !== "undefined"
      ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className="animate-spin text-indigo-500" size={18} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Loading dashboard...</span>
          </div>
        </div>,
        document.body
      )
      : null;

  useEffect(() => {
    if (!fxDateColumns.length) return;
    setFxRows(createFxRows(fxDateColumns, buildCurrencyPairs(currencyCodes, reportingCurrency), savedFxRates));
  }, [currencyCodes, fxDateColumns, reportingCurrency, savedFxRates]);

  const operationalSections = useMemo(() => OPERATIONAL_SECTIONS, []);
  const financeSections = useMemo(() => FINANCE_SECTIONS, []);

  const transformOperationalRows = () => {
    const rows = [
      ["Dashboard"],
      ["Label", selectedValues.label],
      ["Periodicity", selectedValues.periodicity],
      [""],
      ["Flight #", (filters.flight || []).map((item) => item.value).join(", ") || "-"],
      ["Dep Stn", (filters.from || []).map((item) => item.value).join(", ") || "-"],
      ["Arr Stn", (filters.to || []).map((item) => item.value).join(", ") || "-"],
      ["Sector", (filters.sector || []).map((item) => item.value).join(", ") || "-"],
      ["Variant", (filters.variant || []).map((item) => item.value).join(", ") || "-"],
      ["User Tag 1", (filters.userTag1 || []).map((item) => item.value).join(", ") || "-"],
      ["User Tag 2", (filters.userTag2 || []).map((item) => item.value).join(", ") || "-"],
      [""],
      ["Period", ...periodColumns.map((period) => period.label)],
      ["Date", ...periodColumns.map((period) => period.dateLabel)],
    ];

    operationalSections.forEach((section) => {
      rows.push([section.title]);
      section.rows.forEach((row) => {
        rows.push([row.label, ...periodColumns.map((period) => cnTableValue(row, period.data))]);
      });
      rows.push([""]);
    });

    return rows;
  };

  const transformFinanceRows = () => {
    const rows = [
      ["Financial Segment"],
      ["Reporting CCY", reportingCurrency],
      ["FX basis", fxBasis],
      [""],
      ["Row", ...periodColumns.map((period) => period.label)],
    ];

    financeSections.forEach((section) => {
      rows.push([section.title]);
      section.rows.forEach((row) => {
        rows.push([row.label, ...periodColumns.map(() => "0.00")]);
      });
      rows.push([""]);
    });

    return rows;
  };

  const transformFxRows = () => {
    const rows = [["FX Rate Settings"], ["Reporting Currency", reportingCurrency], [""]];
    rows.push(["Date", ...buildCurrencyPairs(currencyCodes, reportingCurrency)]);
    fxRows.forEach((row) => {
      rows.push([row.dateLabel, ...Object.values(row.pairs)]);
    });
    return rows;
  };

  const transformRiskRows = () => {
    return [
      ["Risk Exposures"],
      ["Currency", exposureCurrency],
      ["Series", "EUR revenue & cost"],
      ["Guidance", "Graphical output with MMM-YY in X axis and value on Y axis"],
    ];
  };

  const downloadDashboardTable = () => {
    if (!data || data.length === 0) {
      toast.warn("No data to download");
      return;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transformOperationalRows()), "Dashboard View");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transformFinanceRows()), "Finance");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transformFxRows()), "FX Rates");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transformRiskRows()), "Risk Notes");
    XLSX.writeFile(wb, "dashboard_redesign.xlsx");
  };

  return (
    <div className="min-h-full w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 md:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[2200px] flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
              <SlidersHorizontal size={12} />
              Dashboard Filters
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadDashboardTable}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-transform hover:scale-[1.02]"
            >
              <Download size={15} />
              Download Dashboard
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.7fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SingleSelectDropdown
                placeholder="Label"
                options={singleSelectLabelOptions}
                value={selectedValues.label}
                onChange={(value) => setSelectedValues((prev) => ({ ...prev, label: value }))}
              />
              <SingleSelectDropdown
                placeholder="Periodicity"
                options={singleSelectPeriodicityOptions}
                value={selectedValues.periodicity}
                onChange={(value) => setSelectedValues((prev) => ({ ...prev, periodicity: value }))}
              />


            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MultiSelectDropdown
                placeholder="Dep Stn"
                options={dropdownOptions.from}
                value={filters.from}
                onChange={(value) => setFilters((prev) => ({ ...prev, from: value }))}
              />
              <MultiSelectDropdown
                placeholder="Arr Stn"
                options={dropdownOptions.to}
                value={filters.to}
                onChange={(value) => setFilters((prev) => ({ ...prev, to: value }))}
              />
              <MultiSelectDropdown
                placeholder="Sector"
                options={dropdownOptions.sector}
                value={filters.sector}
                onChange={(value) => setFilters((prev) => ({ ...prev, sector: value }))}
              />
              <MultiSelectDropdown
                placeholder="Variant"
                options={dropdownOptions.variant}
                value={filters.variant}
                onChange={(value) => setFilters((prev) => ({ ...prev, variant: value }))}
              />
              <MultiSelectDropdown
                placeholder="Flight #"
                options={dropdownOptions.flight}
                value={filters.flight}
                onChange={(value) => setFilters((prev) => ({ ...prev, flight: value }))}
              />
              <MultiSelectDropdown
                placeholder="User Tag 1"
                options={dropdownOptions.userTag1}
                value={filters.userTag1}
                onChange={(value) => setFilters((prev) => ({ ...prev, userTag1: value }))}
              />
              <MultiSelectDropdown
                placeholder="User Tag 2"
                options={dropdownOptions.userTag2}
                value={filters.userTag2}
                onChange={(value) => setFilters((prev) => ({ ...prev, userTag2: value }))}
              />
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Select one or more values in each filter.
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            <div className="space-y-3">
              <SmallStat label="Periods" value={data.length || 0} />
              <SmallStat label="Selected label" value={selectedValues.label.toUpperCase()} accent />
              <SmallStat label="Selected periodicity" value={selectedValues.periodicity.toUpperCase()} />
            </div>

            <button
              type="button"
              onClick={() => setShowRiskModal(true)}
              className="mt-4 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Risk exposures
              <ChevronRight size={16} />
            </button>
          </aside>
        </div>



        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/85 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-950/40">
                  <th className="sticky left-0 z-20 w-[340px] min-w-[340px] max-w-[340px] border-b border-r border-slate-200 bg-slate-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
                    Metric
                  </th>
                  {periodColumns.map((period, index) => (
                    <th
                      key={period.key}
                      className={cn(
                        "w-[140px] min-w-[140px] max-w-[140px] border-b border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200",
                        index === 0 && "bg-indigo-50/70 dark:bg-indigo-500/10"
                      )}
                    >
                      <div className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-200">{period.dateLabel}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {operationalSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <React.Fragment key={section.title}>
                      <tr className="bg-slate-100/70 dark:bg-slate-950/50">
                        <td colSpan={periodColumns.length + 1} className="sticky left-0 z-10 w-[340px] border-b border-slate-200 bg-slate-100/90 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-50">
                          <span className="inline-flex items-center gap-2">
                            <Icon size={15} className="text-indigo-600 dark:text-indigo-300" />
                            {section.title}
                          </span>
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr key={`${section.title}-${row.label}`} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5">
                          <td className="sticky left-0 z-20 w-[340px] min-w-[340px] max-w-[340px] border-b border-r border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                            {row.label}
                          </td>
                          {periodColumns.map((period, index) => (
                            <td
                              key={`${row.label}-${period.key}`}
                              className={cn(
                                "w-[140px] min-w-[140px] max-w-[140px] border-b border-slate-200 px-3 py-3 text-center text-sm tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-300",
                                index === 0 && "bg-indigo-50/70 dark:bg-indigo-500/10"
                              )}
                            >
                              <span className={cn(row.emphasize && "font-semibold text-slate-900 dark:text-slate-50")}>
                                {cnTableValue(row, period.data)}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                <tr className="bg-slate-100/70 dark:bg-slate-950/50">
                  <td colSpan={periodColumns.length + 1} className="sticky left-0 z-10 w-[340px] border-b border-slate-200 bg-slate-100/90 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-50">
                    <span className="inline-flex items-center gap-2">
                      <CircleDollarSign size={15} className="text-indigo-600 dark:text-indigo-300" />
                      Financial segment
                    </span>
                  </td>
                </tr>
                <tr className="bg-slate-50/80 dark:bg-slate-950/30">
                  <td colSpan={periodColumns.length + 1} className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowFxModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                      >
                        FX rate setting
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRiskModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-500/10 dark:text-sky-300"
                      >
                        Risk exposures
                      </button>
                      <div className="w-[220px] min-w-[220px]">
                        <SingleSelectDropdown
                          placeholder="per ASK"
                          options={FX_BASIS_OPTIONS}
                          value={fxBasis}
                          onChange={setFxBasis}
                        />
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">CCY</span>
                        <span>{reportingCurrency}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                {financeSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <React.Fragment key={section.title}>
                      <tr className="bg-slate-100/50 dark:bg-slate-950/40">
                        <td colSpan={periodColumns.length + 1} className="sticky left-0 z-10 w-[340px] border-b border-slate-200 bg-slate-50/90 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
                          <span className="inline-flex items-center gap-2">
                            <Icon size={15} className="text-indigo-600 dark:text-indigo-300" />
                            {section.title}
                          </span>
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr key={row.label} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5">
                          <td className={cn("sticky left-0 z-20 w-[340px] min-w-[340px] max-w-[340px] border-b border-r border-slate-200 bg-white px-4 py-3 text-sm shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900", row.emphasize ? "font-semibold text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200")}>
                            {row.label}
                          </td>
                          {periodColumns.map((period, index) => (
                            <td
                              key={`${row.label}-${period.key}`}
                              className={cn(
                                "w-[140px] min-w-[140px] max-w-[140px] border-b border-slate-200 px-3 py-3 text-center text-sm tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-300",
                                index === 0 && "bg-indigo-50/70 dark:bg-indigo-500/10"
                              )}
                            >
                              <span className={cn(row.emphasize && "font-semibold text-slate-900 dark:text-slate-50")}>0.00</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {loadingOverlay}

      <FxRateModal
        open={showFxModal}
        onClose={() => setShowFxModal(false)}
        currencyCodes={currencyCodes}
        setCurrencyCodes={setCurrencyCodes}
        reportingCurrency={reportingCurrency}
        setReportingCurrency={setReportingCurrency}
        fxBasis={fxBasis}
        setFxBasis={setFxBasis}
        fxRows={fxRows}
        setFxRows={setFxRows}
        fxRowRefs={fxRowRefs}
        selectedFxDate={selectedFxDate}
        setSelectedFxDate={setSelectedFxDate}
        savedFxRates={savedFxRates}
        setSavedFxRates={setSavedFxRates}
        periodColumns={fxDateColumns}
      />

      <RiskExposureModal
        open={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        exposureCurrency={exposureCurrency}
        setExposureCurrency={setExposureCurrency}
        periodColumns={periodColumns}
      />
    </div>
  );
};

export default DashboardTable;
