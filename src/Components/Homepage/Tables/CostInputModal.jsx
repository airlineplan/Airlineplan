import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Plus, Edit2, Check, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import api from "../../../apiConfig";
import { toast } from "react-toastify";
import useEscapeKey from "../../../hooks/useEscapeKey";

// --- Helper Components ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MODAL_TABLE_COLUMN_WIDTH = 168;
const modalTableScrollClass = "overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg";
const modalTableClass = "w-full table-fixed text-left text-base whitespace-nowrap border-collapse";
const PLF_HEADER_ROW_TYPE = "header";
const PLF_CARRY_FORWARD_KEY = "p100";
const PLF_DEFAULT_THRESHOLD_KEYS = ["p80", "p90", "p95", "p98"];
const PLF_PERCENT_KEY_RE = /^p(\d{1,3})$/i;

function EqualWidthColGroup({ count }) {
  return (
    <colgroup>
      {Array.from({ length: count }).map((_, index) => (
        <col key={index} style={{ width: `${MODAL_TABLE_COLUMN_WIDTH}px` }} />
      ))}
    </colgroup>
  );
}

function getModalTableStyle(columnCount) {
  return { minWidth: `${columnCount * MODAL_TABLE_COLUMN_WIDTH}px` };
}

function parsePlfPercentInput(value) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";

  const numeric = Number(digits);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(Math.min(99, Math.floor(numeric)));
}

function getPlfThresholdNumber(key) {
  const match = String(key ?? "").match(PLF_PERCENT_KEY_RE);
  if (!match) return null;
  const threshold = Number(match[1]);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 100) return null;
  return threshold;
}

function formatPlfThresholdLabel(key) {
  const threshold = getPlfThresholdNumber(key);
  return threshold === null ? "" : `${threshold}%`;
}

function getPlfThresholdKeys(rows = []) {
  const keys = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key === PLF_CARRY_FORWARD_KEY) return;
      const threshold = getPlfThresholdNumber(key);
      if (threshold !== null) {
        keys.add(`p${threshold}`);
      }
    });
  });

  const sorted = [...keys].sort((a, b) => getPlfThresholdNumber(a) - getPlfThresholdNumber(b));
  return sorted.length > 0 ? sorted : [...PLF_DEFAULT_THRESHOLD_KEYS];
}

function getNextPlfThresholdKey(rows = []) {
  const used = new Set(getPlfThresholdKeys(rows).map((key) => key.toLowerCase()));
  const numericKeys = [...used]
    .map((key) => getPlfThresholdNumber(key))
    .filter((value) => Number.isFinite(value) && value < 100);
  const start = numericKeys.length ? Math.min(99, Math.max(...numericKeys) + 1) : 99;

  for (let threshold = start; threshold < 100; threshold += 1) {
    const candidate = `p${threshold}`;
    if (!used.has(candidate)) return candidate;
  }

  return null;
}

function createPlfBlankRow(rowType, thresholdKeys, extra = {}) {
  const row = { rowType, ...extra };
  (thresholdKeys || []).forEach((key) => {
    row[key] = row[key] ?? "";
  });
  if (rowType === "aircraft") {
    row[PLF_CARRY_FORWARD_KEY] = row[PLF_CARRY_FORWARD_KEY] ?? "1.00";
  }
  return row;
}

function createPlfHeaderRow(thresholdKeys) {
  return createPlfBlankRow(PLF_HEADER_ROW_TYPE, thresholdKeys);
}

function ensurePlfHeaderRow(rows, thresholdKeys) {
  const source = Array.isArray(rows) ? rows : [];
  if (source.some((row) => row?.rowType === PLF_HEADER_ROW_TYPE)) return source;
  return [createPlfHeaderRow(thresholdKeys), ...source];
}

const APU_FUEL_ALLOCATION_CODE = "APUFUELCOST";
const APU_FUEL_BASIS_OPTIONS = [
  { label: "Departure", value: "DEPARTURES" },
  { label: "BH", value: "BH" },
  { label: "FH", value: "FH" },
];
const DEFAULT_NAV_MTOW_TIERS = ["73000", "77000", "78000", "79000"];

function normalizeNavMtowTiers(value, fallback = DEFAULT_NAV_MTOW_TIERS) {
  const source = Array.isArray(value) && value.length > 0 ? value : fallback;
  const next = source
    .map((tier, index) => {
      const trimmed = String(tier ?? "").trim();
      return trimmed || String(fallback[index] ?? "");
    })
    .filter(Boolean);

  return next.length > 0 ? next : [...fallback];
}

function remapNavigationRows(rows, previousTiers, nextTiers) {
  const prev = Array.isArray(previousTiers) ? previousTiers : [];
  const next = Array.isArray(nextTiers) ? nextTiers : [];

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const updated = { ...row };
    const tierRates = { ...(row?.tierRates || {}) };

    prev.forEach((oldTier, index) => {
      const oldKey = String(oldTier ?? "").trim();
      const newKey = String(next[index] ?? "").trim();
      if (!oldKey || !newKey || oldKey === newKey) return;

      if (updated[oldKey] !== undefined) {
        if (updated[newKey] === undefined || updated[newKey] === "") {
          updated[newKey] = updated[oldKey];
        }
        delete updated[oldKey];
      }

      if (tierRates[oldKey] !== undefined) {
        if (tierRates[newKey] === undefined || tierRates[newKey] === "") {
          tierRates[newKey] = tierRates[oldKey];
        }
        delete tierRates[oldKey];
      }
    });

    if (Object.keys(tierRates).length > 0) {
      updated.tierRates = tierRates;
    }

    return updated;
  });
}

function normalizeAllocationBasis(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (["DEPARTURE", "DEPARTURES", "CYCLE", "CYCLES"].includes(raw)) return "DEPARTURES";
  if (["BH", "BLOCKHOURS", "BLOCK HOURS"].includes(raw)) return "BH";
  if (["FH", "FLIGHTHOURS", "FLIGHT HOURS"].includes(raw)) return "FH";
  return "DEPARTURES";
}

function Input({ value, onChange, placeholder, type = "text", className, ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
      className={cn(
        "w-full min-h-[44px] px-3 py-2.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500",
        "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200",
        className
      )}
    />
  );
}

function FuelConsumptionTable({ data, setData, className }) {
  const [fallbackMonth1, setFallbackMonth1] = useState("");
  const [fallbackMonth2, setFallbackMonth2] = useState("");
  const month1Row = data.find((row) => row.month1 || row.m1Label || row.month);
  const month2Row = data.find((row) => row.month2 || row.m2Label);
  const month1 = month1Row?.month1 || month1Row?.m1Label || month1Row?.month || fallbackMonth1;
  const month2 = month2Row?.month2 || month2Row?.m2Label || fallbackMonth2;

  const isSectorRow = (row) => (row.rowType ? row.rowType === "sector" : !row.acftRegn);

  const applyMonthLabel = (key, value) => {
    if (key === "month1") setFallbackMonth1(value);
    if (key === "month2") setFallbackMonth2(value);
    setData(data.map((row) => ({ ...row, [key]: value })));
  };

  const updateRow = (index, key, value) => {
    setData(data.map((row, rowIndex) => (
      rowIndex === index ? { ...row, month1, month2, [key]: value } : row
    )));
  };

  const updateSectorGroup = (index, key, value) => {
    const next = data.map((row) => ({ ...row }));
    next[index].month1 = month1;
    next[index].month2 = month2;
    next[index][key] = value;

    for (let rowIndex = index + 1; rowIndex < next.length; rowIndex += 1) {
      if (isSectorRow(next[rowIndex])) break;
      next[rowIndex].month1 = month1;
      next[rowIndex].month2 = month2;
      next[rowIndex][key] = value;
    }

    setData(next);
  };

  const addSector = () => {
    setData([...data, { rowType: "sector", sectorOrGcd: "", gcd: "", month1, month2 }]);
  };

  const addAircraft = () => {
    let sectorOrGcd = "";
    let gcd = "";

    for (let index = data.length - 1; index >= 0; index -= 1) {
      if (isSectorRow(data[index])) {
        sectorOrGcd = data[index].sectorOrGcd || "";
        gcd = data[index].gcd || "";
        break;
      }
    }

    setData([...data, { rowType: "aircraft", sectorOrGcd, gcd, acftRegn: "", m1: "", m2: "", month1, month2 }]);
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  const rows = data.length ? data : [{ rowType: "sector", sectorOrGcd: "", gcd: "", month1, month2 }];

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fuel Consumption</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={addSector}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> Sector
          </button>
          <button
            onClick={addAircraft}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> ACFT
          </button>
        </div>
      </div>
      <div className={modalTableScrollClass}>
        <table className={modalTableClass} style={getModalTableStyle(5)}>
          <EqualWidthColGroup count={5} />
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Fuel Kg</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">GCD</th>
              <th className="border border-slate-300 dark:border-slate-700 p-0">
                <Input
                  value={month1}
                  onChange={(e) => applyMonthLabel("month1", e.target.value)}
                  placeholder="MMM-YY"
                  className="border-0 rounded-none text-right font-semibold"
                />
              </th>
              <th className="border border-slate-300 dark:border-slate-700 p-0">
                <Input
                  value={month2}
                  onChange={(e) => applyMonthLabel("month2", e.target.value)}
                  placeholder="MMM-YY"
                  className="border-0 rounded-none text-right font-semibold"
                />
              </th>
              <th className="border border-slate-300 dark:border-slate-700" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const sectorRow = isSectorRow(row);
              const disabledPlaceholder = data.length === 0;

              return (
                <tr key={index} className={cn(sectorRow && "bg-slate-50 dark:bg-slate-800/60")}>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={sectorRow ? row.sectorOrGcd : row.acftRegn}
                      onChange={(e) => {
                        if (disabledPlaceholder) {
                          setData([{ rowType: "sector", sectorOrGcd: e.target.value, gcd: "", month1, month2 }]);
                          return;
                        }
                        if (sectorRow) updateSectorGroup(index, "sectorOrGcd", e.target.value);
                        else updateRow(index, "acftRegn", e.target.value);
                      }}
                      placeholder={sectorRow ? "Sector" : "ACFT Regn"}
                      className={cn(
                        "border-0 rounded-none font-medium",
                        !sectorRow && "pl-8",
                        sectorRow && "bg-slate-50 dark:bg-slate-800/60"
                      )}
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    {sectorRow ? (
                      <Input
                        value={row.gcd}
                        onChange={(e) => {
                          if (disabledPlaceholder) {
                            setData([{ rowType: "sector", sectorOrGcd: "", gcd: e.target.value, month1, month2 }]);
                            return;
                          }
                          updateSectorGroup(index, "gcd", e.target.value);
                        }}
                        type="number"
                        placeholder="GCD"
                        className="border-0 rounded-none text-right bg-slate-50 dark:bg-slate-800/60"
                      />
                    ) : (
                      <div className="h-10 bg-slate-100 dark:bg-slate-800" />
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    {sectorRow ? (
                      <div className="h-10 bg-slate-100 dark:bg-slate-800" />
                    ) : (
                      <Input
                        value={row.m1 ?? (row.month === month1 ? row.fuelConsumptionKg : "")}
                        onChange={(e) => updateRow(index, "m1", e.target.value)}
                        type="number"
                        className="border-0 rounded-none text-right"
                      />
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    {sectorRow ? (
                      <div className="h-10 bg-slate-100 dark:bg-slate-800" />
                    ) : (
                      <Input
                        value={row.m2}
                        onChange={(e) => updateRow(index, "m2", e.target.value)}
                        type="number"
                        className="border-0 rounded-none text-right"
                      />
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 px-1 text-center">
                    {!disabledPlaceholder && (
                      <button onClick={() => deleteRow(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlfEffectTable({ data, setData, className }) {
  const isHeaderRow = (row) => row?.rowType === PLF_HEADER_ROW_TYPE;
  const isSectorRow = (row) => (row.rowType ? row.rowType === "sector" : !row.acftRegn);
  const rows = data.length ? data : [createPlfBlankRow("sector", PLF_DEFAULT_THRESHOLD_KEYS, { sectorOrGcd: "", gcd: "" })];
  const visibleRows = rows.filter((row) => !isHeaderRow(row));
  const thresholdKeys = getPlfThresholdKeys(rows);
  const renderedRows = visibleRows.length
    ? rows.map((row, index) => ({ row, index })).filter(({ row }) => !isHeaderRow(row))
    : [{ row: createPlfBlankRow("sector", thresholdKeys, { sectorOrGcd: "", gcd: "" }), index: -1 }];
  const [thresholdDrafts, setThresholdDrafts] = useState({});

  useEffect(() => {
    setThresholdDrafts((prev) => {
      const next = {};
      thresholdKeys.forEach((key) => {
        next[key] = prev[key] ?? formatPlfThresholdLabel(key);
      });
      return next;
    });
  }, [thresholdKeys.join("|")]);

  const getCarryForwardValue = (row) => {
    let lastValue = "";
    for (const key of thresholdKeys) {
      const value = row?.[key];
      if (value !== "" && value !== null && value !== undefined) lastValue = value;
    }
    return lastValue || row?.p100 || "1.00";
  };

  const normalizeAircraftRow = (row) => {
    const p100 = getCarryForwardValue(row);
    return {
      ...row,
      p100: p100 === "" ? "1.00" : p100,
    };
  };

  const updateRow = (index, key, value) => {
    setData(data.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      if (isSectorRow(row)) return { ...row, [key]: value };
      const next = { ...row, [key]: value };
      return normalizeAircraftRow(next);
    }));
  };

  const updateSectorGroup = (index, key, value) => {
    const next = data.map((row) => ({ ...row }));
    next[index][key] = value;

    for (let rowIndex = index + 1; rowIndex < next.length; rowIndex += 1) {
      if (isSectorRow(next[rowIndex])) break;
      next[rowIndex][key] = value;
      next[rowIndex] = normalizeAircraftRow(next[rowIndex]);
    }

    setData(next);
  };

  const addSector = () => {
    setData([...data, createPlfBlankRow("sector", thresholdKeys, { sectorOrGcd: "", gcd: "" })]);
  };

  const addAircraft = () => {
    let sectorOrGcd = "";
    let gcd = "";

    for (let index = data.length - 1; index >= 0; index -= 1) {
      if (isSectorRow(data[index])) {
        sectorOrGcd = data[index].sectorOrGcd || "";
        gcd = data[index].gcd || "";
        break;
      }
    }

    setData([
      ...data,
      normalizeAircraftRow(createPlfBlankRow("aircraft", thresholdKeys, {
        sectorOrGcd,
        gcd,
        acftRegn: "",
      })),
    ]);
  };

  const addThresholdColumn = () => {
    const nextKey = getNextPlfThresholdKey(rows);
    if (!nextKey) {
      toast.error("No more percentage columns can be added.");
      return;
    }

    setData((prev) => {
      const baseRows = ensurePlfHeaderRow(prev, thresholdKeys);
      return baseRows.map((row) => ({
        ...row,
        [nextKey]: row[nextKey] ?? "",
      }));
    });
  };

  const commitThresholdColumn = (oldKey) => {
    const draftValue = thresholdDrafts[oldKey] ?? formatPlfThresholdLabel(oldKey);
    const nextPercent = parsePlfPercentInput(draftValue);
    if (!nextPercent) {
      setThresholdDrafts((prev) => ({ ...prev, [oldKey]: formatPlfThresholdLabel(oldKey) }));
      return;
    }

    const nextKey = `p${nextPercent}`;
    if (nextKey !== oldKey) {
      const existingKeys = new Set(getPlfThresholdKeys(rows).map((key) => key.toLowerCase()));
      existingKeys.delete(String(oldKey).toLowerCase());
      if (existingKeys.has(nextKey.toLowerCase())) {
        toast.error("That percentage column already exists.");
        setThresholdDrafts((prev) => ({ ...prev, [oldKey]: formatPlfThresholdLabel(oldKey) }));
        return;
      }

      setData((prev) => {
        const baseRows = ensurePlfHeaderRow(prev, thresholdKeys);
        return baseRows.map((row) => {
          const updated = { ...row };
          if (updated[oldKey] !== undefined) {
            updated[nextKey] = updated[oldKey];
            delete updated[oldKey];
          }
          return isHeaderRow(updated) || isSectorRow(updated) ? updated : normalizeAircraftRow(updated);
        });
      });
      setThresholdDrafts((prev) => {
        const next = { ...prev };
        delete next[oldKey];
        next[nextKey] = `${nextPercent}%`;
        return next;
      });
      return;
    }

    setThresholdDrafts((prev) => ({ ...prev, [oldKey]: `${nextPercent}%` }));
  };

  const removeThresholdColumn = (key) => {
    setData((prev) => ensurePlfHeaderRow(prev, thresholdKeys).map((row) => {
      const updated = { ...row };
      delete updated[key];
      return isHeaderRow(updated) || isSectorRow(updated) ? updated : normalizeAircraftRow(updated);
    }));
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">PLF Effect</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={addThresholdColumn}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> % Column
          </button>
          <button
            onClick={addSector}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> Sector
          </button>
          <button
            onClick={addAircraft}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> ACFT
          </button>
        </div>
      </div>
      <div className="flex items-start">
        <div className={modalTableScrollClass}>
          <table className={modalTableClass} style={getModalTableStyle(thresholdKeys.length + 4)}>
            <EqualWidthColGroup count={thresholdKeys.length + 4} />
            <thead>
              <tr className="bg-white dark:bg-slate-900">
                <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">PLF effect</th>
                <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">GCD</th>
                {thresholdKeys.map((key) => (
                  <th key={key} className="min-w-[96px] border border-slate-300 dark:border-slate-700 p-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-1 px-3 py-2">
                      <Input
                        value={thresholdDrafts[key] ?? formatPlfThresholdLabel(key)}
                        onChange={(e) => setThresholdDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                        onBlur={() => commitThresholdColumn(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder="%"
                        inputMode="numeric"
                        className="border-0 rounded-none text-right font-semibold px-0"
                      />
                      <button
                        onClick={() => removeThresholdColumn(key)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30"
                        title="Remove percentage column"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="min-w-[96px] border border-slate-300 dark:border-slate-700 px-3 py-2 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">
                  100%
                </th>
                <th className="border border-slate-300 dark:border-slate-700" />
              </tr>
            </thead>
            <tbody>
              {renderedRows.map(({ row, index }) => {
                const sectorRow = isSectorRow(row);
                const disabledPlaceholder = data.length === 0 || index < 0;

                return (
                  <tr key={index} className={cn(sectorRow && "bg-slate-50 dark:bg-slate-800/60")}>
                    <td className="border border-slate-300 dark:border-slate-700 p-0">
                      <Input
                        value={sectorRow ? row.sectorOrGcd : row.acftRegn}
                        onChange={(e) => {
                          if (disabledPlaceholder) {
                            setData((prev) => [...prev, createPlfBlankRow("sector", thresholdKeys, { sectorOrGcd: e.target.value, gcd: "" })]);
                            return;
                          }
                          if (sectorRow) updateSectorGroup(index, "sectorOrGcd", e.target.value);
                          else updateRow(index, "acftRegn", e.target.value);
                        }}
                        placeholder={sectorRow ? "Sector" : "ACFT Regn"}
                        className={cn(
                          "border-0 rounded-none font-medium",
                          !sectorRow && "pl-8",
                          sectorRow && "bg-slate-50 dark:bg-slate-800/60"
                        )}
                      />
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-0">
                      {sectorRow ? (
                        <Input
                          value={row.gcd}
                          onChange={(e) => {
                            if (disabledPlaceholder) {
                              setData((prev) => [...prev, createPlfBlankRow("sector", thresholdKeys, { sectorOrGcd: "", gcd: e.target.value })]);
                              return;
                            }
                            updateSectorGroup(index, "gcd", e.target.value);
                          }}
                          type="number"
                          placeholder="GCD"
                          className="border-0 rounded-none text-right bg-slate-50 dark:bg-slate-800/60"
                        />
                      ) : (
                        <div className="h-10 bg-slate-100 dark:bg-slate-800" />
                      )}
                    </td>
                    {thresholdKeys.map((key) => (
                      <td key={key} className="border border-slate-300 dark:border-slate-700 p-0">
                        {sectorRow ? (
                          <div className="h-10 bg-slate-100 dark:bg-slate-800" />
                        ) : (
                          <Input
                            value={row[key]}
                            onChange={(e) => updateRow(index, key, e.target.value)}
                            type="number"
                            className="border-0 rounded-none text-right"
                          />
                        )}
                      </td>
                    ))}
                    <td className="border border-slate-300 dark:border-slate-700 p-0">
                      {sectorRow ? (
                        <div className="h-10 bg-slate-100 dark:bg-slate-800" />
                      ) : (
                        <Input
                          value={getCarryForwardValue(row)}
                          type="number"
                          readOnly
                          className="border-0 rounded-none text-right bg-slate-50 dark:bg-slate-800/60"
                        />
                      )}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 px-1 text-center">
                      {!disabledPlaceholder && (
                        <button onClick={() => deleteRow(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FuelConsumptionIndexTable({ data, setData, className }) {
  const monthKeys = [
    ["month1", "m1"],
    ["month2", "m2"],
    ["month3", "m3"],
    ["month4", "m4"],
    ["month5", "m5"],
  ];

  const getMonthLabel = (monthKey, fallback) => data.find((row) => row[monthKey])?.[monthKey] || fallback;

  const updateMonthLabel = (monthKey, value) => {
    setData(data.map((row) => ({ ...row, [monthKey]: value })));
  };

  const updateRow = (index, key, value) => {
    setData(data.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    setData([
      ...data,
      {
        acftRegn: "",
        month1: getMonthLabel("month1", ""),
        month2: getMonthLabel("month2", ""),
        month3: getMonthLabel("month3", ""),
        month4: getMonthLabel("month4", ""),
        month5: getMonthLabel("month5", ""),
        m1: "",
        m2: "",
        m3: "",
        m4: "",
        m5: "",
      },
    ]);
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  const rows = data.length ? data : [{ acftRegn: "", m1: "", m2: "", m3: "", m4: "", m5: "" }];

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fuel Consumption Index</h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className={modalTableScrollClass}>
        <table className={modalTableClass} style={getModalTableStyle(7)}>
          <EqualWidthColGroup count={7} />
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Fuel consum</th>
              {monthKeys.map(([monthKey], index) => (
                <th key={monthKey} className="min-w-[92px] border border-slate-300 dark:border-slate-700 p-0">
                  <Input
                    value={getMonthLabel(monthKey, "")}
                    onChange={(e) => updateMonthLabel(monthKey, e.target.value)}
                    placeholder="MMM-YY"
                    className="border-0 rounded-none text-right font-semibold"
                  />
                </th>
              ))}
              <th className="border border-slate-300 dark:border-slate-700" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const disabledPlaceholder = data.length === 0;

              return (
                <tr key={index}>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.acftRegn}
                      onChange={(e) => {
                        if (disabledPlaceholder) {
                          setData([{ acftRegn: e.target.value, m1: "", m2: "", m3: "", m4: "", m5: "" }]);
                          return;
                        }
                        updateRow(index, "acftRegn", e.target.value);
                      }}
                      placeholder="ACFT Regn"
                      className="border-0 rounded-none font-medium"
                    />
                  </td>
                  {monthKeys.map(([, valueKey]) => (
                    <td key={valueKey} className="border border-slate-300 dark:border-slate-700 p-0">
                      <Input
                        value={row[valueKey]}
                        onChange={(e) => updateRow(index, valueKey, e.target.value)}
                        type="number"
                        className="border-0 rounded-none text-right"
                      />
                    </td>
                  ))}
                  <td className="border border-slate-300 dark:border-slate-700 px-1 text-center">
                    {!disabledPlaceholder && (
                      <button onClick={() => deleteRow(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApuUsageTable({ data, setData, className }) {
  const blankIfInvalidNumber = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? value : "";
  };

  const normalizeRow = (row) => {
    const addlnUse = (row.addlnUse || "N").toString().toUpperCase() === "Y" ? "Y" : "N";
    return {
      ...row,
      addlnUse,
      stn: row.stn || "",
      toDate: addlnUse === "Y" ? (row.fromDate || row.toDate || "") : (row.toDate || ""),
      apuHrPerDay: blankIfInvalidNumber(row.apuHrPerDay),
      kgPerApuHr: blankIfInvalidNumber(row.kgPerApuHr),
    };
  };

  const updateRow = (index, key, value) => {
    setData(data.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = {
        ...row,
        [key]: key === "apuHrPerDay" || key === "kgPerApuHr"
          ? blankIfInvalidNumber(value)
          : value,
      };
      if (key === "addlnUse") {
        next.addlnUse = value === "Y" ? "Y" : "N";
        if (next.addlnUse === "Y") {
          next.toDate = next.fromDate || next.toDate || "";
        }
      }
      if (key === "fromDate" && (row.addlnUse || "N") === "Y") {
        next.toDate = value;
      }
      return normalizeRow(next);
    }));
  };

  const addRow = () => {
    setData([
      ...data,
      {
        stn: "",
        fromDate: "",
        toDate: "",
        variant: "",
        acftRegn: "",
        apuHrPerDay: "",
        kgPerApuHr: "",
        addlnUse: "N",
        ccy: "",
      },
    ]);
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  const rows = data.length ? data.map(normalizeRow) : [{
    stn: "",
    fromDate: "",
    toDate: "",
    variant: "",
    acftRegn: "",
    apuHrPerDay: "",
    kgPerApuHr: "",
    addlnUse: "N",
    ccy: "",
  }];

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">APU Usage</h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className={modalTableScrollClass}>
        <table className={modalTableClass} style={getModalTableStyle(10)}>
          <EqualWidthColGroup count={10} />
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Stn</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">From date</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">To date</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Variant</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">ACFT Regn</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">APU Hr/day</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Kg / APU Hr</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Addln use</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">CCY</th>
              <th className="border border-slate-300 dark:border-slate-700" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const disabledPlaceholder = data.length === 0;
              return (
                <tr key={index}>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.stn}
                      onChange={(e) => updateRow(index, "stn", e.target.value)}
                      placeholder="Stn"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.fromDate}
                      onChange={(e) => updateRow(index, "fromDate", e.target.value)}
                      type="date"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.toDate}
                      onChange={(e) => updateRow(index, "toDate", e.target.value)}
                      type="date"
                      disabled={(row.addlnUse || "N") === "Y"}
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.variant}
                      onChange={(e) => updateRow(index, "variant", e.target.value)}
                      placeholder="Variant"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.acftRegn}
                      onChange={(e) => updateRow(index, "acftRegn", e.target.value)}
                      placeholder="ACFT Regn"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.apuHrPerDay}
                      onChange={(e) => updateRow(index, "apuHrPerDay", e.target.value)}
                      type="number"
                      className="border-0 rounded-none text-right"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.kgPerApuHr}
                      onChange={(e) => updateRow(index, "kgPerApuHr", e.target.value)}
                      type="number"
                      className="border-0 rounded-none text-right"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <select
                      value={row.addlnUse || "N"}
                      onChange={(e) => updateRow(index, "addlnUse", e.target.value)}
                      className="w-full h-10 px-3 text-sm outline-none bg-white dark:bg-slate-900 border-0 text-slate-800 dark:text-slate-200"
                    >
                      <option value="N">N</option>
                      <option value="Y">Y</option>
                    </select>
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.ccy}
                      onChange={(e) => updateRow(index, "ccy", e.target.value)}
                      placeholder="CCY"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 px-1 text-center">
                    {!disabledPlaceholder && (
                      <button onClick={() => deleteRow(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FuelPriceTable({ data, setData, className }) {
  const [fallbackMonth1, setFallbackMonth1] = useState("");
  const [fallbackMonth2, setFallbackMonth2] = useState("");
  const month1Row = data.find((row) => row.month1 || row.m1Label || row.month);
  const month2Row = data.find((row) => row.month2 || row.m2Label);
  const month1 = month1Row?.month1 || month1Row?.m1Label || month1Row?.month || fallbackMonth1;
  const month2 = month2Row?.month2 || month2Row?.m2Label || fallbackMonth2;

  const normalizeRow = (row) => {
    return {
      ...row,
      month1: month1 || row.month1 || "",
      month2: month2 || row.month2 || "",
    };
  };

  const updateMonthLabel = (key, value) => {
    if (key === "month1") setFallbackMonth1(value);
    if (key === "month2") setFallbackMonth2(value);
    setData(data.map((row) => ({ ...row, [key]: value })));
  };

  const updateRow = (index, key, value) => {
    if (data.length === 0) {
      setData([normalizeRow({
        station: "",
        ccy: "",
        kgPerLtr: "",
        month1,
        month2,
        m1: "",
        m2: "",
        [key]: value,
      })]);
      return;
    }

    setData(data.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, [key]: value, month1, month2 };
      return normalizeRow(next);
    }));
  };

  const addRow = () => {
    setData([
      ...data,
      normalizeRow({
        station: "",
        ccy: "",
        kgPerLtr: "",
        month1,
        month2,
        m1: "",
        m2: "",
      }),
    ]);
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  const rows = data.length ? data.map(normalizeRow) : [{ station: "", ccy: "", kgPerLtr: "", month1, month2, m1: "", m2: "" }];

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fuel Price</h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className={modalTableScrollClass}>
        <table className={modalTableClass} style={getModalTableStyle(6)}>
          <EqualWidthColGroup count={6} />
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Kg/Ltr</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">CCY</th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Into plane (per kLtr)</th>
              <th className="border border-slate-300 dark:border-slate-700 p-0">
                <Input
                  value={month1}
                  onChange={(e) => updateMonthLabel("month1", e.target.value)}
                  placeholder="MMM-YY"
                  className="border-0 rounded-none text-right font-semibold"
                />
              </th>
              <th className="border border-slate-300 dark:border-slate-700 p-0">
                <Input
                  value={month2}
                  onChange={(e) => updateMonthLabel("month2", e.target.value)}
                  placeholder="MMM-YY"
                  className="border-0 rounded-none text-right font-semibold"
                />
              </th>
              <th className="border border-slate-300 dark:border-slate-700" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const disabledPlaceholder = data.length === 0;
              return (
                <tr key={index}>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.kgPerLtr}
                      onChange={(e) => updateRow(index, "kgPerLtr", e.target.value)}
                      type="number"
                      className="border-0 rounded-none text-right"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.ccy}
                      onChange={(e) => updateRow(index, "ccy", e.target.value)}
                      placeholder="CCY"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.station}
                      onChange={(e) => updateRow(index, "station", e.target.value)}
                      placeholder="Into plane"
                      className="border-0 rounded-none"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.m1}
                      onChange={(e) => updateRow(index, "m1", e.target.value)}
                      type="number"
                      className="border-0 rounded-none text-right"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    <Input
                      value={row.m2}
                      onChange={(e) => updateRow(index, "m2", e.target.value)}
                      type="number"
                      className="border-0 rounded-none text-right"
                    />
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 px-1 text-center">
                    {!disabledPlaceholder && (
                      <button onClick={() => deleteRow(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// A simple editable table component
function EditableTable({
  title,
  columns,
  data,
  setData,
  className,
  titleNote,
  sortFilter = false,
  highlightAutoFields = false,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "Up" });
  const [filters, setFilters] = useState({});

  const handleEdit = (index, row) => {
    setEditingIndex(index);
    setEditRow({ ...row });
  };

  const handleSave = (index) => {
    const newData = [...data];
    newData[index] = editRow;
    setData(newData);
    setEditingIndex(null);
  };

  const handleAdd = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {});
    setData([...data, newRow]);
    setEditingIndex(data.length);
    setEditRow(newRow);
  };

  const handleDelete = (index) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleSort = (key) => {
    if (!sortFilter) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "Up" ? "Down" : "Up",
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  let visibleRows = data.map((row, index) => ({ row, index }));

  if (sortFilter) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        visibleRows = visibleRows.filter(({ row }) =>
          String(row[key] ?? "").toLowerCase().includes(String(value).toLowerCase())
        );
      }
    });

    if (sortConfig.key) {
      visibleRows = [...visibleRows].sort((a, b) => {
        let valA = a.row[sortConfig.key] ?? "";
        let valB = b.row[sortConfig.key] ?? "";

        if (!Number.isNaN(parseFloat(valA)) && !Number.isNaN(parseFloat(valB))) {
          valA = parseFloat(valA);
          valB = parseFloat(valB);
        }

        if (valA < valB) return sortConfig.direction === "Up" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "Up" ? 1 : -1;
        return 0;
      });
    }
  }

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          {titleNote && <span className="text-xs text-slate-500 dark:text-slate-400">{titleNote}</span>}
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className={modalTableScrollClass}>
        <table className={modalTableClass} style={getModalTableStyle(columns.length + 1)}>
          <EqualWidthColGroup count={columns.length + 1} />
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            {sortFilter && (
              <tr>
                {columns.map((col) => (
                  <th key={`${col.key}-filter`} className="px-1 py-1 text-sm font-medium text-slate-500">
                    <input
                      value={filters[col.key] || ""}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      placeholder="Sort+Filter"
                      className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    />
                  </th>
                ))}
                <th className="px-1 py-1" />
              </tr>
            )}
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "px-3 py-3 text-sm font-medium text-slate-500 uppercase",
                    sortFilter && "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700",
                    col.headerClassName
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortFilter && sortConfig.key === col.key && (
                      sortConfig.direction === "Up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-sm font-medium text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-5 text-center text-slate-400 text-sm italic">
                  {data.length === 0 ? 'No data. Click "Add Row" to start.' : "No rows match the filters."}
                </td>
              </tr>
            )}
            {visibleRows.map(({ row, index }) => {
              const isEditing = editingIndex === index;
              const autoFields = new Set(Array.isArray(row._hydratedFields) ? row._hydratedFields : []);
              return (
                <tr
                  key={index}
                  className={cn(
                    "hover:bg-slate-50/50 dark:hover:bg-slate-800/50",
                    highlightAutoFields && autoFields.size > 0 && "bg-emerald-50/20 dark:bg-emerald-900/10"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-3",
                        col.cellClassName,
                        highlightAutoFields && autoFields.has(col.key) && "bg-emerald-50/70 dark:bg-emerald-900/20"
                      )}
                    >
                      {isEditing ? (
                        <Input
                          value={editRow[col.key]}
                          onChange={(e) => setEditRow({ ...editRow, [col.key]: e.target.value })}
                          type={col.type || "text"}
                          className={cn(
                            highlightAutoFields && autoFields.has(col.key) && "bg-emerald-50 dark:bg-emerald-900/20"
                          )}
                        />
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">
                          {row[col.key] !== "" && row[col.key] !== null && row[col.key] !== undefined ? row[col.key] : <span className="text-slate-400">-</span>}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <button onClick={() => handleSave(index)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Check size={16} />
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(index, row)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompactEditableTable({ title, columns, data, setData, className, addLabel = "Add Row" }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editRow, setEditRow] = useState({});

  const handleEdit = (index, row) => {
    setEditingIndex(index);
    setEditRow({ ...row });
  };

  const handleSave = (index) => {
    const next = [...data];
    next[index] = editRow;
    setData(next);
    setEditingIndex(null);
  };

  const handleAdd = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {});
    setData([...data, newRow]);
    setEditingIndex(data.length);
    setEditRow(newRow);
  };

  const handleDelete = (index) => {
    const next = data.filter((_, rowIndex) => rowIndex !== index);
    setData(next);
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Plus size={12} /> {addLabel}
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full table-fixed border-collapse text-sm whitespace-nowrap" style={getModalTableStyle(columns.length + 1)}>
          <EqualWidthColGroup count={columns.length + 1} />
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-200"
                >
                  {col.label}
                </th>
              ))}
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border border-slate-300 dark:border-slate-700 px-3 py-4 text-center text-slate-400"
                >
                  No rows yet. Add a row to begin.
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const isEditing = editingIndex === index;
                return (
                  <tr key={index} className="bg-white dark:bg-slate-900">
                    {columns.map((col) => (
                      <td key={col.key} className="border border-slate-300 dark:border-slate-700 p-0">
                        {isEditing ? (
                          <input
                            type={col.type || "text"}
                            value={editRow[col.key] || ""}
                            onChange={(e) => setEditRow({ ...editRow, [col.key]: e.target.value })}
                            className={cn(
                              "w-full h-9 px-3 text-sm outline-none bg-transparent text-slate-800 dark:text-slate-200",
                              col.type === "number" ? "text-right" : ""
                            )}
                          />
                        ) : (
                          <div
                            className={cn(
                              "h-9 px-3 flex items-center text-sm text-slate-700 dark:text-slate-300",
                              col.type === "number" ? "justify-end font-mono" : ""
                            )}
                          >
                            {row[col.key] || "-"}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="border border-slate-300 dark:border-slate-700 px-1 py-0">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1 h-9">
                          <button
                            onClick={() => handleSave(index)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 h-9">
                          <button
                            onClick={() => handleEdit(index, row)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Main Modal Component ---

export default function CostInputModal({ isOpen, onClose }) {
  useEscapeKey(isOpen, onClose);

  // === FUEL STATE ===
  const [fuelConsum, setFuelConsum] = useState([]);
  const [fuelConsumIndex, setFuelConsumIndex] = useState([]);
  const [apuUsage, setApuUsage] = useState([]);
  const [plfEffect, setPlfEffect] = useState([]);
  const [ccyFuel, setCcyFuel] = useState([]);
  const [allocationTable, setAllocationTable] = useState([]);

  // === MAINTENANCE STATE ===
  const [leasedReserve, setLeasedReserve] = useState([]);
  const [schMxEvents, setSchMxEvents] = useState([]);
  const [transitMx, setTransitMx] = useState([]);
  const [otherMx, setOtherMx] = useState([]);
  const [rotableChanges, setRotableChanges] = useState([]);

  // === NAVIGATION & AIRPORT STATE ===
  const [navEnr, setNavEnr] = useState([]);
  const [navTerm, setNavTerm] = useState([]);
  const [navMtowTiers, setNavMtowTiers] = useState(DEFAULT_NAV_MTOW_TIERS);
  const [navMtowTierDraft, setNavMtowTierDraft] = useState(DEFAULT_NAV_MTOW_TIERS);
  const [airportLanding, setAirportLanding] = useState([]);
  const [airportDom, setAirportDom] = useState([]);
  const [airportIntl, setAirportIntl] = useState([]);
  const [airportAvsec, setAirportAvsec] = useState([]);
  const [airportOther, setAirportOther] = useState([]);

  // === OTHER DOC STATE ===
  const [otherDoc, setOtherDoc] = useState([]);

  useEffect(() => {
    if (isOpen) {
      api.get("/cost-config")
        .then(response => {
          if (response.data && response.data.data) {
            const d = response.data.data;
            setFuelConsum(d.fuelConsum || []);
            setFuelConsumIndex(d.fuelConsumIndex || []);
            setApuUsage(d.apuUsage || []);
            setPlfEffect(d.plfEffect || []);
            setCcyFuel(d.ccyFuel || []);
            setAllocationTable(d.allocationTable || []);

            setLeasedReserve(d.leasedReserve || []);
            setSchMxEvents(d.schMxEvents || []);
            setTransitMx(d.transitMx || []);
            setOtherMx(d.otherMx || []);
            setRotableChanges(d.rotableChanges || []);

            setNavEnr(d.navEnr || []);
            setNavTerm(d.navTerm || []);
            const loadedNavTiers = normalizeNavMtowTiers(d.navMtowTiers);
            setNavMtowTiers(loadedNavTiers);
            setNavMtowTierDraft(loadedNavTiers);
            setAirportLanding(d.airportLanding || []);
            setAirportDom(d.airportDom || []);
            setAirportIntl(d.airportIntl || []);
            setAirportAvsec(d.airportAvsec || []);
            setAirportOther(d.airportOther || []);

            setOtherDoc(d.otherDoc || []);
          }
        })
        .catch(err => console.error("Error fetching cost config", err));
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      const payload = {
        allocationTable,
        fuelConsum, fuelConsumIndex, apuUsage, plfEffect, ccyFuel,
        leasedReserve, schMxEvents, transitMx, otherMx, rotableChanges,
        navMtowTiers, navEnr, navTerm, airportLanding, airportDom, airportIntl, airportAvsec, airportOther,
        otherDoc
      };

      await api.post("/cost-config", payload);
      await api.post("/apu-fuel-costs/rebuild");
      toast.success("Cost logic configurations saved successfully!");
      onClose();
    } catch (err) {
      console.error("Error saving cost config", err);
      toast.error("Failed to save cost configurations");
    }
  };

  // Allocation basis for APU fuel cost.
  const apuAllocationRowIndex = allocationTable.findIndex((row) => {
    const code = String(row?.costCode || row?.cost || row?.label || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return code === APU_FUEL_ALLOCATION_CODE;
  });
  const apuAllocationBasis = apuAllocationRowIndex >= 0
    ? normalizeAllocationBasis(allocationTable[apuAllocationRowIndex]?.basis)
    : "DEPARTURES";

  const applyNavMtowTiers = () => {
    const nextTiers = normalizeNavMtowTiers(navMtowTierDraft, navMtowTiers);
    setNavEnr((prev) => remapNavigationRows(prev, navMtowTiers, nextTiers));
    setNavTerm((prev) => remapNavigationRows(prev, navMtowTiers, nextTiers));
    setNavMtowTiers(nextTiers);
    setNavMtowTierDraft(nextTiers);
  };

  const updateApuAllocationBasis = (basis) => {
    setAllocationTable((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (apuAllocationRowIndex >= 0) {
        next[apuAllocationRowIndex] = {
          ...next[apuAllocationRowIndex],
          costCode: APU_FUEL_ALLOCATION_CODE,
          basis,
        };
        return next;
      }
      return [
        ...next,
        {
          costCode: APU_FUEL_ALLOCATION_CODE,
          basis,
        },
      ];
    });
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-[98vw] h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cost Inputs</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure and manage cost allocation tables.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 font-medium"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-12">

              {/* === SECTION: FUEL === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Fuel</h2>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-x-10 gap-y-6 items-start">
                  <FuelConsumptionTable
                    className="mb-0"
                    data={fuelConsum}
                    setData={setFuelConsum}
                  />
                  <FuelConsumptionIndexTable
                    className="mb-0"
                    data={fuelConsumIndex}
                    setData={setFuelConsumIndex}
                  />
                  <PlfEffectTable
                    className="mb-0"
                    data={plfEffect}
                    setData={setPlfEffect}
                  />
                  <ApuUsageTable
                    className="mb-0"
                    data={apuUsage}
                    setData={setApuUsage}
                  />
                  <FuelPriceTable
                    className="mb-0 xl:col-start-1"
                    data={ccyFuel}
                    setData={setCcyFuel}
                  />
                </div>
              </section>

              {/* === SECTION: MAINTENANCE === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Maintenance</h2>
                <EditableTable
                  title={
                    <span className="flex flex-col leading-tight">
                      <span>Leased aircraft</span>
                      <span>Maintenance reserve settings</span>
                    </span>
                  }
                  data={leasedReserve}
                  setData={setLeasedReserve}
                  columns={[
                    { label: "MR Acc ID", key: "mrAccId" },
                    { label: "Sch. Mx. Event", key: "schMxEvent" },
                    { label: "ACFT Regn", key: "acftRegn" },
                    { label: "PN", key: "pn" },
                    { label: "SN", key: "sn" },
                    { label: "Set balance", key: "setBalance", type: "number" },
                    { label: "Set rate", key: "setRate", type: "number" },
                    { label: "As on date", key: "asOnDate", type: "date" },
                    { label: "CCY", key: "ccy" },
                    { label: "Driver", key: "driver" },
                    { label: "Annual escl", key: "annualEscl", type: "number" },
                    { label: "Anniversary", key: "anniversary", type: "date" },
                    { label: "End date", key: "endDate", type: "date" },
                  ]}
                />
                <EditableTable
                  title="Schedule Maintenance Events calendar table"
                  data={schMxEvents}
                  setData={setSchMxEvents}
                  highlightAutoFields
                  columns={[
                    { label: "Date", key: "date", type: "date" },
                    { label: "SN/ESN/APU", key: "msnEsnApun" },
                    { label: "Sch.Mx.Event", key: "event" },
                    { label: "PN", key: "pn" },
                    { label: "SN/BN", key: "snBn" },
                    { label: "Hours", key: "hours", type: "number" },
                    { label: "Cycles", key: "cycles", type: "number" },
                    { label: "Days", key: "days", type: "number" },
                    { label: "Event total cost", key: "cost", type: "number" },
                    { label: "CCY", key: "ccy" },
                    { label: "MR Acc ID", key: "mrAccId" },
                    { label: "MR drawdown", key: "drawdownDate", type: "date" },
                    { label: "Opening bal", key: "openingBal", type: "number" },
                    { label: "MR drawdown", key: "mrDrawdown", type: "number" },
                    { label: "CCY", key: "mrDrawdownCcy" },
                    { label: "Remaining", key: "remaining", type: "number" },
                    { label: "Capitalisation", key: "capitalisation" },
                  ]}
                />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Transit maintenance"
                    data={transitMx}
                    setData={setTransitMx}
                    columns={[
                      { label: "Station", key: "depStn" },
                      { label: "Variant/ACFT", key: "variant" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "PN", key: "pn" },
                      { label: "SN", key: "sn" },
                      { label: "Cost per dep", key: "costPerDeparture", type: "number" },
                      { label: "CCY", key: "ccy" },
                      { label: "From date", key: "fromDate", type: "date" },
                      { label: "To date", key: "toDate", type: "date" },
                    ]}
                  />
                  <EditableTable
                    title="Other maintenance expenses (consumption, loan charges...etc)"
                    data={otherMx}
                    setData={setOtherMx}
                    columns={[
                      { label: "Variant/ACFT", key: "variant" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "PN", key: "pn" },
                      { label: "SN", key: "sn" },
                      { label: "Cost per BH", key: "costPerBh", type: "number" },
                      { label: "Cost per dep", key: "costPerDeparture", type: "number" },
                      { label: "Cost per mon", key: "costPerMonth", type: "number" },
                      { label: "CCY", key: "ccy" },
                      { label: "From date", key: "fromDate", type: "date" },
                      { label: "To date", key: "toDate", type: "date" },
                    ]}
                  />
                </div>
                <EditableTable
                  title="Cost of rotables changes"
                  data={rotableChanges}
                  setData={setRotableChanges}
                  sortFilter
                  columns={[
                    { label: "Label", key: "label" },
                    { label: "Date", key: "date", type: "date" },
                    { label: "PN", key: "pn" },
                    { label: "MSN", key: "msn" },
                    { label: "ACFT Regn", key: "acftRegn" },
                    { label: "Position (for PN)", key: "position" },
                    { label: "Removed SN", key: "removedSN" },
                    { label: "Installed SN", key: "installedSN" },
                    { label: "Cost", key: "cost", type: "number" },
                    { label: "CCY", key: "ccy" },
                  ]}
                />
              </section>

              {/* === SECTION: NAVIGATION === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Navigation</h2>
                <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">MTOW tiers</div>
                    </div>
                    <button
                      type="button"
                      onClick={applyNavMtowTiers}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                      Apply tiers
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {navMtowTierDraft.map((tier, index) => (
                      <Input
                        key={index}
                        value={tier}
                        onChange={(e) => {
                          const next = [...navMtowTierDraft];
                          next[index] = e.target.value;
                          setNavMtowTierDraft(next);
                        }}
                        type="number"
                        placeholder={`Tier ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
                  <CompactEditableTable
                    title="Enroute (ENR)"
                    className="max-w-full"
                    data={navEnr}
                    setData={setNavEnr}
                    columns={[
                      { label: "CCY", key: "ccy" },
                      { label: "ENR", key: "sector" },
                      ...navMtowTiers.map((tier) => ({ label: String(tier), key: String(tier), type: "number" })),
                    ]}
                  />
                  <CompactEditableTable
                    title="Terminal @ Arr Stn"
                    className="max-w-full"
                    data={navTerm}
                    setData={setNavTerm}
                    columns={[
                      { label: "CCY", key: "ccy" },
                      { label: "Terminal @ Arr Stn", key: "arrStn" },
                      ...navMtowTiers.map((tier) => ({ label: String(tier), key: String(tier), type: "number" })),
                    ]}
                  />
                </div>
              </section>

              {/* === SECTION: AIRPORT === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Airport</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Landing"
                    data={airportLanding}
                    setData={setAirportLanding}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "MTOW", key: "mtow", type: "number" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Dom flight handling"
                    data={airportDom}
                    setData={setAirportDom}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "MTOW", key: "mtow", type: "number" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Intl flight handling"
                    data={airportIntl}
                    setData={setAirportIntl}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "MTOW", key: "mtow", type: "number" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <CompactEditableTable
                    title="Other APT costs @ Arr Stn"
                    className="xl:col-span-2"
                    data={airportOther}
                    setData={setAirportOther}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "CCY", key: "ccy" },
                      ...navMtowTiers.map((tier) => ({ label: String(tier), key: String(tier), type: "number" })),
                    ]}
                  />
                  <EditableTable
                    title="AvSec"
                    data={airportAvsec}
                    setData={setAirportAvsec}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                </div>
              </section>

              {/* === SECTION: OTHER DOC & BASIS OF ALLOCATION === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Other DOC</h2>
                <EditableTable
                  title="Other DOC"
                  data={otherDoc}
                  setData={setOtherDoc}
                  columns={[
                    { label: "Label", key: "label" },
                    { label: "Sector", key: "sector" },
                    { label: "Dep Stn", key: "depStn" },
                    { label: "Arr Stn", key: "arrStn" },
                    { label: "Variant", key: "variant" },
                    { label: "ACFT Regn", key: "acftRegn" },
                    { label: "PN", key: "pn" },
                    { label: "SN", key: "sn" },
                    { label: "Per", key: "per" },
                    { label: "Cost", key: "cost", type: "number" },
                    { label: "CCY", key: "ccy" },
                    { label: "From date", key: "fromDate", type: "date" },
                    { label: "To date", key: "toDate", type: "date" },
                  ]}
                />

                <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Basis of cost allocation</h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                    <table className={modalTableClass} style={getModalTableStyle(2)}>
                      <EqualWidthColGroup count={2} />
                      <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Cost</th>
                          <th className="px-4 py-2 font-semibold">Basis of allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-600 dark:text-slate-300">
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 font-medium">APU fuel cost</td>
                          <td className="px-4 py-2">
                            <select
                              value={apuAllocationBasis}
                              onChange={(e) => updateApuAllocationBasis(e.target.value)}
                              className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {APU_FUEL_BASIS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
