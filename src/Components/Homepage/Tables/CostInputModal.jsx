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

function Input({ value, onChange, placeholder, type = "text", className }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500",
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
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> Sector
          </button>
          <button
            onClick={addAircraft}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> ACFT
          </button>
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">Fuel Kg</th>
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">GCD</th>
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
              <th className="w-9 border border-slate-300 dark:border-slate-700" />
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
                      <div className="h-8 bg-slate-100 dark:bg-slate-800" />
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 p-0">
                    {sectorRow ? (
                      <div className="h-8 bg-slate-100 dark:bg-slate-800" />
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
                      <div className="h-8 bg-slate-100 dark:bg-slate-800" />
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
  const isSectorRow = (row) => (row.rowType ? row.rowType === "sector" : !row.acftRegn);

  const updateRow = (index, key, value) => {
    setData(data.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const updateSectorGroup = (index, key, value) => {
    const next = data.map((row) => ({ ...row }));
    next[index][key] = value;

    for (let rowIndex = index + 1; rowIndex < next.length; rowIndex += 1) {
      if (isSectorRow(next[rowIndex])) break;
      next[rowIndex][key] = value;
    }

    setData(next);
  };

  const addSector = () => {
    setData([...data, { rowType: "sector", sectorOrGcd: "", gcd: "" }]);
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

    setData([...data, { rowType: "aircraft", sectorOrGcd, gcd, acftRegn: "", p50: "", p60: "", p75: "", p100: "" }]);
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  const rows = data.length ? data : [{ rowType: "sector", sectorOrGcd: "", gcd: "" }];

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">PLF Effect</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={addSector}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> Sector
          </button>
          <button
            onClick={addAircraft}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Plus size={14} /> ACFT
          </button>
        </div>
      </div>
      <div className="flex items-start">
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-900">
                <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">PLF effect</th>
                <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">GCD</th>
                {[
                  ["50%", "p50"],
                  ["60%", "p60"],
                  ["75%", "p75"],
                  ["100%", "p100"],
                ].map(([label]) => (
                  <th key={label} className="min-w-[88px] border border-slate-300 dark:border-slate-700 px-2 py-1 text-right text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {label}
                  </th>
                ))}
                <th className="w-9 border border-slate-300 dark:border-slate-700" />
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
                            setData([{ rowType: "sector", sectorOrGcd: e.target.value, gcd: "" }]);
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
                              setData([{ rowType: "sector", sectorOrGcd: "", gcd: e.target.value }]);
                              return;
                            }
                            updateSectorGroup(index, "gcd", e.target.value);
                          }}
                          type="number"
                          placeholder="GCD"
                          className="border-0 rounded-none text-right bg-slate-50 dark:bg-slate-800/60"
                        />
                      ) : (
                        <div className="h-8 bg-slate-100 dark:bg-slate-800" />
                      )}
                    </td>
                    {[
                      ["p50", row.p50],
                      ["p60", row.p60],
                      ["p75", row.p75],
                      ["p100", row.p100],
                    ].map(([key, value]) => (
                      <td key={key} className="border border-slate-300 dark:border-slate-700 p-0">
                        {sectorRow ? (
                          <div className="h-8 bg-slate-100 dark:bg-slate-800" />
                        ) : (
                          <Input
                            value={value}
                            onChange={(e) => updateRow(index, key, e.target.value)}
                            type="number"
                            className="border-0 rounded-none text-right"
                          />
                        )}
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
    </div>
  );
}

function FuelConsumptionIndexTable({ data, setData, className }) {
  const monthKeys = [
    ["month1", "m1"],
    ["month2", "m2"],
    ["month3", "m3"],
    ["month4", "m4"],
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
        m1: "",
        m2: "",
        m3: "",
        m4: "",
      },
    ]);
  };

  const deleteRow = (index) => {
    setData(data.filter((_, rowIndex) => rowIndex !== index));
  };

  const rows = data.length ? data : [{ acftRegn: "", m1: "", m2: "", m3: "", m4: "" }];

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fuel Consumption Index</h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-900">
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">Fuel consum</th>
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
              <th className="w-9 border border-slate-300 dark:border-slate-700" />
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
                          setData([{ acftRegn: e.target.value, m1: "", m2: "", m3: "", m4: "" }]);
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

// A simple editable table component
function EditableTable({ title, columns, data, setData, className, titleNote, sortFilter = false }) {
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
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            {sortFilter && (
              <tr>
                {columns.map((col) => (
                  <th key={`${col.key}-filter`} className="px-1 py-1 text-xs font-medium text-slate-500">
                    <input
                      value={filters[col.key] || ""}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      placeholder="Sort+Filter"
                      className="w-full min-w-[90px] px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
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
                    "px-3 py-2 text-xs font-medium text-slate-500 uppercase",
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
              <th className="px-3 py-2 text-xs font-medium text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-slate-400 text-xs italic">
                  {data.length === 0 ? 'No data. Click "Add Row" to start.' : "No rows match the filters."}
                </td>
              </tr>
            )}
            {visibleRows.map(({ row, index }) => {
              const isEditing = editingIndex === index;
              return (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-3 py-2", col.cellClassName)}>
                      {isEditing ? (
                        <Input
                          value={editRow[col.key]}
                          onChange={(e) => setEditRow({ ...editRow, [col.key]: e.target.value })}
                          type={col.type || "text"}
                        />
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">
                          {row[col.key] || <span className="text-slate-400">-</span>}
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

// --- Main Modal Component ---

export default function CostInputModal({ isOpen, onClose }) {
  useEscapeKey(isOpen, onClose);

  // === FUEL STATE ===
  const [fuelConsum, setFuelConsum] = useState([]);
  const [fuelConsumIndex, setFuelConsumIndex] = useState([]);
  const [apuUsage, setApuUsage] = useState([]);
  const [plfEffect, setPlfEffect] = useState([]);
  const [ccyFuel, setCcyFuel] = useState([]);

  // === MAINTENANCE STATE ===
  const [leasedReserve, setLeasedReserve] = useState([]);
  const [schMxEvents, setSchMxEvents] = useState([]);
  const [transitMx, setTransitMx] = useState([]);
  const [otherMx, setOtherMx] = useState([]);
  const [rotableChanges, setRotableChanges] = useState([]);

  // === NAVIGATION & AIRPORT STATE ===
  const [navEnr, setNavEnr] = useState([]);
  const [navTerm, setNavTerm] = useState([]);
  const [airportLanding, setAirportLanding] = useState([]);
  const [airportDom, setAirportDom] = useState([]);
  const [airportIntl, setAirportIntl] = useState([]);
  const [airportAvsec, setAirportAvsec] = useState([]);

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

            setLeasedReserve(d.leasedReserve || []);
            setSchMxEvents(d.schMxEvents || []);
            setTransitMx(d.transitMx || []);
            setOtherMx(d.otherMx || []);
            setRotableChanges(d.rotableChanges || []);

            setNavEnr(d.navEnr || []);
            setNavTerm(d.navTerm || []);
            setAirportLanding(d.airportLanding || []);
            setAirportDom(d.airportDom || []);
            setAirportIntl(d.airportIntl || []);
            setAirportAvsec(d.airportAvsec || []);

            setOtherDoc(d.otherDoc || []);
          }
        })
        .catch(err => console.error("Error fetching cost config", err));
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      const payload = {
        fuelConsum, fuelConsumIndex, apuUsage, plfEffect, ccyFuel,
        leasedReserve, schMxEvents, transitMx, otherMx, rotableChanges,
        navEnr, navTerm, airportLanding, airportDom, airportIntl, airportAvsec,
        otherDoc
      };

      await api.post("/cost-config", payload);
      toast.success("Cost logic configurations saved successfully!");
      onClose();
    } catch (err) {
      console.error("Error saving cost config", err);
      toast.error("Failed to save cost configurations");
    }
  };

  // Default basis of allocation (read-only presentation)
  const basisOfAllocation = [
    { cost: "APU fuel cost", basis: "The month, each month" },
    { cost: "Maintenance reserve cont", basis: "The specific SN in the month, each month" },
    { cost: "Remaining in Schedule Mx", basis: "The specific SN in the period of time from start date of Master table..." },
    { cost: "Other maintenance expen", basis: "The specific SN in the month, each month" },
    { cost: "Cost of rotables changes", basis: "The specific ACFT Regn in the month, each month" },
  ];

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
            className="relative w-full max-w-7xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
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
                  <EditableTable
                    title="APU Usage"
                    className="mb-0"
                    data={apuUsage}
                    setData={setApuUsage}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "From date", key: "fromDate", type: "date" },
                      { label: "To date", key: "toDate", type: "date" },
                      { label: "Variant", key: "variant" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "GT Min", key: "apuHours", type: "number" },
                      { label: "GT Max", key: "gtMax", type: "number" },
                      { label: "Addln mins", key: "addlnMins", type: "number" },
                      { label: "Consumption/APUHr", key: "consumptionPerApuHour", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="CCY"
                    className="mb-0 xl:col-start-1"
                    data={ccyFuel}
                    setData={setCcyFuel}
                    columns={[
                      { label: "CCY", key: "ccy" },
                      { label: "Into plane", key: "station" },
                      { label: "Month", key: "month" },
                      { label: "Price/Other Stn", key: "intoPlaneRate", type: "number" },
                      { label: "Kg/Ltr", key: "kgPerLtr", type: "number" },
                      { label: "RCCY", key: "costRCCY", type: "number" },
                    ]}
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Enroute (ENR)"
                    data={navEnr}
                    setData={setNavEnr}
                    columns={[
                      { label: "Sector", key: "sector" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Terminal"
                    data={navTerm}
                    setData={setNavTerm}
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
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
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
                  <EditableTable
                    title="Dom flight handling"
                    data={airportDom}
                    setData={setAirportDom}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
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

                {/* <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Basis of cost allocation</h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Cost</th>
                          <th className="px-4 py-2 font-semibold">Basis of allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-600 dark:text-slate-300">
                        {basisOfAllocation.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-2 font-medium">{item.cost}</td>
                            <td className="px-4 py-2">{item.basis}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div> */}
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
