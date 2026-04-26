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

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TYPE_STYLES = {
  Leg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Behind: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Beyond: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "Transit FL": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "Transit SL": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};

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

function formatNumber(value, maxFractionDigits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: maxFractionDigits === 0 ? 0 : 0,
  }).format(numeric);
}

function formatDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function inputBaseClass({ align = "right", invalid = false, readOnly = false } = {}) {
  return cn(
    "rounded-md border px-2 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/20",
    align === "right" ? "text-right" : "text-left",
    invalid
      ? "border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100"
      : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
    readOnly && "cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
  );
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
  const [poo, setPoo] = useState("DEL");
  const [date, setDate] = useState("");
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ stationCurrency: "", reportingCurrency: "" });
  const [stationsData, setStationsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirtyMap, setDirtyMap] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [applyDates, setApplyDates] = useState([]);
  const [pendingApplyDate, setPendingApplyDate] = useState("");
  const [transitDraft, setTransitDraft] = useState(blankTransitDraft);

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
    if (!poo || !date) return;
    setLoading(true);
    try {
      const response = await api.get("/poo", { params: { poo, date } });
      setRecords(response.data.data || []);
      setMeta(response.data.meta || { stationCurrency: "", reportingCurrency: "" });
      setDirtyMap({});
      setValidationErrors([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load POO traffic allocation");
    } finally {
      setLoading(false);
    }
  }, [poo, date]);

  useEffect(() => {
    if (poo && date) fetchData();
  }, [fetchData, poo, date]);

  const refreshAllocation = async () => {
    if (!poo || !date) {
      toast.warn("Choose a POO station and date first");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/poo/populate", { poo, date });
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

  const addApplyDate = () => {
    if (!pendingApplyDate) return;
    setApplyDates((prev) => [...new Set([...prev, pendingApplyDate])].sort());
    setPendingApplyDate("");
  };

  const removeApplyDate = (target) => {
    setApplyDates((prev) => prev.filter((item) => item !== target));
  };

  const handleSave = async () => {
    const payload = Object.values(dirtyMap);
    if (!payload.length) {
      toast.info("No POO changes to save");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/poo/update", {
        records: payload,
        applyToDates: applyDates,
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
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [records, searchTerm]);

  const sections = useMemo(() => {
    const legRows = visibleRows.filter((row) => row.displayType === "Leg");
    const odRows = visibleRows.filter((row) => row.displayType === "Behind" || row.displayType === "Beyond");
    const transitRows = visibleRows.filter((row) => row.displayType?.startsWith("Transit"));
    const usedIds = new Set([...legRows, ...odRows, ...transitRows].map((row) => row._id));
    const external = visibleRows.filter((row) => (row.interline || row.codeshare) && !usedIds.has(row._id));
    return [
      { title: "Leg Data", subtitle: "Flight-level rows for the selected POO", rows: legRows },
      { title: "OD Data", subtitle: "OD pairs related to the selected POO", rows: odRows },
      { title: "Transits (Same Aircraft)", subtitle: "Transit rows created for this POO", rows: transitRows },
      { title: "Interline / Codeshare", subtitle: "External rows tied to the same selection", rows: external },
    ];
  }, [visibleRows]);

  const summary = useMemo(() => {
    return visibleRows.reduce((acc, row) => ({
      pax: acc.pax + Number(row.pax || 0),
      cargoT: acc.cargoT + Number(row.cargoT || 0),
      odTotalRev: acc.odTotalRev + Number(row.odTotalRev || 0),
      fnlRccyTotalRev: acc.fnlRccyTotalRev + Number(row.fnlRccyTotalRev || 0),
    }), { pax: 0, cargoT: 0, odTotalRev: 0, fnlRccyTotalRev: 0 });
  }, [visibleRows]);

  const totalDirtyRows = Object.keys(dirtyMap).length;
  const legCount = sections.find((section) => section.title === "Leg Data")?.rows.length || 0;
  const odCount = sections.find((section) => section.title === "OD Data")?.rows.length || 0;
  const transitCount = sections.find((section) => section.title === "Transits (Same Aircraft)")?.rows.length || 0;

  const renderCellError = (rowId, field) => errorLookup.get(`${rowId}:${field}`) || "";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">POO</label>
                <select
                  value={poo}
                  onChange={(e) => setPoo(e.target.value.toUpperCase())}
                  className="w-28 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {stationOptions.length === 0 ? (
                    <option value="">No stations</option>
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="OD, flight, sector..."
                    className="w-56 bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apply To Dates</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={pendingApplyDate}
                    onChange={(e) => setPendingApplyDate(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={addApplyDate}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                  >
                    <CalendarPlus2 size={16} />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {applyDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {applyDates.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removeApplyDate(item)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {item}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">POO Currency</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{meta.stationCurrency || "--"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting Currency</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{meta.reportingCurrency || "--"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pax Total</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(summary.pax, 0)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final RCCY Total</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(summary.fnlRccyTotalRev)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Create Transit OD</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    User-defined same-aircraft transit setup. Balancing and deletion are handled server-side.
                  </div>
                </div>
                <button
                  onClick={handleCreateTransit}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle size={16} />
                  Add Transit
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                <input value={transitDraft.firstFlightNumber} onChange={(e) => setTransitDraft((prev) => ({ ...prev, firstFlightNumber: e.target.value }))} placeholder="First flight" className={inputBaseClass({ align: "left" })} />
                <input value={transitDraft.secondFlightNumber} onChange={(e) => setTransitDraft((prev) => ({ ...prev, secondFlightNumber: e.target.value }))} placeholder="Second flight" className={inputBaseClass({ align: "left" })} />
                <input value={transitDraft.pax} onChange={(e) => setTransitDraft((prev) => ({ ...prev, pax: e.target.value }))} placeholder="Pax" className={inputBaseClass()} />
                <input value={transitDraft.cargoT} onChange={(e) => setTransitDraft((prev) => ({ ...prev, cargoT: e.target.value }))} placeholder="Cargo T" className={inputBaseClass()} />
                <input value={transitDraft.odFare} onChange={(e) => setTransitDraft((prev) => ({ ...prev, odFare: e.target.value }))} placeholder="OD Fare" className={inputBaseClass()} />
                <input value={transitDraft.odRate} onChange={(e) => setTransitDraft((prev) => ({ ...prev, odRate: e.target.value }))} placeholder="OD Rate" className={inputBaseClass()} />
                <input value={transitDraft.fareProrateRatioL1L2} onChange={(e) => setTransitDraft((prev) => ({ ...prev, fareProrateRatioL1L2: e.target.value }))} placeholder="Fare prorate" className={inputBaseClass()} />
                <input value={transitDraft.rateProrateRatioL1L2} onChange={(e) => setTransitDraft((prev) => ({ ...prev, rateProrateRatioL1L2: e.target.value }))} placeholder="Rate prorate" className={inputBaseClass()} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(transitDraft.applySSPricing)}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, applySSPricing: e.target.checked }))}
                />
                <span>Apply SS pricing</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
              <div className="font-semibold text-slate-800 dark:text-slate-100">Global Validation</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Any breached OD or balancing bucket rejects the whole save. Errors are shown below and highlighted in the sheet.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Selected POO Overview</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Leg rows first, OD rows below, with transits and interline rows grouped after that.
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leg</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{legCount}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OD</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{odCount}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Transit</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{transitCount}</div>
                </div>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/20">
                <div className="text-sm font-semibold text-rose-700 dark:text-rose-200">Validation errors</div>
                <div className="mt-2 space-y-1 text-xs text-rose-700 dark:text-rose-300">
                  {validationErrors.map((issue, index) => (
                    <div key={`${issue.rowId}-${issue.field}-${index}`}>{issue.message}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {totalDirtyRows} pending change{totalDirtyRows === 1 ? "" : "s"}
              </div>
              <button
                onClick={refreshAllocation}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                {loading ? "Refreshing..." : "Refresh Allocation"}
              </button>
              <button
                onClick={handleSave}
                disabled={loading || saving || totalDirtyRows === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!loading && visibleRows.length === 0 && (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900/20">
            <div className="space-y-2 px-6">
              <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">No POO traffic rows</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Choose a station and date, refresh allocation, or adjust your search.
              </div>
            </div>
          </div>
        )}

        {sections.filter((section) => section.rows.length > 0).map((section) => (
          <div key={section.title} className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{section.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {section.subtitle} · {section.rows.length} row(s)
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[4600px] border-collapse">
                <thead>
                  <tr className="bg-white/70 dark:bg-slate-950/40">
                    {[
                      "S.No",
                      "AL",
                      "POO",
                      "OD",
                      "OD D/I",
                      "Stops",
                      "Identifier",
                      "Sector",
                      "Leg D/I",
                      "Date",
                      "Day",
                      "Flight #",
                      "Variant",
                      "Max Pax",
                      "Max Cargo T",
                      "Pax",
                      "Cargo T",
                      "Sector GCD",
                      "ODvia GCD",
                      "Leg Fare",
                      "Leg Rate",
                      "OD Fare",
                      "OD Rate",
                      "Fare prorate ratio L1/L2",
                      "Rate prorate ratio L1/L2",
                      "Leg Pax Rev",
                      "Leg Cargo Rev",
                      "Leg Total Rev",
                      "OD Pax Rev",
                      "OD Cargo Rev",
                      "OD Total Rev",
                      "POO CCY",
                      "POO CCY / RCCY",
                      "RCCY Leg Pax Rev",
                      "RCCY Leg Cargo Rev",
                      "RCCY Leg Total Rev",
                      "RCCY OD Pax Rev",
                      "RCCY OD Cargo Rev",
                      "RCCY OD Total Rev",
                      "Fnl RCCY Pax Rev",
                      "Fnl RCCY Cargo Rev",
                      "Fnl RCCY Total Rev",
                    ].map((label) => (
                      <th key={label} className="border-b border-r border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => {
                    const paxError = renderCellError(row._id, "pax");
                    const cargoError = renderCellError(row._id, "cargoT");
                    return (
                      <tr key={row._id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/20">
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.sNo}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">{row.al || "--"}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">{row.poo}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">{row.od}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.odDI}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.stops}</td>
                        <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", TYPE_STYLES[row.displayType] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>
                            {row.displayType}
                          </span>
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.sector}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.legDI || "--"}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatDate(row.date)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.day || "--"}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.flightNumber}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.variant || "--"}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.maxPax, 0)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.maxCargoT)}</td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={row.pax ?? ""}
                            title={paxError}
                            onChange={(e) => updateField(row._id, "pax", e.target.value)}
                            className={cn("w-24", inputBaseClass({ invalid: Boolean(paxError) }))}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.cargoT ?? ""}
                            title={cargoError}
                            onChange={(e) => updateField(row._id, "cargoT", e.target.value)}
                            className={cn("w-24", inputBaseClass({ invalid: Boolean(cargoError) }))}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.sectorGcd, 0)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.odViaGcd, 0)}</td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.legFare ?? ""}
                            onChange={(e) => updateField(row._id, "legFare", e.target.value)}
                            className={cn("w-24", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.legRate ?? ""}
                            onChange={(e) => updateField(row._id, "legRate", e.target.value)}
                            className={cn("w-24", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.odFare ?? ""}
                            onChange={(e) => updateField(row._id, "odFare", e.target.value)}
                            className={cn("w-24", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.odRate ?? ""}
                            onChange={(e) => updateField(row._id, "odRate", e.target.value)}
                            className={cn("w-24", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.fareProrateRatioL1L2 ?? ""}
                            onChange={(e) => updateField(row._id, "fareProrateRatioL1L2", e.target.value)}
                            className={cn("w-28", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.rateProrateRatioL1L2 ?? ""}
                            onChange={(e) => updateField(row._id, "rateProrateRatioL1L2", e.target.value)}
                            className={cn("w-28", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.legPaxRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.legCargoRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.legTotalRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.odPaxRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.odCargoRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.odTotalRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                          <input
                            type="text"
                            value={row.pooCcy ?? ""}
                            onChange={(e) => updateField(row._id, "pooCcy", e.target.value)}
                            className={cn("w-20", inputBaseClass({ align: "left" }))}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={row.pooCcyToRccy ?? ""}
                            onChange={(e) => updateField(row._id, "pooCcyToRccy", e.target.value)}
                            className={cn("w-24", inputBaseClass())}
                          />
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.rccyLegPaxRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.rccyLegCargoRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.rccyLegTotalRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.rccyOdPaxRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.rccyOdCargoRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.rccyOdTotalRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.fnlRccyPaxRev)}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{formatNumber(row.fnlRccyCargoRev)}</td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{formatNumber(row.fnlRccyTotalRev)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PooTable;
