import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, LayoutDashboard, Download, Layers, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const BLANK_OPTION_VALUE = "__BLANK__";

const getPeriodSortKey = (dateStr, periodicity) => {
  if (!dateStr) return "Unknown";

  let d = new Date(dateStr);

  if (
    Number.isNaN(d.getTime()) &&
    typeof dateStr === "string" &&
    dateStr.split("-").length === 3
  ) {
    const parts = dateStr.split("-");
    if (parts[2]?.length === 4) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }

  if (Number.isNaN(d.getTime())) return "Unknown";

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  switch (periodicity) {
    case "annually":
      return `${year}-12-31`;

    case "monthly": {
      const lastDay = new Date(year, month, 0);
      const mm = String(lastDay.getMonth() + 1).padStart(2, "0");
      const dd = String(lastDay.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }

    case "quarterly": {
      const q = Math.ceil(month / 3);
      const lastMonthOfQ = q * 3;
      const lastDay = new Date(year, lastMonthOfQ, 0);
      const mm = String(lastMonthOfQ).padStart(2, "0");
      const dd = String(lastDay.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }

    case "weekly": {
      const dayOfWeek = d.getDay();
      const diffToSunday = 7 - dayOfWeek;
      const weekEnd = new Date(d);
      weekEnd.setDate(d.getDate() + (dayOfWeek === 0 ? 0 : diffToSunday));

      const mm = String(weekEnd.getMonth() + 1).padStart(2, "0");
      const dd = String(weekEnd.getDate()).padStart(2, "0");

      return `${weekEnd.getFullYear()}-${mm}-${dd}`;
    }

    case "daily": {
      const mm = String(month).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }

    default:
      return `${year}-${String(month).padStart(2, "0")}-01`;
  }
};

const formatHeaderDate = (inputDate) => {
  if (!inputDate || inputDate === "Unknown") return "Unknown";

  const date = parseDateValue(inputDate) || new Date(inputDate);
  if (Number.isNaN(date.getTime())) return inputDate;

  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const year = String(date.getFullYear()).slice(-2);

  return `${day} ${month} ${year}`;
};

const parseDateValue = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return Number.isNaN(dateStr.getTime())
      ? null
      : new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }

  if (typeof dateStr === "string") {
    const trimmed = dateStr.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const dayFirstMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dayFirstMatch) {
      return new Date(Number(dayFirstMatch[3]), Number(dayFirstMatch[2]) - 1, Number(dayFirstMatch[1]));
    }
  }

  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatPeriodKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildMasterPeriodColumns = (startDateValue, endDateValue, periodicity) => {
  const startDate = parseDateValue(startDateValue);
  const endDate = parseDateValue(endDateValue);

  if (!startDate || !endDate || startDate > endDate) return [];

  const columns = [];
  const addColumn = (date) => columns.push(getPeriodSortKey(formatPeriodKey(date), periodicity));

  if (periodicity === "daily") {
    const current = new Date(startDate);
    while (current <= endDate) {
      addColumn(current);
      current.setDate(current.getDate() + 1);
    }
    return [...new Set(columns)].sort();
  }

  if (periodicity === "weekly") {
    const firstWeekEndKey = getPeriodSortKey(formatPeriodKey(startDate), "weekly");
    const lastWeekEndKey = getPeriodSortKey(formatPeriodKey(endDate), "weekly");
    const current = parseDateValue(firstWeekEndKey);
    const last = parseDateValue(lastWeekEndKey);

    while (current && last && current <= last) {
      columns.push(formatPeriodKey(current));
      current.setDate(current.getDate() + 7);
    }
    return columns;
  }

  if (periodicity === "monthly") {
    const current = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const last = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    while (current <= last) {
      columns.push(formatPeriodKey(current));
      current.setMonth(current.getMonth() + 2, 0);
    }
    return columns;
  }

  if (periodicity === "quarterly") {
    const startQuarterEndMonth = Math.ceil((startDate.getMonth() + 1) / 3) * 3;
    const endQuarterEndMonth = Math.ceil((endDate.getMonth() + 1) / 3) * 3;
    const current = new Date(startDate.getFullYear(), startQuarterEndMonth, 0);
    const last = new Date(endDate.getFullYear(), endQuarterEndMonth, 0);

    while (current <= last) {
      columns.push(formatPeriodKey(current));
      current.setMonth(current.getMonth() + 4, 0);
    }
    return columns;
  }

  if (periodicity === "annually") {
    const current = new Date(startDate.getFullYear(), 11, 31);
    const last = new Date(endDate.getFullYear(), 11, 31);

    while (current <= last) {
      columns.push(formatPeriodKey(current));
      current.setFullYear(current.getFullYear() + 1);
    }
    return columns;
  }

  return [];
};

const formatMetricValue = (metricKey, value) => {
  const numeric = Number(value || 0);

  if (String(metricKey || "").toLowerCase().includes("rev") || String(metricKey || "").toLowerCase().includes("rate") || String(metricKey || "").toLowerCase().includes("fare")) {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (metricKey === "cargoT") {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return Math.round(numeric).toLocaleString();
};

const toRevenueNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const getRowRevenueMetrics = (row) => {
  const pax = toRevenueNumber(row.pax);
  const cargoT = toRevenueNumber(row.cargoT);
  const legPaxRev = toRevenueNumber(row.legPaxRev) || pax * toRevenueNumber(row.legFare);
  const legCargoRev = toRevenueNumber(row.legCargoRev) || cargoT * toRevenueNumber(row.legRate);
  const odPaxRev = toRevenueNumber(row.odPaxRev) || pax * (toRevenueNumber(row.odFare) || toRevenueNumber(row.legFare));
  const odCargoRev = toRevenueNumber(row.odCargoRev) || cargoT * (toRevenueNumber(row.odRate) || toRevenueNumber(row.legRate));
  const usesLegPricing = Boolean(row.applySSPricing);
  const fallbackPaxRev = usesLegPricing
    ? toRevenueNumber(row.rccyLegPaxRev) || legPaxRev
    : toRevenueNumber(row.rccyOdPaxRev) || odPaxRev || toRevenueNumber(row.rccyLegPaxRev) || legPaxRev;
  const fallbackCargoRev = usesLegPricing
    ? toRevenueNumber(row.rccyLegCargoRev) || legCargoRev
    : toRevenueNumber(row.rccyOdCargoRev) || odCargoRev || toRevenueNumber(row.rccyLegCargoRev) || legCargoRev;
  const rccyPaxRev = toRevenueNumber(row.fnlRccyPaxRev) || fallbackPaxRev;
  const rccyCargoRev = toRevenueNumber(row.fnlRccyCargoRev) || fallbackCargoRev;

  return {
    pax,
    cargoT,
    fnlRccyPaxRev: rccyPaxRev,
    fnlRccyCargoRev: rccyCargoRev,
    fnlRccyTotalRev: toRevenueNumber(row.fnlRccyTotalRev) || rccyPaxRev + rccyCargoRev,
    odPaxRev,
    odCargoRev,
    odTotalRev: toRevenueNumber(row.odTotalRev) || odPaxRev + odCargoRev,
    legPaxRev,
    legCargoRev,
    legTotalRev: toRevenueNumber(row.legTotalRev) || legPaxRev + legCargoRev,
  };
};

const normalizeRowValue = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : "(blank)";
};

const MultiSelectDropdown = ({
  placeholder,
  options = [],
  onChange,
  selected = [],
  buttonClassName = "",
  menuClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt) => {
    const alreadySelected = selected.some((item) => item.value === opt.value);
    const next = alreadySelected
      ? selected.filter((item) => item.value !== opt.value)
      : [...selected, opt];

    if (onChange) onChange(next);
  };

  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400",
          buttonClassName
        )}
      >
        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn("text-slate-400 transition-transform ml-2", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              "absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar",
              menuClassName
            )}
          >
            {safeOptions.map((opt) => {
              const isSelected = selected.some((item) => item.value === opt.value);

              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt)}
                  className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors shrink-0",
                      isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-600"
                    )}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 truncate">{opt.label}</span>
                </div>
              );
            })}
            {safeOptions.length === 0 && (
              <div className="p-3 text-sm text-slate-400 text-center">No options</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SingleSelectDropdown = ({
  placeholder,
  options = [],
  onChange,
  selected,
  buttonClassName = "",
  menuClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all duration-200 bg-white dark:bg-slate-900/50",
          isOpen
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400",
          buttonClassName
        )}
      >
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn("text-slate-400 transition-transform ml-2", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              "absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar",
              menuClassName
            )}
          >
            {safeOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  setIsOpen(false);
                  if (onChange) onChange(opt);
                }}
                className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PERIODICITY_OPTIONS = [
  { label: "Annually", value: "annually" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
];

const METRIC_OPTIONS = [
  { label: "Pax", value: "pax" },
  { label: "Cargo T", value: "cargoT" },
  { label: "Pax Revenue", value: "fnlRccyPaxRev" },
  { label: "Cargo Revenue", value: "fnlRccyCargoRev" },
  { label: "Total Revenue", value: "fnlRccyTotalRev" },
  { label: "OD Pax Revenue", value: "odPaxRev" },
  { label: "OD Cargo Revenue", value: "odCargoRev" },
  { label: "OD Total Revenue", value: "odTotalRev" },
  { label: "Leg Pax Revenue", value: "legPaxRev" },
  { label: "Leg Cargo Revenue", value: "legCargoRev" },
  { label: "Leg Total Revenue", value: "legTotalRev" },
  { label: "Average Fare", value: "averageFare" },
  { label: "Average Cargo Rate", value: "averageCargoRate" },
];

const REVENUE_LABEL_OPTIONS = [
  { label: "Domestic OD", value: "domestic_od" },
  { label: "International OD", value: "international_od" },
  { label: "Domestic Sector", value: "domestic_sector" },
  { label: "International Sector", value: "international_sector" },
];

const GROUPING_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Dep Stn", value: "depStn" },
  { label: "Arr Stn", value: "arrStn" },
  { label: "Sector", value: "sector" },
  { label: "Variant", value: "variant" },
  { label: "POO", value: "poo" },
  { label: "OD", value: "od" },
  { label: "Flight #", value: "flightNumber" },
  { label: "User Tag 1", value: "userTag1" },
  { label: "User Tag 2", value: "userTag2" },
  { label: "Stop", value: "stops" },
  { label: "AL", value: "al" },
  { label: "OD DI", value: "odDI" },
  { label: "Leg DI", value: "legDI" },
  { label: "Identifier", value: "identifier" },
  { label: "Traffic Type", value: "trafficType" },
];

const TRAFFIC_CLASS_OPTIONS = [
  { label: "Leg", value: "leg" },
  { label: "Beyond", value: "beyond" },
  { label: "Behind", value: "behind" },
  { label: "Transit", value: "transit" },
  { label: "Interline", value: "interline" },
  { label: "Codeshare", value: "codeshare" },
];

const createInitialFilters = () => ({
  from: [],
  to: [],
  sector: [],
  flight: [],
  poo: [],
  variant: [],
  userTag1: [],
  userTag2: [],
  od: [],
  identifier: [],
  stop: [],
  al: [],
  odDI: [],
  legDI: [],
  trafficClass: [],
  revenueLabel: [],
  metrics: [METRIC_OPTIONS[2]],
});

const RevenuePage = () => {
  const [loading, setLoading] = useState(false);
  const [rawRows, setRawRows] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    from: [],
    to: [],
    sector: [],
    flight: [],
    poo: [],
    variant: [],
    userTag1: [],
    userTag2: [],
    od: [],
    identifier: [],
    stop: [],
    al: [],
    odDI: [],
    legDI: [],
  });
  const [filters, setFilters] = useState(createInitialFilters());
  const [periodicity, setPeriodicity] = useState(PERIODICITY_OPTIONS[2]);
  const [masterDateRange, setMasterDateRange] = useState({ minDate: "", maxDate: "" });
  const [level1, setLevel1] = useState(null);
  const [level2, setLevel2] = useState(null);
  const [level3, setLevel3] = useState(null);

  useEffect(() => {
    const loadMasterDateRange = async () => {
      try {
        const response = await api.get("/master-weeks");
        setMasterDateRange({
          minDate: response.data?.minDate || "",
          maxDate: response.data?.maxDate || "",
        });
      } catch (error) {
        console.error("Error fetching master date range:", error);
        setMasterDateRange({ minDate: "", maxDate: "" });
      }
    };

    loadMasterDateRange();
  }, []);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const response = await api.get("/dashboard/populateDropDowns");
        const payload = response.data || {};

        setDropdownOptions({
          from: payload.from || [],
          to: payload.to || [],
          sector: payload.sector || [],
          flight: payload.flight || [],
          poo: payload.poo || [],
          variant: payload.variant || [],
          userTag1: payload.userTag1 || [],
          userTag2: payload.userTag2 || [],
          od: payload.od || [],
          identifier: payload.identifier || [],
          stop: payload.stop || [],
          al: payload.al || [],
          odDI: payload.odDI || [],
          legDI: payload.legDI || [],
        });
      } catch (error) {
        console.error("Error fetching revenue dropdowns:", error);
        toast.error("Failed to load revenue dropdowns.");
      }
    };

    loadDropdowns();
  }, []);

  useEffect(() => {
    const fetchRevenueRows = async () => {
      try {
        setLoading(true);

        const serializeValues = (items = []) =>
          items.map((item) => item.value).filter((value) => value !== undefined).join(",");

        const params = {
          mode: "detail",
          from: serializeValues(filters.from),
          to: serializeValues(filters.to),
          sector: serializeValues(filters.sector),
          flight: serializeValues(filters.flight),
          poo: serializeValues(filters.poo),
          variant: serializeValues(filters.variant),
          userTag1: serializeValues(filters.userTag1),
          userTag2: serializeValues(filters.userTag2),
          od: serializeValues(filters.od),
          identifier: serializeValues(filters.identifier),
          stop: serializeValues(filters.stop),
          al: serializeValues(filters.al),
          odDI: serializeValues(filters.odDI),
          legDI: serializeValues(filters.legDI),
          trafficClass: serializeValues(filters.trafficClass),
          label: serializeValues(filters.revenueLabel),
        };

        Object.keys(params).forEach((key) => {
          if (!params[key]) delete params[key];
        });

        const response = await api.get("/revenue", { params });
        const rows = response.data?.rows || [];
        setRawRows(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
        setRawRows([]);
        toast.error("Failed to load revenue data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueRows();
  }, [filters]);

  const { tableColumns, tableData } = useMemo(() => {
    const selectedMetrics = filters.metrics?.length ? filters.metrics : [METRIC_OPTIONS[2]];
    const groupLevels = [level1, level2, level3].filter((level) => level && level.value !== "none");
    const periodSet = new Set(
      buildMasterPeriodColumns(masterDateRange.minDate, masterDateRange.maxDate, periodicity.value)
    );

    const processedRows = rawRows.map((row) => {
      const periodKey = getPeriodSortKey(row.date, periodicity.value);
      periodSet.add(periodKey);

      const metricValues = getRowRevenueMetrics(row);

      return {
        ...row,
        _periodKey: periodKey,
        _metricValues: {
          ...metricValues,
          averageFare: metricValues.pax > 0 ? metricValues.fnlRccyPaxRev / metricValues.pax : 0,
          averageCargoRate: metricValues.cargoT > 0 ? metricValues.fnlRccyCargoRev / metricValues.cargoT : 0,
        },
      };
    });

    const sortedColumns = Array.from(periodSet).sort();
    if (!sortedColumns.length) {
      return { tableColumns: [], tableData: [] };
    }

    const columnIndexMap = {};

    sortedColumns.forEach((column, index) => {
      columnIndexMap[column] = index;
    });

    const createZeroArray = () => Array(sortedColumns.length).fill(0);
    const finalRows = [];
    let idCounter = 1;

    const buildMetricRows = (subset, depth, label, type, pathKey) => {
      selectedMetrics.forEach((metric, metricIndex) => {
        const totals = createZeroArray();

        subset.forEach((row) => {
          const columnIndex = columnIndexMap[row._periodKey];
          if (columnIndex !== undefined) {
            totals[columnIndex] += Number(row._metricValues[metric.value] || 0);
          }
        });

        finalRows.push({
          id: `${pathKey}-${metric.value}-${metricIndex}-${idCounter++}`,
          type,
          label,
          metricLabel: metric.label,
          metricKey: metric.value,
          level: depth,
          data: totals,
          isGrandTotal: false,
        });
      });
    };

    const buildTree = (subset, depth, parentPath = "root") => {
      if (depth >= groupLevels.length) {
        buildMetricRows(subset, depth, "Metric", "Metric", `${parentPath}-metric`);
        return;
      }

      const groupField = groupLevels[depth].value;
      const groupLabel = groupLevels[depth].label;
      const groups = {};

      subset.forEach((row) => {
        const key = normalizeRowValue(row[groupField]);
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });

      Object.keys(groups)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
        .forEach((key) => {
          const groupSubset = groups[key];
          const nextPath = `${parentPath}-${groupField}-${key}`;

          buildMetricRows(groupSubset, depth, key, groupLabel, nextPath);
          buildTree(groupSubset, depth + 1, nextPath);
        });
    };

    buildTree(processedRows, 0);

    const grandTotals = selectedMetrics.map((metric, metricIndex) => {
      const totals = createZeroArray();

      processedRows.forEach((row) => {
        const columnIndex = columnIndexMap[row._periodKey];
        if (columnIndex !== undefined) {
          totals[columnIndex] += Number(row._metricValues[metric.value] || 0);
        }
      });

      return {
        id: `grand-total-${metric.value}-${metricIndex}`,
        type: "Grand Total",
        label: "Grand Total",
        metricLabel: metric.label,
        metricKey: metric.value,
        level: 0,
        data: totals,
        isGrandTotal: true,
      };
    });

    return {
      tableColumns: sortedColumns,
      tableData: [...grandTotals, ...finalRows],
    };
  }, [filters.metrics, level1, level2, level3, masterDateRange, periodicity, rawRows]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const downloadExcel = () => {
    if (!tableData.length) {
      toast.warn("No data available to export.");
      return;
    }

    try {
      const headers = [
        "Hierarchy / Grouping",
        "Metric",
        ...tableColumns.map((column) => formatHeaderDate(column)),
      ];

      const excelRows = tableData.map((row) => [
        `${"    ".repeat(row.level)}${row.label}`,
        row.metricLabel,
        ...row.data.map((value) => formatMetricValue(row.metricKey, value)),
      ]);

      const selectedMetrics = filters.metrics?.length ? filters.metrics : [METRIC_OPTIONS[2]];
      const selectedGroups = [level1, level2, level3]
        .filter((level) => level && level.value !== "none")
        .map((level) => level.label);
      const filterRows = Object.entries(filters)
        .filter(([key]) => key !== "metrics")
        .map(([key, values]) => [
          key,
          Array.isArray(values) && values.length
            ? values.map((item) => item.label || item.value).join(", ")
            : "All",
        ]);

      const metadataRows = [
        ["Applied Filters"],
        ...filterRows,
        [],
        ["Periodicity", periodicity.label],
        ["Grouping Levels", selectedGroups.length ? selectedGroups.join(" > ") : "None"],
        ["Selected Metrics", selectedMetrics.map((metric) => metric.label).join(", ")],
        [],
      ];

      const worksheetData = [...metadataRows, headers, ...excelRows];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      ws["!cols"] = [
        { wch: 42 },
        { wch: 18 },
        ...tableColumns.map(() => ({ wch: 16 })),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Revenue");
      XLSX.writeFile(wb, "Revenue_Export.xlsx");
      toast.success("Excel exported successfully!");
    } catch (error) {
      console.error("Error exporting revenue:", error);
      toast.error("Failed to export revenue data.");
    }
  };

  const primaryFilterFields = [
    { key: "from", placeholder: "Dep Stn", options: dropdownOptions.from },
    { key: "to", placeholder: "Arr Stn", options: dropdownOptions.to },
    { key: "sector", placeholder: "Sector", options: dropdownOptions.sector },
    { key: "variant", placeholder: "Variant", options: dropdownOptions.variant },
    { key: "poo", placeholder: "POO", options: dropdownOptions.poo },
    { key: "flight", placeholder: "Flight #", options: dropdownOptions.flight },
    { key: "userTag1", placeholder: "User Tag 1", options: dropdownOptions.userTag1 },
    { key: "userTag2", placeholder: "User Tag 2", options: dropdownOptions.userTag2 },
  ];

  return (
    <div className="w-full h-full p-6 space-y-6 flex flex-col min-h-[calc(100vh-180px)]">
      <div className="flex flex-col gap-6 relative z-50">
        <div className="w-full p-5 rounded-xl border-2 border-indigo-400/40 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm relative">
          <div className="absolute -top-3 left-4 bg-slate-50 dark:bg-slate-950 px-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <LayoutDashboard size={14} /> Filter Criteria
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MultiSelectDropdown
                placeholder="Revenue Label"
                options={REVENUE_LABEL_OPTIONS}
                selected={filters.revenueLabel}
                onChange={(value) => updateFilter("revenueLabel", value)}
              />
              <SingleSelectDropdown
                placeholder="Periodicity"
                options={PERIODICITY_OPTIONS}
                selected={periodicity}
                onChange={setPeriodicity}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 p-3 bg-white/40 dark:bg-slate-900/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-lg shadow-inner">
              {primaryFilterFields.map((field) => (
                <MultiSelectDropdown
                  key={field.key}
                  placeholder={field.placeholder}
                  options={field.options}
                  selected={filters[field.key]}
                  onChange={(value) => updateFilter(field.key, value)}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-white/40 dark:bg-slate-900/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-lg shadow-inner">
              <MultiSelectDropdown
                placeholder="Traffic Class"
                options={TRAFFIC_CLASS_OPTIONS}
                selected={filters.trafficClass}
                onChange={(value) => updateFilter("trafficClass", value)}
              />
              <MultiSelectDropdown
                placeholder="Stop"
                options={dropdownOptions.stop}
                selected={filters.stop}
                onChange={(value) => updateFilter("stop", value)}
              />
              <MultiSelectDropdown
                placeholder="AL"
                options={dropdownOptions.al}
                selected={filters.al}
                onChange={(value) => updateFilter("al", value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[120px_minmax(0,1fr)] gap-3 items-start p-3 bg-white/40 dark:bg-slate-900/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-lg shadow-inner">
              <MultiSelectDropdown
                placeholder="Metrics"
                options={METRIC_OPTIONS}
                selected={filters.metrics}
                onChange={(value) => updateFilter("metrics", value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Layers size={16} className="text-indigo-500" /> Grouping:
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32">
                <SingleSelectDropdown options={GROUPING_OPTIONS} selected={level1} onChange={setLevel1} />
              </div>
              <span className="text-slate-300">&gt;</span>
              <div className="w-32">
                <SingleSelectDropdown options={GROUPING_OPTIONS} selected={level2} onChange={setLevel2} />
              </div>
              <span className="text-slate-300">&gt;</span>
              <div className="w-32">
                <SingleSelectDropdown options={GROUPING_OPTIONS} selected={level3} onChange={setLevel3} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Download size={14} /> Export
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50">
              <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
              <span className="text-sm font-medium text-slate-600">Loading...</span>
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[260px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] text-xs font-bold uppercase text-slate-500">
                  Grouping
                </th>
                <th className="sticky left-[260px] z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[140px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] text-xs font-bold uppercase text-slate-500">
                  Metric
                </th>
                {tableColumns.map((column) => (
                  <th
                    key={column}
                    className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-r border-slate-300 dark:border-slate-700 p-3 min-w-[110px] text-center text-sm font-bold text-slate-800 dark:text-slate-200"
                  >
                    {formatHeaderDate(column)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white/50 dark:bg-slate-900/50">
              {tableData.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "group transition-colors",
                    row.isGrandTotal
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-500/30"
                      : "hover:bg-indigo-50/50 dark:hover:bg-slate-800/30"
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 backdrop-blur border-r border-b border-slate-200 dark:border-slate-800 p-3 text-sm shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]",
                      row.isGrandTotal
                        ? "bg-emerald-50/95 dark:bg-emerald-900/95 text-emerald-700 dark:text-emerald-400 font-black"
                        : "bg-white/95 dark:bg-slate-900/95 group-hover:bg-indigo-50/90 dark:group-hover:bg-slate-800/90",
                      row.level === 0 && !row.isGrandTotal && "font-bold text-slate-800 dark:text-slate-100",
                      row.level === 1 && !row.isGrandTotal && "pl-8 font-semibold text-slate-700",
                      row.level >= 2 && !row.isGrandTotal && "pl-14 font-medium text-slate-600"
                    )}
                  >
                    {row.label}
                  </td>
                  <td
                    className={cn(
                      "sticky left-[260px] z-10 backdrop-blur border-r border-b border-slate-200 dark:border-slate-800 p-3 text-sm shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]",
                      row.isGrandTotal
                        ? "bg-emerald-50/95 dark:bg-emerald-900/95 text-emerald-700 dark:text-emerald-400 font-black"
                        : "bg-white/95 dark:bg-slate-900/95 group-hover:bg-indigo-50/90 dark:group-hover:bg-slate-800/90 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {row.metricLabel}
                  </td>
                  {row.data.map((value, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className={cn(
                        "p-3 border-r border-b border-slate-200 dark:border-slate-800 text-center text-sm tabular-nums",
                        row.isGrandTotal
                          ? "text-emerald-700 dark:text-emerald-400 font-black"
                          : "text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {formatMetricValue(row.metricKey, value)}
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && tableData.length === 0 && (
                <tr>
                  <td colSpan={tableColumns.length + 2} className="p-6 text-center text-slate-500 italic">
                    No revenue data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenuePage;
