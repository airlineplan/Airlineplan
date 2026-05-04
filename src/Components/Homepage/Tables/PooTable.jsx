import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CalendarPlus2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  X,
  LayoutDashboard,
  Calculator,
  Layers,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../../../apiConfig";
import { groupPooRecordsIntoSections } from "./pooSummary";

// --- UTILITIES ---

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const blankTransitDraft = {
  firstFlightNumber: "",
  secondFlightNumber: "",
  pax: "0",
  cargoT: "0",
  odFare: "0",
  odRate: "0",
  fareProrateRatioL1L2: "0",
  rateProrateRatioL1L2: "0",
  applySSPricing: false,
  interline: "",
  codeshare: "",
};

const GRID_COLUMNS = [
  { key: "sNo", label: "S.No", width: "w-20", align: "right" },
  { key: "al", label: "AL", width: "w-24" },
  { key: "poo", label: "POO", width: "w-24" },
  { key: "od", label: "OD", width: "w-32" },
  { key: "odDI", label: "OD D/I", width: "w-24", align: "center" },
  { key: "stop", label: "Stop", width: "w-24", align: "center" },
  { key: "sector", label: "Sector", width: "w-32" },
  { key: "legDI", label: "Leg D/I", width: "w-24", align: "center" },
  { key: "date", label: "Date", width: "w-28" },
  { key: "day", label: "Day", width: "w-20" },
  { key: "flightNumber", label: "Flight #", width: "w-28" },
  { key: "maxPax", label: "Max Pax", width: "w-28", align: "right" },
  { key: "maxCargoT", label: "Max Cargo T", width: "w-32", align: "right" },
  { key: "pax", label: "Pax", width: "w-24", align: "right", editable: true, green: true },
  { key: "cargoT", label: "Cargo T", width: "w-28", align: "right", editable: true, green: true },
];

const NUMERIC_TOTAL_FIELDS = ["maxPax", "maxCargoT", "pax", "cargoT"];
const NUMERIC_AVG_FIELDS = [];

const OD_TABLE_COLUMNS = [
  { key: "od", label: "OD" },
  { key: "odDI", label: "Dom / INTL" },
  { key: "flightNumber", label: "Flight" },
  { key: "stop", label: "Stop" },
  { key: "totalGcd", label: "Total GCD", numeric: true },
  { key: "timeInclLayover", label: "Time incl LyOv" },
  { key: "maxPax", label: "Max pax", numeric: true },
  { key: "maxCargoT", label: "Max Cargo T", numeric: true },
  { key: "pax", label: "Pax", numeric: true },
  { key: "cargoT", label: "Cargo", numeric: true },
  { key: "fare", label: "Fare (/pax)", numeric: true },
  { key: "rate", label: "Rate (/Kg)", numeric: true },
  { key: "paxRevenue", label: "Pax revenue", numeric: true },
  { key: "cargoRevenue", label: "Cargo revenue", numeric: true },
  { key: "totalRevenue", label: "Total revenue", numeric: true },
];

const INTERLINE_TABLE_COLUMNS = [
  { key: "od", label: "OD" },
  { key: "odDI", label: "OD D/I" },
  { key: "sector", label: "Sector" },
  { key: "legDI", label: "Sector D/I" },
  { key: "flightNumber", label: "Flight" },
  { key: "interlineCodeshare", label: "IntLn / CdS" },
  { key: "oal", label: "OAL" },
  { key: "transferStation", label: "Transfer Stn" },
  { key: "pax", label: "Pax", numeric: true },
  { key: "cargoT", label: "Cargo", numeric: true },
  { key: "fare", label: "Prorate Fare", numeric: true },
  { key: "rate", label: "Prorate Rate", numeric: true },
  { key: "paxRevenue", label: "Pax revenue", numeric: true },
  { key: "cargoRevenue", label: "Cargo revenue", numeric: true },
  { key: "totalRevenue", label: "Total revenue", numeric: true },
];

function formatNumber(value, maxFractionDigits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: maxFractionDigits === 0 ? 0 : 0,
  }).format(numeric);
}

function formatSheetDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function numericValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getFlightText(row) {
  if (Array.isArray(row.flightList) && row.flightList.length) return row.flightList.join(", ");
  return row.flightNumber || row.connectedFlightNumber || "";
}

function getRowValue(row, key) {
  switch (key) {
    case "sNo": return row.sNo || "";
    case "al": return row.al || "";
    case "poo": return row.poo || "";
    case "od": return row.od || "";
    case "odDI": return row.odDI || "";
    case "stop": return row.displayStop ?? row.stops ?? 0;
    case "sector": return row.sector || "";
    case "legDI": return row.legDI || "";
    case "date": return formatSheetDate(row.date);
    case "day": return row.day || "";
    case "flightNumber": return row.flightNumber || getFlightText(row);
    case "maxPax": return row.maxPax || 0;
    case "maxCargoT": return row.maxCargoT || 0;
    case "pax": return row.pax || 0;
    case "cargoT": return row.cargoT || 0;
    default: return "";
  }
}

function getPooTableValue(row, key) {
  switch (key) {
    case "flightNumber": return getFlightText(row);
    case "stop": return row.displayStop ?? row.stops ?? 0;
    case "totalGcd": return row.totalGcd ?? row.odViaGcd ?? row.sectorGcd ?? 0;
    case "fare": return row.trafficType === "leg" ? row.legFare : row.odFare;
    case "rate": return row.trafficType === "leg" ? row.legRate : row.odRate;
    case "paxRevenue": return row.paxRevenue ?? row.odPaxRev ?? row.legPaxRev ?? 0;
    case "cargoRevenue": return row.cargoRevenue ?? row.odCargoRev ?? row.legCargoRev ?? 0;
    case "totalRevenue": return row.totalRevenue ?? row.odTotalRev ?? row.legTotalRev ?? 0;
    case "interlineCodeshare": return row.interline || row.codeshare || "";
    case "oal": return row.al !== "Own" ? row.al : "";
    case "transferStation": return row.displayStop || "";
    default: return getRowValue(row, key) || row[key] || "";
  }
}

function normalizeFilterValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "").toLowerCase();
}

function comparePooValues(a, b, direction) {
  const aNumber = Number(a);
  const bNumber = Number(b);
  const bothNumeric = Number.isFinite(aNumber) && Number.isFinite(bNumber);

  if (bothNumeric) {
    return direction === "Up" ? aNumber - bNumber : bNumber - aNumber;
  }

  const comparison = String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return direction === "Up" ? comparison : -comparison;
}

function getEditableField(row, key) {
  if (key === "fare") return row.trafficType === "leg" ? "legFare" : "odFare";
  if (key === "rate") return row.trafficType === "leg" ? "legRate" : "odRate";
  return key;
}

function canSelectRow(row) {
  return Number(row.stops || 0) >= 1 || String(row.displayType || "").startsWith("Transit");
}

function getApplyCellKey(rowId, group) {
  return `${rowId}:${group}`;
}

function getApplyFields(row, group) {
  if (group === "paxFare") return ["pax", getEditableField(row, "fare")];
  if (group === "cargoRate") return ["cargoT", getEditableField(row, "rate")];
  return [];
}

function createApplyRecord(row, existing = {}) {
  return {
    _id: row._id,
    pax: row.pax ?? 0,
    cargoT: row.cargoT ?? 0,
    [getEditableField(row, "fare")]: row[getEditableField(row, "fare")] ?? 0,
    [getEditableField(row, "rate")]: row[getEditableField(row, "rate")] ?? 0,
    ...existing,
  };
}

function createSectionSummary(rows) {
  const count = rows.length || 1;
  return GRID_COLUMNS.reduce((acc, column) => {
    if (NUMERIC_TOTAL_FIELDS.includes(column.key)) {
      acc[column.key] = rows.reduce((sum, row) => sum + numericValue(getRowValue(row, column.key)), 0);
    } else if (NUMERIC_AVG_FIELDS.includes(column.key)) {
      acc[column.key] = rows.reduce((sum, row) => sum + numericValue(getRowValue(row, column.key)), 0) / count;
    }
    return acc;
  }, {});
}

function createOdSelectionSummary(rows) {
  const summary = {
    maxPax: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "maxPax")), 0),
    maxCargoT: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "maxCargoT")), 0),
    pax: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "pax")), 0),
    cargoT: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "cargoT")), 0),
    paxRevenue: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "paxRevenue")), 0),
    cargoRevenue: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "cargoRevenue")), 0),
    totalRevenue: rows.reduce((sum, row) => sum + numericValue(getPooTableValue(row, "totalRevenue")), 0),
  };

  summary.fare = summary.pax > 0 ? summary.paxRevenue / summary.pax : 0;
  summary.rate = summary.cargoT > 0 ? summary.cargoRevenue / summary.cargoT : 0;

  return summary;
}

function buildErrorLookup(errors = []) {
  const map = new Map();
  errors.forEach((issue) => {
    if (!issue?.field) return;
    if (issue.rowId) map.set(`id:${issue.rowId}:${issue.field}`, issue.message);
    if (issue.rowKey) map.set(`key:${issue.rowKey}:${issue.field}`, issue.message);
  });
  return map;
}

// --- COMPONENT ---

const PooTable = () => {
  const [selectedPoos, setSelectedPoos] = useState([]);
  const [pooSelectionReady, setPooSelectionReady] = useState(false);
  const [isPooDropdownOpen, setIsPooDropdownOpen] = useState(false);
  const [date, setDate] = useState("");
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ stationCurrency: "", reportingCurrency: "" });
  const [stationsData, setStationsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirtyMap, setDirtyMap] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilters, setTableFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });
  const [applyDateDrafts, setApplyDateDrafts] = useState({});
  const [applyDateTargets, setApplyDateTargets] = useState({});
  const [transitDraft, setTransitDraft] = useState(blankTransitDraft);
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const requestSeqRef = useRef(0);
  const pooDropdownRef = useRef(null);

  useEffect(() => {
    const loadStations = async () => {
      try {
        const response = await api.get("/get-stationData");
        const stations = Array.isArray(response.data?.data) ? response.data.data : [];
        setStationsData(stations);
      } catch (error) {
        console.error("Failed to load station data for POO dropdown", error);
        setStationsData([]);
      }
    };

    loadStations();
  }, []);

  const stationOptions = useMemo(() => {
    const names = stationsData
      .map((station) => String(station.stationName || "").trim().toUpperCase())
      .filter(Boolean);

    const selectedNames = selectedPoos
      .map((station) => String(station || "").trim().toUpperCase())
      .filter(Boolean);

    return [...new Set([...names, ...selectedNames])].sort((a, b) => a.localeCompare(b));
  }, [stationsData, selectedPoos]);

  useEffect(() => {
    if (pooSelectionReady || stationOptions.length === 0) return;
    setSelectedPoos(stationOptions);
    setPooSelectionReady(true);
  }, [pooSelectionReady, stationOptions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!pooDropdownRef.current?.contains(event.target)) {
        setIsPooDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPooSet = useMemo(() => new Set(selectedPoos), [selectedPoos]);
  const allPoosSelected = stationOptions.length > 0 && selectedPoos.length === stationOptions.length;
  const selectedPooLabel = allPoosSelected
    ? "ALL POO"
    : selectedPoos.length > 0
      ? selectedPoos.join(", ")
      : "Select POO";
  const fetchPooParam = selectedPoos.length === 1 && !allPoosSelected ? selectedPoos[0] : "";

  const toggleAllPoos = () => {
    setPooSelectionReady(true);
    setSelectedPoos((prev) => (prev.length === stationOptions.length ? [] : stationOptions));
  };

  const togglePooOption = (station) => {
    setPooSelectionReady(true);
    setSelectedPoos((prev) => {
      const current = new Set(prev);
      if (current.has(station)) current.delete(station);
      else current.add(station);
      return stationOptions.filter((option) => current.has(option));
    });
  };

  const applyLoadedRows = useCallback((payload) => {
    setRecords(Array.isArray(payload?.data) ? payload.data : []);
    setMeta(payload?.meta || { stationCurrency: "", reportingCurrency: "" });
    setDirtyMap({});
    setValidationErrors([]);
    setApplyDateDrafts({});
    setApplyDateTargets({});
    setSelectedRowIds(new Set());
  }, []);

  const fetchData = useCallback(async ({ populateIfEmpty = false } = {}) => {
    if (!date) return;
    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    setLoading(true);
    try {
      const response = await api.get("/poo", {
        params: {
          ...(fetchPooParam ? { poo: fetchPooParam } : {}),
          date,
        },
      });
      if (requestSeqRef.current !== requestId) return;

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      if (populateIfEmpty && fetchPooParam && rows.length === 0) {
        const populateResponse = await api.post("/poo/populate", { poo: fetchPooParam, date });
        if (requestSeqRef.current !== requestId) return;
        applyLoadedRows({
          data: populateResponse.data?.data || [],
          meta: response.data?.meta,
        });
        return;
      }

      applyLoadedRows(response.data || {});
    } catch (error) {
      console.error(error);
      toast.error("Failed to load POO traffic allocation");
    } finally {
      if (requestSeqRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [applyLoadedRows, fetchPooParam, date]);

  useEffect(() => {
    if (date) fetchData({ populateIfEmpty: Boolean(fetchPooParam) });
  }, [fetchData, date, fetchPooParam]);

  const refreshAllocation = async () => {
    if (!date) {
      toast.warn("Choose a date or date range first");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/poo/populate", {
        ...(fetchPooParam ? { poo: fetchPooParam } : {}),
        date,
      });
      toast.success(response.data.message || "POO allocation refreshed");
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to refresh POO allocation");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (rowId, field, value) => {
    setRecords((prev) =>
      prev.map((row) =>
        row._id === rowId ? { ...row, [field]: value } : row
      )
    );

    setDirtyMap((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        _id: rowId,
        [field]: value,
      },
    }));
  };

  const addApplyDate = (row, group) => {
    const key = getApplyCellKey(row._id, group);
    const targetDate = applyDateDrafts[key];
    if (!targetDate) return;
    setApplyDateTargets((prev) => ({
      ...prev,
      [key]: {
        sourceId: row._id,
        group,
        fields: getApplyFields(row, group),
        dates: [...new Set([...(prev[key]?.dates || []), targetDate])].sort(),
      },
    }));
    setApplyDateDrafts((prev) => ({ ...prev, [key]: "" }));
  };

  const removeApplyDate = (rowId, group, targetDate) => {
    const key = getApplyCellKey(rowId, group);
    setApplyDateTargets((prev) => {
      const dates = (prev[key]?.dates || []).filter((item) => item !== targetDate);
      if (!dates.length) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...prev[key], dates } };
    });
  };

  const handleSave = async () => {
    const applyTargets = Object.values(applyDateTargets).filter((target) => target.dates?.length);
    const applySourceIds = new Set(applyTargets.map((target) => String(target.sourceId)));
    const recordsById = new Map(Object.values(dirtyMap).map((record) => [String(record._id), record]));

    records.forEach((row) => {
      if (applySourceIds.has(String(row._id)) && !recordsById.has(String(row._id))) {
        recordsById.set(String(row._id), createApplyRecord(row));
      }
    });

    const payload = [...recordsById.values()].map((record) => {
      const row = records.find((item) => String(item._id) === String(record._id));
      return row ? createApplyRecord(row, record) : record;
    });

    if (!payload.length) {
      toast.info("No POO changes to save");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/poo/update", { records: payload, applyTargets });
      setValidationErrors([]);
      toast.success(response.data.message || "POO traffic allocation saved");
      if (response.data.appliedDates?.length) {
        toast.info(`Applied to ${response.data.appliedDates.length} matching date(s)`);
      }
      if (response.data.skippedDates?.length) {
        toast.warn(`Skipped ${response.data.skippedDates.length} date(s)`);
      }
      await fetchData();
    } catch (error) {
      console.error(error);
      const issues = error.response?.data?.errors || [];
      setValidationErrors(issues);
      toast.error(error.response?.data?.message || "Failed to save POO allocation");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransit = async () => {
    if (selectedPoos.length !== 1 || allPoosSelected || !date) {
      toast.warn("Choose exactly one POO station and date first");
      return;
    }
    if (!transitDraft.firstFlightNumber || !transitDraft.secondFlightNumber) {
      toast.warn("Enter both transit flight numbers");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/poo/transit", { ...transitDraft, poo: selectedPoos[0], date });
      setTransitDraft(blankTransitDraft);
      setValidationErrors([]);
      toast.success(response.data.message || "Transit OD created");
      await fetchData();
    } catch (error) {
      console.error(error);
      const issues = error.response?.data?.errors || [];
      setValidationErrors(issues);
      toast.error(error.response?.data?.message || "Failed to create transit OD");
    } finally {
      setSaving(false);
    }
  };

  const errorLookup = useMemo(() => buildErrorLookup(validationErrors), [validationErrors]);

  const visibleRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const activeFilters = Object.entries(tableFilters).filter(([, value]) => String(value || "").trim());
    const shouldFilterPoo = selectedPoos.length > 0 && !allPoosSelected;

    const filtered = records.filter((row) => {
      if (shouldFilterPoo && !selectedPooSet.has(String(row.poo || "").trim().toUpperCase())) {
        return false;
      }

      const matchesSearch = !query || [
        row.al, row.poo, row.od, row.sector, row.flightNumber,
        row.variant, row.identifier, row.odDI, row.legDI, row.day,
        formatSheetDate(row.date),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      if (!matchesSearch) return false;

      return activeFilters.every(([key, value]) =>
        normalizeFilterValue(getPooTableValue(row, key)).includes(String(value).trim().toLowerCase())
      );
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) =>
      comparePooValues(
        getPooTableValue(a, sortConfig.key),
        getPooTableValue(b, sortConfig.key),
        sortConfig.direction
      )
    );
  }, [records, searchTerm, sortConfig, tableFilters, selectedPoos, selectedPooSet, allPoosSelected]);

  const sections = useMemo(() => {
    return groupPooRecordsIntoSections(visibleRows, "");
  }, [visibleRows]);

  const selectedOdRows = useMemo(() => {
    return [...sections.legs, ...sections.ods].filter((row) => selectedRowIds.has(row._id));
  }, [sections, selectedRowIds]);

  const odSelectionSummary = useMemo(() => {
    return createOdSelectionSummary(selectedOdRows);
  }, [selectedOdRows]);

  const toggleSelectedRow = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleTableFilterChange = (key, value) => {
    setTableFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up",
    }));
  };

  const totalDirtyRows = Object.keys(dirtyMap).length;
  const totalApplyTargets = Object.values(applyDateTargets).reduce((sum, target) => sum + (target.dates?.length || 0), 0);

  const renderCellError = (row, field) => {
    if (!row || !field) return "";
    const rowIds = [row._id, ...(row.sourceRowIds || [])].filter(Boolean);
    for (const rowId of rowIds) {
      const message = errorLookup.get(`id:${rowId}:${field}`);
      if (message) return message;
    }
    const rowKeys = [row.rowKey, ...(row.sourceRowKeys || [])].filter(Boolean);
    for (const rowKey of rowKeys) {
      const message = errorLookup.get(`key:${rowKey}:${field}`);
      if (message) return message;
    }
    return "";
  };

  const getInputClass = (row, field) => cn(
    inputStyle,
    renderCellError(row, field) && "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-100"
  );

  // Helper styles
  const thStyle = "sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur p-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700 whitespace-nowrap text-center";
  const thSubStyle = "bg-slate-50/90 dark:bg-slate-800/80 p-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700 whitespace-nowrap text-center";
  const tdStyle = "p-2 border-b border-r border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors group-hover:bg-indigo-50/50 dark:group-hover:bg-slate-800/30";
  const tdInputWrap = "p-0.5 border-b border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-900/10 group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/30 transition-colors";
  const inputStyle = "h-7 w-full border border-transparent rounded bg-transparent px-1.5 text-right text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/50";
  const filterInputStyle = "h-7 w-full min-w-[90px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUp size={12} className="opacity-20" />;
    return sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const renderFilterSortHeaderRows = (columns, { leadingLabel = "✓", summaryCells = [] } = {}) => {
    const hasLeadingColumn = leadingLabel !== null;
    return (
      <>
        <tr>
          {hasLeadingColumn && <th className={cn(thSubStyle, "w-10")}></th>}
          {columns.map((column) => (
            <th key={`${column.key}-filter`} className={thSubStyle}>
              {column.filterable === false ? (
                <div className="h-7" />
              ) : (
                <input
                  value={tableFilters[column.key] || ""}
                  onChange={(e) => handleTableFilterChange(column.key, e.target.value)}
                  placeholder="Filter..."
                  className={filterInputStyle}
                />
              )}
            </th>
          ))}
        </tr>
        <tr>
          {hasLeadingColumn && <th className={cn(thStyle, "w-10")}>{leadingLabel}</th>}
          {columns.map((column) => (
            <th key={`${column.key}-head`} className={thStyle}>
              {column.sortable === false ? (
                column.label
              ) : (
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                  className="mx-auto flex items-center justify-center gap-1 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {column.label}
                  {renderSortIcon(column.key)}
                </button>
              )}
            </th>
          ))}
        </tr>
        {summaryCells.length > 0 && (
          <tr>
            {hasLeadingColumn && <th className={thSubStyle}></th>}
            <th className={cn(thSubStyle, "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold")}>Selected</th>
            {summaryCells.map((label, index) => (
              <th key={`${label}-${index}`} className={cn(thSubStyle, "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold")}>{label}</th>
            ))}
          </tr>
        )}
      </>
    );
  };

  const renderOdSelectedSummaryRows = () => {
    const hasSelection = selectedOdRows.length > 0;
    const summaryLabelByKey = {
      maxPax: "Total",
      maxCargoT: "Total",
      pax: "Total",
      cargoT: "Total",
      fare: "Wght Avg",
      rate: "Wght Avg",
      paxRevenue: "Total",
      cargoRevenue: "Total",
      totalRevenue: "Total",
    };

    return (
      <>
        <tr>
          <th className={thSubStyle}></th>
          {OD_TABLE_COLUMNS.map((column) => (
            <th
              key={`${column.key}-selected-label`}
              className={cn(
                thSubStyle,
                summaryLabelByKey[column.key] && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold"
              )}
            >
              {summaryLabelByKey[column.key] || ""}
            </th>
          ))}
        </tr>
        <tr>
          <th className={cn(thSubStyle, "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold")}>
            {hasSelection ? selectedOdRows.length : ""}
          </th>
          {OD_TABLE_COLUMNS.map((column) => {
            const value = odSelectionSummary[column.key];
            const showValue = hasSelection && value !== undefined;
            const wholeNumber = column.key === "maxPax" || column.key === "pax";
            return (
              <th
                key={`${column.key}-selected-value`}
                className={cn(
                  thSubStyle,
                  summaryLabelByKey[column.key] && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-extrabold"
                )}
              >
                {showValue ? formatNumber(value, wholeNumber ? 0 : 2) : ""}
              </th>
            );
          })}
        </tr>
      </>
    );
  };

  const renderApplyDateCell = (row, group) => {
    const key = getApplyCellKey(row._id, group);
    const dates = applyDateTargets[key]?.dates || [];
    return (
      <div className="flex min-h-[32px] w-full flex-col gap-1 py-1">
        <div className="flex items-center justify-center gap-1.5">
          <input
            type="date"
            value={applyDateDrafts[key] || ""}
            onChange={(e) => setApplyDateDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
            className="h-7 w-[110px] rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => addApplyDate(row, group)}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-800"
            title="Add apply date"
          >
            <CalendarPlus2 size={14} />
          </button>
        </div>
        {dates.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            {dates.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => removeApplyDate(row._id, group, item)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700 transition hover:bg-rose-100 hover:text-rose-700 hover:border-rose-200"
                title="Remove apply date"
              >
                {item} <X size={10} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSheetCell = (row, column, isSummary = false, summaryValues = {}) => {
    const baseClass = cn(
      "border-b border-r border-slate-200 dark:border-slate-700 px-2 text-sm text-slate-700 dark:text-slate-300 transition-colors group-hover:bg-indigo-50/50 dark:group-hover:bg-slate-800/30",
      column.width,
      column.align === "right" && "text-right",
      column.align === "center" && "text-center",
      column.green && "bg-emerald-50/40 dark:bg-emerald-900/10 group-hover:bg-emerald-100/50",
      isSummary && "bg-indigo-50 dark:bg-indigo-900/20 font-bold text-indigo-700 dark:text-indigo-300"
    );

    if (column.key === "checkbox") {
      if (isSummary) return <td key={column.key} className={baseClass}>Sel</td>;
      const selectable = canSelectRow(row);
      return (
        <td key={column.key} className={cn(baseClass, "bg-emerald-50/40 dark:bg-emerald-900/10")}>
          {selectable && (
            <input
              type="checkbox"
              checked={selectedRowIds.has(row._id)}
              onChange={() => toggleSelectedRow(row._id)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          )}
        </td>
      );
    }

    if (!isSummary && (column.key === "loadFare" || column.key === "loadRate")) {
      return (
        <td key={column.key} className={baseClass}>
          {renderApplyDateCell(row, column.key === "loadFare" ? "paxFare" : "cargoRate")}
        </td>
      );
    }

    if (isSummary) {
      const value = summaryValues[column.key];
      const isAverage = NUMERIC_AVG_FIELDS.includes(column.key);
      return (
        <td key={column.key} className={baseClass}>
          {value === undefined ? "" : formatNumber(value, column.key === "pax" || column.key === "maxPax" ? 0 : isAverage ? 2 : 2)}
        </td>
      );
    }

    if (column.editable) {
      const field = getEditableField(row, column.key);
      const error = renderCellError(row, field);
      return (
        <td key={column.key} className={cn(baseClass, "p-0.5")}>
          <input
            type="number"
            step={column.key === "pax" ? "1" : "0.01"}
            min="0"
            value={row[field] ?? ""}
            title={error}
            onChange={(e) => updateField(row._id, field, e.target.value)}
            className={cn(
              inputStyle,
              error && "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-100"
            )}
          />
        </td>
      );
    }

    const value = getRowValue(row, column.key);
    const numericColumn = NUMERIC_TOTAL_FIELDS.includes(column.key) || NUMERIC_AVG_FIELDS.includes(column.key);
    return (
      <td key={column.key} className={baseClass}>
        {numericColumn ? formatNumber(value, column.key === "pax" || column.key === "maxPax" ? 0 : 2) : value}
      </td>
    );
  };

  const renderSheetSection = (section) => {
    const sectionSummary = createSectionSummary(section.rows);
    const emptyRows = Math.max(0, 1 - section.rows.length);

    return (
      <div key={section.title} className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Layers size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{section.title}</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr>
                {GRID_COLUMNS.map((column) => (
                  <th key={`${section.title}-${column.key}-filter`} className={thSubStyle}>
                    <input
                      value={tableFilters[column.key] || ""}
                      onChange={(e) => handleTableFilterChange(column.key, e.target.value)}
                      placeholder="Filter..."
                      className={filterInputStyle}
                    />
                  </th>
                ))}
              </tr>
              <tr>
                {GRID_COLUMNS.map((column) => (
                  <th key={`${section.title}-${column.key}-head`} className={thStyle}>
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="mx-auto flex items-center justify-center gap-1 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {column.label}
                      {renderSortIcon(column.key)}
                    </button>
                  </th>
                ))}
              </tr>
              <tr>
                {GRID_COLUMNS.map((column) => (
                  <th key={`${section.title}-${column.key}-sub`} className={thSubStyle}>
                    {column.key === "checkbox" && section.kind !== "od" ? "Checkbox" : column.subLabel || ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                {GRID_COLUMNS.map((column) => renderSheetCell(null, column, true, sectionSummary))}
              </tr>
              {section.rows.map((row) => (
                <tr key={row._id} className={cn("group", selectedRowIds.has(row._id) && "bg-indigo-50/80 dark:bg-indigo-900/20")}>
                  {GRID_COLUMNS.map((column) => renderSheetCell(row, column))}
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, index) => (
                <tr key={`${section.title}-blank-${index}`}>
                  {GRID_COLUMNS.map((column) => (
                    <td key={`${section.title}-blank-${index}-${column.key}`} className={cn("h-9 border-b border-r border-slate-200 dark:border-slate-700", column.green && "bg-emerald-50/20 dark:bg-emerald-900/5")} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)] bg-slate-50 dark:bg-slate-950">

      {/* --- TOP PANELS --- */}
      <div className="flex flex-col xl:flex-row gap-6 relative z-50">

        {/* Filters */}
        <div className="w-full xl:w-[60%] p-5 rounded-xl border-2 border-emerald-400/40 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm relative">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <LayoutDashboard size={14} /> Allocation Filters
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">POO</label>
              <div className="relative" ref={pooDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPooDropdownOpen((prev) => !prev)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium flex items-center justify-between gap-2"
                  aria-haspopup="listbox"
                  aria-expanded={isPooDropdownOpen}
                >
                  <span className="truncate">{selectedPooLabel}</span>
                  <ChevronDown size={15} className={cn("shrink-0 text-slate-400 transition-transform", isPooDropdownOpen && "rotate-180")} />
                </button>
                {isPooDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1"
                    role="listbox"
                    aria-multiselectable="true"
                  >
                    <button
                      type="button"
                      onClick={toggleAllPoos}
                      className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <span className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center",
                        allPoosSelected
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950"
                      )}>
                        {allPoosSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span>ALL POO</span>
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    {stationOptions.map((station) => {
                      const checked = selectedPooSet.has(station);
                      return (
                        <button
                          key={station}
                          type="button"
                          onClick={() => togglePooOption(station)}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                          role="option"
                          aria-selected={checked}
                        >
                          <span className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center",
                            checked
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950"
                          )}>
                            {checked && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span>{station}</span>
                        </button>
                      );
                    })}
                    {stationOptions.length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-400">No POO options</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Search Grid</label>
              <div className="flex items-center h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                <Search size={14} className="text-slate-400 mr-2" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="OD, flight..."
                  className="w-full bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={refreshAllocation}
                disabled={loading || saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                onClick={handleSave}
                disabled={loading || saving || (totalDirtyRows === 0 && totalApplyTargets === 0)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-200">{visibleRows.length}</span> rows
              <span className="mx-1 opacity-40">|</span>
              <span className="text-amber-600 dark:text-amber-400">{totalDirtyRows}</span> pending
              <span className="mx-1 opacity-40">|</span>
              <span className="text-indigo-600 dark:text-indigo-400">{totalApplyTargets}</span> targets
            </div>
          </div>
        </div>

        {/* Stats & Transit */}
        <div className="w-full xl:w-[40%] p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 shadow-sm relative flex flex-col justify-between">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Calculator size={14} /> Summary & Transits
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            <div className="flex flex-col p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <span className="text-[10px] text-slate-400 font-bold uppercase">POO CCY</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{meta.stationCurrency || "--"}</span>
            </div>

          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
            <input value={transitDraft.firstFlightNumber} onChange={(e) => setTransitDraft((prev) => ({ ...prev, firstFlightNumber: e.target.value }))} placeholder="First FLGT" className="h-8 w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium outline-none focus:border-indigo-500" />
            <input value={transitDraft.secondFlightNumber} onChange={(e) => setTransitDraft((prev) => ({ ...prev, secondFlightNumber: e.target.value }))} placeholder="Second FLGT" className="h-8 w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium outline-none focus:border-indigo-500" />
            <button
              onClick={handleCreateTransit}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              <PlusCircle size={14} /> Add Transit
            </button>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="relative z-40 p-4 border border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-900/20 backdrop-blur rounded-xl text-sm text-rose-700 dark:text-rose-200 shadow-sm flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5 text-rose-500" size={18} />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-800 dark:text-rose-300">Validation Issues</h4>
            {validationErrors.map((issue, index) => (
              <div key={`${issue.rowId}-${issue.field}-${index}`} className="text-xs opacity-90">{issue.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* --- TABLE AREA --- */}
      <div className="relative z-10 flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm">
            <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading POO rows...</span>
          </div>
        )}
        <div className="flex-1 overflow-auto custom-scrollbar p-5">
          {selectedPoos.length > 0 ? (
            <div className="space-y-8">

              {/* --- OD PAIRS TABLE --- */}
              <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Leg traffic & connecting traffic</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      {renderFilterSortHeaderRows(OD_TABLE_COLUMNS)}
                      {renderOdSelectedSummaryRows()}
                    </thead>
                    <tbody>
                      {sections.legs.length > 0 && (
                        <tr>
                          <td colSpan={OD_TABLE_COLUMNS.length + 1} className="px-3 py-2 bg-indigo-50/70 dark:bg-indigo-900/20 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            Legs
                          </td>
                        </tr>
                      )}
                      {/* Legs */}
                      {sections.legs.map((row) => (
                        <React.Fragment key={row._id || row.od}>
                          <tr className={cn("group", selectedRowIds.has(row._id) && "bg-indigo-50/80 dark:bg-indigo-900/20")}>
                            <td className={cn(tdStyle, "text-center")}>
                              <input
                                type="checkbox"
                                checked={selectedRowIds.has(row._id)}
                                onChange={() => toggleSelectedRow(row._id)}
                                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className={cn(tdStyle, "font-bold text-slate-800 dark:text-slate-100")}>{row.od}</td>
                            <td className={cn(tdStyle, "text-center")}>{row.odDI}</td>
                            <td className={cn(tdStyle, "text-center")}>{(row.flightList || [row.flightNumber]).join(", ")}</td>
                            <td className={cn(tdStyle, "text-center")}>0</td>
                            <td className={cn(tdStyle, "text-right")}>{formatNumber(row.totalGcd || row.sectorGcd, 0)}</td>
                            <td className={cn(tdStyle, "text-center")}>{row.timeInclLayover || "--"}</td>
                            <td className={cn(tdStyle, "text-right")}>{formatNumber(row.maxPax, 0)}</td>
                            <td className={cn(tdStyle, "text-right")}>{formatNumber(row.maxCargoT)}</td>
                            <td className={tdInputWrap}>
                              <input type="number" min="0" step="1" value={row.pax ?? ""} title={renderCellError(row, "pax")} onChange={(e) => updateField(row._id, "pax", e.target.value)} className={getInputClass(row, "pax")} />
                            </td>
                            <td className={tdInputWrap}>
                              <input type="number" min="0" step="0.01" value={row.cargoT ?? ""} title={renderCellError(row, "cargoT")} onChange={(e) => updateField(row._id, "cargoT", e.target.value)} className={getInputClass(row, "cargoT")} />
                            </td>
                            <td className={tdInputWrap}>
                              <input type="number" min="0" step="0.01" value={row.legFare ?? ""} title={renderCellError(row, "legFare")} onChange={(e) => updateField(row._id, "legFare", e.target.value)} className={getInputClass(row, "legFare")} />
                            </td>
                            <td className={tdInputWrap}>
                              <input type="number" min="0" step="0.01" value={row.legRate ?? ""} title={renderCellError(row, "legRate")} onChange={(e) => updateField(row._id, "legRate", e.target.value)} className={getInputClass(row, "legRate")} />
                            </td>
                            <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.legPaxRev)}</td>
                            <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.legCargoRev)}</td>
                            <td className={cn(tdStyle, "text-right font-bold text-emerald-600 dark:text-emerald-400")}>{formatNumber(row.legTotalRev)}</td>
                          </tr>
                          {/* Empties */}
                          {[0, 0, 0].map((_, i) => (
                            <tr key={`${row._id}-blank-${i}`}>
                              {Array.from({ length: OD_TABLE_COLUMNS.length + 1 }).map((__, j) => <td key={j} className="h-8 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10"></td>)}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {/* Divider */}
                      {sections.ods.length > 0 && (
                        <tr>
                          <td colSpan={OD_TABLE_COLUMNS.length + 1} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            ODs
                          </td>
                        </tr>
                      )}
                      {/* ODs */}
                      {sections.ods.map((row) => (
                        <tr key={row._id} className={cn("group", selectedRowIds.has(row._id) && "bg-indigo-50/80 dark:bg-indigo-900/20")}>
                          <td className={cn(tdStyle, "text-center")}>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(row._id)}
                              onChange={() => toggleSelectedRow(row._id)}
                              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className={cn(tdStyle, "font-bold text-slate-800 dark:text-slate-100")}>{row.od}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.odDI}</td>
                          <td className={cn(tdStyle, "text-center")}>{(row.flightList || []).join(", ")}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.displayStop}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.totalGcd || row.odViaGcd, 0)}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.timeInclLayover || "--"}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.maxPax, 0)}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.maxCargoT)}</td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="1" value={row.pax ?? ""} title={renderCellError(row, "pax")} onChange={(e) => updateField(row._id, "pax", e.target.value)} className={getInputClass(row, "pax")} />
                          </td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="0.01" value={row.cargoT ?? ""} title={renderCellError(row, "cargoT")} onChange={(e) => updateField(row._id, "cargoT", e.target.value)} className={getInputClass(row, "cargoT")} />
                          </td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="0.01" value={row.odFare ?? ""} title={renderCellError(row, "odFare")} onChange={(e) => updateField(row._id, "odFare", e.target.value)} className={getInputClass(row, "odFare")} />
                          </td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="0.01" value={row.odRate ?? ""} title={renderCellError(row, "odRate")} onChange={(e) => updateField(row._id, "odRate", e.target.value)} className={getInputClass(row, "odRate")} />
                          </td>
                          <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.paxRevenue || row.odPaxRev)}</td>
                          <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.cargoRevenue || row.odCargoRev)}</td>
                          <td className={cn(tdStyle, "text-right font-bold text-emerald-600 dark:text-emerald-400")}>{formatNumber(row.totalRevenue || row.odTotalRev)}</td>
                        </tr>
                      ))}
                      {sections.legs.length === 0 && sections.ods.length === 0 && (
                        <tr>
                          {Array.from({ length: OD_TABLE_COLUMNS.length + 1 }).map((_, i) => (
                            <td key={i} className="h-10 border-b border-r border-slate-200 dark:border-slate-700"></td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- TRANSITS TABLE --- */}
              <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Transit traffic (same ACFT)</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      {renderFilterSortHeaderRows(OD_TABLE_COLUMNS)}
                    </thead>
                    <tbody>
                      {sections.transits.length === 0 ? (
                        <tr>{Array.from({ length: OD_TABLE_COLUMNS.length + 1 }).map((_, i) => <td key={i} className="h-10 border-b border-r border-slate-200 dark:border-slate-700"></td>)}</tr>
                      ) : sections.transits.map((row) => (
                        <tr key={row._id} className="group">
                          <td className={cn(tdStyle, "text-center")}><input type="checkbox" className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></td>
                          <td className={cn(tdStyle, "font-bold text-slate-800 dark:text-slate-100")}>{row.od}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.odDI}</td>
                          <td className={tdStyle}>{(row.flightList || []).join(", ")}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.displayStop}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.totalGcd || row.odViaGcd, 0)}</td>
                          <td className={tdStyle}>{row.timeInclLayover || "--"}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.maxPax, 0)}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.maxCargoT)}</td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="1" value={row.pax ?? ""} title={renderCellError(row, "pax")} onChange={(e) => updateField(row._id, "pax", e.target.value)} className={getInputClass(row, "pax")} />
                          </td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="0.01" value={row.cargoT ?? ""} title={renderCellError(row, "cargoT")} onChange={(e) => updateField(row._id, "cargoT", e.target.value)} className={getInputClass(row, "cargoT")} />
                          </td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="0.01" value={row.odFare ?? ""} title={renderCellError(row, "odFare")} onChange={(e) => updateField(row._id, "odFare", e.target.value)} className={getInputClass(row, "odFare")} />
                          </td>
                          <td className={tdInputWrap}>
                            <input type="number" min="0" step="0.01" value={row.odRate ?? ""} title={renderCellError(row, "odRate")} onChange={(e) => updateField(row._id, "odRate", e.target.value)} className={getInputClass(row, "odRate")} />
                          </td>
                          <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.odPaxRev)}</td>
                          <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.odCargoRev)}</td>
                          <td className={cn(tdStyle, "text-right font-bold text-emerald-600 dark:text-emerald-400")}>{formatNumber(row.odTotalRev)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- INTERLINE & CODESHARE TABLE --- */}
              <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Interline and Codeshare</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      {renderFilterSortHeaderRows(INTERLINE_TABLE_COLUMNS)}
                    </thead>
                    <tbody>
                      {sections.interlines.length === 0 ? (
                        <tr>{Array.from({ length: INTERLINE_TABLE_COLUMNS.length + 1 }).map((_, i) => <td key={i} className="h-10 border-b border-r border-slate-200 dark:border-slate-700"></td>)}</tr>
                      ) : sections.interlines.map((row) => (
                        <tr key={row._id} className="group">
                          <td className={cn(tdStyle, "text-center")}><input type="checkbox" className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></td>
                          <td className={cn(tdStyle, "font-bold text-slate-800 dark:text-slate-100")}>{row.od}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.odDI}</td>
                          <td className={tdStyle}>{row.sector}</td>
                          <td className={cn(tdStyle, "text-center")}>{row.legDI}</td>
                          <td className={tdStyle}>{row.flightNumber}</td>
                          <td className={tdStyle}>{row.interline || row.codeshare || ""}</td>
                          <td className={tdStyle}>{row.al !== "Own" ? row.al : ""}</td>
                          <td className={tdStyle}>{row.displayStop || ""}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.pax, 0)}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.cargoT)}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.odFare)}</td>
                          <td className={cn(tdStyle, "text-right")}>{formatNumber(row.odRate)}</td>
                          <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.odPaxRev)}</td>
                          <td className={cn(tdStyle, "text-right font-medium")}>{formatNumber(row.odCargoRev)}</td>
                          <td className={cn(tdStyle, "text-right font-bold text-emerald-600 dark:text-emerald-400")}>{formatNumber(row.odTotalRev)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            renderSheetSection({ title: "OD", kind: "raw", rows: [] })
          )}
        </div>
      </div>
    </div>
  );
};

export default PooTable;
