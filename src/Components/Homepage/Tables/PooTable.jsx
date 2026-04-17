import React, { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PlusCircle, RefreshCw, Save } from "lucide-react";
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

function formatNumber(value, maxFractionDigits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFractionDigits }).format(numeric);
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

function parseApplyDates(raw) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inputBaseClass(bgClass = "") {
  return cn(
    "w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
    bgClass
  );
}

const blankTransitDraft = {
  firstFlightNumber: "",
  secondFlightNumber: "",
  pax: "0",
  cargoT: "0",
  odFare: "0",
  odRate: "0",
  prorateRatioL1: "0",
  pooCcy: "",
  pooCcyToRccy: "1",
  applySSPricing: false,
  interline: "",
  codeshare: "",
};

const PooTable = () => {
  const [poo, setPoo] = useState("DEL");
  const [date, setDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirtyMap, setDirtyMap] = useState({});
  const [applyDates, setApplyDates] = useState("");
  const [transitDraft, setTransitDraft] = useState(blankTransitDraft);

  const fetchData = useCallback(async () => {
    if (!poo || !date) return;
    setLoading(true);
    try {
      const response = await api.get("/poo", { params: { poo, date } });
      setRecords(response.data.data || []);
      setDirtyMap({});
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

  const handlePopulate = async () => {
    if (!poo || !date) {
      toast.warn("Choose a POO station and date first");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/poo/populate", { poo, date });
      setRecords(response.data.data || []);
      setDirtyMap({});
      toast.success(response.data.message || "POO traffic allocation refreshed");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to refresh POO traffic allocation");
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
        applyToDates: parseApplyDates(applyDates),
      });
      toast.success(response.data.message || "POO traffic allocation saved");
      if (response.data.appliedDates?.length) {
        toast.info(`Applied to ${response.data.appliedDates.length} matching date(s)`);
      }
      if (response.data.skippedDates?.length) {
        toast.warn(`Skipped ${response.data.skippedDates.length} date(s) that did not match the source flights`);
      }
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save POO traffic allocation");
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
      toast.success(response.data.message || "Transit OD created");
      setTransitDraft(blankTransitDraft);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create transit OD");
    } finally {
      setSaving(false);
    }
  };

  const groupedRows = useMemo(() => {
    const groups = new Map();
    records.forEach((row) => {
      const key = row.odGroupKey || row.rowMatchKey || row._id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.values()];
  }, [records]);

  const totalDirtyRows = Object.keys(dirtyMap).length;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">POO</label>
                <input
                  type="text"
                  value={poo}
                  onChange={(e) => setPoo(e.target.value.toUpperCase())}
                  className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apply To Dates</label>
                <input
                  type="text"
                  value={applyDates}
                  onChange={(e) => setApplyDates(e.target.value)}
                  placeholder="2026-03-05, 2026-03-12"
                  className="w-72 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Create Transit OD</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    User-trusted setup for Transit FL / Transit SL rows on the selected POO page.
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
              <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-10">
                <input
                  value={transitDraft.firstFlightNumber}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, firstFlightNumber: e.target.value }))}
                  placeholder="First Flight"
                  className={inputBaseClass("text-left")}
                />
                <input
                  value={transitDraft.secondFlightNumber}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, secondFlightNumber: e.target.value }))}
                  placeholder="Second Flight"
                  className={inputBaseClass("text-left")}
                />
                <input
                  value={transitDraft.pax}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, pax: e.target.value }))}
                  placeholder="Pax"
                  className={inputBaseClass()}
                />
                <input
                  value={transitDraft.cargoT}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, cargoT: e.target.value }))}
                  placeholder="Cargo T"
                  className={inputBaseClass()}
                />
                <input
                  value={transitDraft.odFare}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, odFare: e.target.value }))}
                  placeholder="OD Fare"
                  className={inputBaseClass()}
                />
                <input
                  value={transitDraft.odRate}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, odRate: e.target.value }))}
                  placeholder="OD Rate"
                  className={inputBaseClass()}
                />
                <input
                  value={transitDraft.prorateRatioL1}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, prorateRatioL1: e.target.value }))}
                  placeholder="Prorate"
                  className={inputBaseClass()}
                />
                <input
                  value={transitDraft.pooCcy}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, pooCcy: e.target.value.toUpperCase() }))}
                  placeholder="CCY"
                  className={inputBaseClass("text-left")}
                />
                <input
                  value={transitDraft.pooCcyToRccy}
                  onChange={(e) => setTransitDraft((prev) => ({ ...prev, pooCcyToRccy: e.target.value }))}
                  placeholder="FX"
                  className={inputBaseClass()}
                />
                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={transitDraft.applySSPricing}
                    onChange={(e) => setTransitDraft((prev) => ({ ...prev, applySSPricing: e.target.checked }))}
                  />
                  SS Pricing
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
              <div className="font-semibold text-slate-800 dark:text-slate-100">POO Operating Rules</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Traffic changes rebalance server-side across leg, connecting, and transit buckets. Transit rows are deleted automatically when both legs return to zero.
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              <div className="font-semibold text-slate-800 dark:text-slate-100">Interline / Codeshare</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Fields are visible on the table in this phase, but there is no downstream business logic attached yet.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {totalDirtyRows} pending change{totalDirtyRows === 1 ? "" : "s"}
              </div>
              <button
                onClick={handlePopulate}
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
        {!loading && records.length === 0 && (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900/20">
            <div className="space-y-2 px-6">
              <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">No POO traffic rows</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Choose a station and date, then refresh allocation to generate leg, connection, and transit buckets.
              </div>
            </div>
          </div>
        )}

        {records.length > 0 && (
          <div className="space-y-4">
            {groupedRows.map((group, groupIndex) => {
              const lead = group[0];
              return (
                <div
                  key={`${lead.odGroupKey || lead.rowMatchKey || lead._id}-${groupIndex}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {lead.od} • {lead.poo}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(lead.date)} • {lead.odDI} • Stops {lead.stops}
                      </div>
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {lead.source === "user" ? "User Transit Group" : "System Group"}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[2200px] border-collapse">
                      <thead>
                        <tr className="bg-white/70 dark:bg-slate-950/40">
                          {[
                            "POO",
                            "Type",
                            "Sector",
                            "Flight",
                            "Connected",
                            "Max Pax",
                            "Max Cargo T",
                            "Pax",
                            "Cargo T",
                            "Leg Fare",
                            "Leg Rate",
                            "OD Fare",
                            "OD Rate",
                            "Prorate",
                            "CCY",
                            "FX",
                            "Leg Rev",
                            "OD Rev",
                            "RCCY Rev",
                            "Interline",
                            "Codeshare",
                          ].map((label) => (
                            <th
                              key={label}
                              className="border-b border-r border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.map((row) => {
                          const derivedLegPricing = row.stops === 1;
                          return (
                            <tr
                              key={row._id}
                              className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/20"
                            >
                              <td className="border-r border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
                                {row.poo}
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                    TYPE_STYLES[row.displayType] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  )}
                                >
                                  {row.displayType}
                                </span>
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                {row.sector}
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                <div>{row.flightNumber}</div>
                                <div className="text-xs text-slate-400">{row.std || "--"} - {row.sta || "--"}</div>
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                <div>{row.connectedFlightNumber || "--"}</div>
                                <div className="text-xs text-slate-400">{row.connectedStd || "--"} - {row.connectedSta || "--"}</div>
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                {formatNumber(row.maxPax, 0)}
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                {formatNumber(row.maxCargoT)}
                              </td>
                              <td className="border-r border-slate-200 bg-emerald-50/60 px-3 py-2 dark:border-slate-800 dark:bg-emerald-900/10">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={row.pax ?? ""}
                                  onChange={(e) => updateField(row._id, "pax", e.target.value)}
                                  className={inputBaseClass()}
                                />
                              </td>
                              <td className="border-r border-slate-200 bg-cyan-50/60 px-3 py-2 dark:border-slate-800 dark:bg-cyan-900/10">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.cargoT ?? ""}
                                  onChange={(e) => updateField(row._id, "cargoT", e.target.value)}
                                  className={inputBaseClass()}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.legFare ?? ""}
                                  onChange={(e) => updateField(row._id, "legFare", e.target.value)}
                                  disabled={derivedLegPricing}
                                  className={inputBaseClass(derivedLegPricing ? "opacity-70" : "")}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.legRate ?? ""}
                                  onChange={(e) => updateField(row._id, "legRate", e.target.value)}
                                  disabled={derivedLegPricing}
                                  className={inputBaseClass(derivedLegPricing ? "opacity-70" : "")}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.odFare ?? ""}
                                  onChange={(e) => updateField(row._id, "odFare", e.target.value)}
                                  className={inputBaseClass()}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.odRate ?? ""}
                                  onChange={(e) => updateField(row._id, "odRate", e.target.value)}
                                  className={inputBaseClass()}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.prorateRatioL1 ?? ""}
                                  onChange={(e) => updateField(row._id, "prorateRatioL1", e.target.value)}
                                  className={inputBaseClass()}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="text"
                                  value={row.pooCcy ?? ""}
                                  onChange={(e) => updateField(row._id, "pooCcy", e.target.value.toUpperCase())}
                                  className={cn(inputBaseClass("text-left"), "w-20")}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={row.pooCcyToRccy ?? ""}
                                  onChange={(e) => updateField(row._id, "pooCcyToRccy", e.target.value)}
                                  className={inputBaseClass()}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                {formatNumber(row.legTotalRev)}
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-right text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                {formatNumber(row.odTotalRev)}
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 text-right text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
                                {formatNumber(row.rccyTotalRev)}
                              </td>
                              <td className="border-r border-slate-200 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="text"
                                  value={row.interline ?? ""}
                                  onChange={(e) => updateField(row._id, "interline", e.target.value)}
                                  className={cn(inputBaseClass("text-left"), "w-28")}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.codeshare ?? ""}
                                  onChange={(e) => updateField(row._id, "codeshare", e.target.value)}
                                  className={cn(inputBaseClass("text-left"), "w-28")}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PooTable;
