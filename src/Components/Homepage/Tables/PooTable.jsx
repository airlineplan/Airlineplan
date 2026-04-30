import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CalendarPlus2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../../../apiConfig";
import { groupPooRecordsIntoSections } from "./pooSummary";

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
  { key: "identifier", label: "Identifier", width: "w-32" },
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

const NUMERIC_TOTAL_FIELDS = [
  "maxPax",
  "maxCargoT",
  "pax",
  "cargoT",
];

const NUMERIC_AVG_FIELDS = [];

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
    case "sNo":
      return row.sNo || "";
    case "al":
      return row.al || "";
    case "poo":
      return row.poo || "";
    case "od":
      return row.od || "";
    case "odDI":
      return row.odDI || "";
    case "stop":
      return row.displayStop ?? row.stops ?? 0;
    case "identifier":
      return row.identifier || row.displayType || "";
    case "sector":
      return row.sector || "";
    case "legDI":
      return row.legDI || "";
    case "date":
      return formatSheetDate(row.date);
    case "day":
      return row.day || "";
    case "flightNumber":
      return row.flightNumber || getFlightText(row);
    case "maxPax":
      return row.maxPax || 0;
    case "maxCargoT":
      return row.maxCargoT || 0;
    case "pax":
      return row.pax || 0;
    case "cargoT":
      return row.cargoT || 0;
    default:
      return "";
  }
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

function buildErrorLookup(errors = []) {
  const map = new Map();
  errors.forEach((issue) => {
    if (!issue?.rowId || !issue?.field) return;
    map.set(`${issue.rowId}:${issue.field}`, issue.message);
  });
  return map;
}

const PooTable = () => {
  const [poo, setPoo] = useState("");
  const [date, setDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ stationCurrency: "", reportingCurrency: "" });
  const [stationsData, setStationsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirtyMap, setDirtyMap] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [applyDateDrafts, setApplyDateDrafts] = useState({});
  const [applyDateTargets, setApplyDateTargets] = useState({});
  const [transitDraft, setTransitDraft] = useState(blankTransitDraft);
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

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

    const uniqueNames = [...new Set(names)].sort((a, b) => a.localeCompare(b));

    if (poo && !uniqueNames.includes(poo.trim().toUpperCase())) {
      uniqueNames.unshift(poo.trim().toUpperCase());
    }

    return uniqueNames;
  }, [stationsData, poo]);

  const fetchData = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const response = await api.get("/poo", {
        params: {
          ...(poo ? { poo } : {}),
          dateFrom: date,
          dateTo: dateTo || date,
        },
      });
      setRecords(response.data.data || []);
      setMeta(response.data.meta || { stationCurrency: "", reportingCurrency: "" });
      setDirtyMap({});
      setValidationErrors([]);
      setApplyDateDrafts({});
      setApplyDateTargets({});
      setSelectedRowIds(new Set());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load POO traffic allocation");
    } finally {
      setLoading(false);
    }
  }, [poo, date, dateTo]);

  useEffect(() => {
    if (date) fetchData();
  }, [fetchData, date]);

  const refreshAllocation = async () => {
    if (!date) {
      toast.warn("Choose a date or date range first");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/poo/populate", {
        ...(poo ? { poo } : {}),
        dateFrom: date,
        dateTo: dateTo || date,
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
        row._id === rowId
          ? {
            ...row,
            [field]: value,
          }
          : row
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
      const response = await api.post("/poo/update", {
        records: payload,
        applyTargets,
      });
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
    if (!poo || !date) {
      toast.warn("Choose a POO station and date first");
      return;
    }
    if (!transitDraft.firstFlightNumber || !transitDraft.secondFlightNumber) {
      toast.warn("Enter both transit flight numbers");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/poo/update", {
        transitDraft: {
          ...transitDraft,
          poo,
          date,
        },
      });
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
    return records.filter((row) => {
      if (!query) return true;
      return [
        row.al,
        row.poo,
        row.od,
        row.sector,
        row.flightNumber,
        row.variant,
        row.identifier,
        row.odDI,
        row.legDI,
        row.day,
        formatSheetDate(row.date),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [records, searchTerm]);

  const summary = useMemo(() => {
    return visibleRows.reduce((acc, row) => ({
      pax: acc.pax + Number(row.pax || 0),
      cargoT: acc.cargoT + Number(row.cargoT || 0),
      odTotalRev: acc.odTotalRev + Number(row.odTotalRev || 0),
      fnlRccyTotalRev: acc.fnlRccyTotalRev + Number(row.fnlRccyTotalRev || 0),
    }), { pax: 0, cargoT: 0, odTotalRev: 0, fnlRccyTotalRev: 0 });
  }, [visibleRows]);

  const sections = useMemo(() => {
    return groupPooRecordsIntoSections(visibleRows, poo);
  }, [visibleRows, poo]);

  const toggleSelectedRow = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const getSelectedRowsForSection = (rows) => rows.filter((row) => selectedRowIds.has(row._id));

  const totalDirtyRows = Object.keys(dirtyMap).length;
  const totalApplyTargets = Object.values(applyDateTargets).reduce((sum, target) => sum + (target.dates?.length || 0), 0);

  const renderCellError = (rowId, field) => errorLookup.get(`${rowId}:${field}`) || "";

  const renderApplyDateCell = (row, group) => {
    const key = getApplyCellKey(row._id, group);
    const dates = applyDateTargets[key]?.dates || [];
    return (
      <div className="flex min-h-8 w-full flex-col gap-1 py-1">
        <div className="flex items-center justify-center gap-1">
          <input
            type="date"
            value={applyDateDrafts[key] || ""}
            onChange={(e) => setApplyDateDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
            className="h-7 w-28 border border-emerald-300 bg-white px-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-emerald-800 dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={() => addApplyDate(row, group)}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200"
            title="Add apply date"
            aria-label="Add apply date"
          >
            <CalendarPlus2 size={14} />
          </button>
        </div>
        {dates.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {dates.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => removeApplyDate(row._id, group, item)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-slate-950 dark:text-emerald-100 dark:ring-emerald-800"
                title="Remove apply date"
              >
                {item}
                <X size={10} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSheetCell = (row, column, isSummary = false, summaryValues = {}) => {
    const baseClass = cn(
      "border border-slate-300 px-2 text-sm leading-tight text-slate-900 dark:border-slate-700 dark:text-slate-100",
      column.width,
      column.align === "right" && "text-right",
      column.align === "center" && "text-center",
      column.green && "bg-emerald-100/80 dark:bg-emerald-900/30",
      isSummary && "bg-fuchsia-100 font-semibold dark:bg-fuchsia-950/50"
    );

    if (column.key === "checkbox") {
      if (isSummary) return <td key={column.key} className={baseClass}>Selected</td>;
      const selectable = canSelectRow(row);
      return (
        <td key={column.key} className={cn(baseClass, "bg-emerald-100/80 dark:bg-emerald-900/30")}>
          {selectable && (
            <input
              type="checkbox"
              checked={selectedRowIds.has(row._id)}
              onChange={() => toggleSelectedRow(row._id)}
              className="h-4 w-4 accent-emerald-600"
              aria-label={`Select ${row.od || "POO row"}`}
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
      const error = renderCellError(row._id, field);
      return (
        <td key={column.key} className={baseClass}>
          <input
            type="number"
            step={column.key === "pax" ? "1" : "0.01"}
            min="0"
            value={row[field] ?? ""}
            title={error}
            onChange={(e) => updateField(row._id, field, e.target.value)}
            className={cn(
              "h-7 w-full border-0 bg-transparent px-1 text-right text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:focus:bg-slate-950",
              error && "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100"
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
      <div key={section.title} className="min-w-max">
        <div className="h-10 border-x border-t border-slate-300 bg-white px-4 pt-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {section.title}
        </div>
        <table className="border-collapse bg-white text-sm dark:bg-slate-950">
          <thead>
            <tr>
              {GRID_COLUMNS.map((column, index) => (
                <th
                  key={`${section.title}-${column.key}-filter`}
                  className={cn(
                    "h-7 border border-slate-300 bg-white px-2 text-center text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300",
                    column.width,
                    index === 0 && "text-left"
                  )}
                >
                  {index === 2 ? "Filter" : index > 2 ? "Filter + Sort" : ""}
                </th>
              ))}
            </tr>
            <tr>
              {GRID_COLUMNS.map((column) => (
                <th
                  key={`${section.title}-${column.key}-head`}
                  className={cn(
                    "h-8 border border-slate-300 bg-white px-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
                    column.width,
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
            <tr>
              {GRID_COLUMNS.map((column) => (
                <th
                  key={`${section.title}-${column.key}-sub`}
                  className={cn(
                    "h-7 border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
                    column.width,
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.key === "checkbox" && "text-left"
                  )}
                >
                  {column.key === "checkbox" && section.kind !== "od" ? "Checkbox" : column.subLabel || ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {GRID_COLUMNS.map((column) => renderSheetCell(null, column, true, sectionSummary))}
            </tr>
            {section.rows.map((row) => (
              <tr key={row._id} className={cn(selectedRowIds.has(row._id) && "outline outline-2 outline-fuchsia-400/70")}>
                {GRID_COLUMNS.map((column) => renderSheetCell(row, column))}
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, index) => (
              <tr key={`${section.title}-blank-${index}`}>
                {GRID_COLUMNS.map((column) => (
                  <td
                    key={`${section.title}-blank-${index}-${column.key}`}
                    className={cn(
                      "h-8 border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-950",
                      column.width,
                      column.green && "bg-emerald-100/80 dark:bg-emerald-900/30"
                    )}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">POO</label>
            <select
              value={poo}
              onChange={(e) => setPoo(e.target.value.toUpperCase())}
              className="h-10 w-32 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All POO</option>
              {stationOptions.length === 0 ? (
                null
              ) : (
                stationOptions.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date From</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date To</label>
            <input
              type="date"
              value={dateTo}
              min={date || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="OD, flight, sector"
                className="w-48 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <button
            onClick={refreshAllocation}
            disabled={loading || saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || (totalDirtyRows === 0 && totalApplyTargets === 0)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {visibleRows.length} row(s) · {totalDirtyRows} pending · {totalApplyTargets} date target(s)
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="text-slate-500">POO CCY</span> <strong>{meta.stationCurrency || "--"}</strong>
            </div>
            <div className="border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="text-slate-500">RCCY</span> <strong>{meta.reportingCurrency || "--"}</strong>
            </div>
            <div className="border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="text-slate-500">Pax total</span> <strong>{formatNumber(summary.pax, 0)}</strong>
            </div>
            <div className="border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="text-slate-500">Final RCCY</span> <strong>{formatNumber(summary.fnlRccyTotalRev)}</strong>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={transitDraft.firstFlightNumber} onChange={(e) => setTransitDraft((prev) => ({ ...prev, firstFlightNumber: e.target.value }))} placeholder="First flight" className="h-9 w-28 border border-slate-300 bg-white px-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" />
            <input value={transitDraft.secondFlightNumber} onChange={(e) => setTransitDraft((prev) => ({ ...prev, secondFlightNumber: e.target.value }))} placeholder="Second flight" className="h-9 w-28 border border-slate-300 bg-white px-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" />
            <button
              onClick={handleCreateTransit}
              disabled={saving || loading}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusCircle size={15} />
              Add Transit
            </button>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200">
            {validationErrors.map((issue, index) => (
              <div key={`${issue.rowId}-${issue.field}-${index}`}>{issue.message}</div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!loading && visibleRows.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center border border-dashed border-slate-300 bg-white text-center dark:border-slate-700 dark:bg-slate-900/30">
            <div className="space-y-2 px-6">
              <div className="text-lg font-semibold">No POO traffic rows</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Choose a date range, refresh allocation, or adjust your search.
              </div>
            </div>
          </div>
        ) : (
          <div className="inline-block border-2 border-slate-900 bg-white p-0 dark:border-slate-500 dark:bg-slate-950">
            {renderSheetSection({ title: "Raw POO entries", kind: "raw", rows: visibleRows })}
          </div>
        )}
      </div>
    </div>
  );

};

export default PooTable;
