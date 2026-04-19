import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../../apiConfig";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, DollarSign, Filter, Search } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import PropTypes from "prop-types";
import { toast } from "react-toastify";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const LABEL_OPTIONS = [
  { label: "Domestic OD", value: "domestic_od" },
  { label: "International OD", value: "international_od" },
  { label: "Domestic Sector", value: "domestic_sector" },
  { label: "International Sector", value: "international_sector" },
];

const PERIODICITY_OPTIONS = [
  { label: "Annually", value: "annually" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
];

const TRAFFIC_OPTIONS = [
  { label: "Leg", value: "leg" },
  { label: "Beyond", value: "beyond" },
  { label: "Behind", value: "behind" },
  { label: "Transit", value: "transit" },
  { label: "Interline", value: "interline" },
  { label: "Codeshare", value: "codeshare" },
];

const METRIC_OPTIONS = [
  { label: "Pax", value: "pax" },
  { label: "CargoT", value: "cargoT" },
  { label: "Pax revenue", value: "paxRev" },
  { label: "Cargo revenue", value: "cargoRev" },
];

const GROUP_BY_OPTIONS = [
  { label: "POO", value: "poo" },
  { label: "OD", value: "od" },
  { label: "Sector", value: "sector" },
  { label: "Flight #", value: "flightNumber" },
  { label: "Stop", value: "stops" },
  { label: "Identifier", value: "identifier" },
];

const createInitialRouteFilters = () => ({
  from: [],
  to: [],
  sector: [],
  variant: [],
  poo: [],
  flight: [],
  userTag1: [],
  userTag2: [],
});

const MultiSelectDropdown = ({ placeholder, options = [], value = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    const isSelected = value.some((item) => item.value === option.value);
    const nextValue = isSelected
      ? value.filter((item) => item.value !== option.value)
      : [...value, option];

    onChange?.(nextValue);
  };

  const summary = value.length === 0
    ? placeholder
    : value.length <= 2
      ? value.map((item) => item.label).join(", ")
      : `${value.length} selected`;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200",
          isOpen
            ? "border-indigo-500 bg-white shadow-md shadow-indigo-500/10"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 top-full z-50 mt-2 w-full min-w-[200px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {options.map((option) => {
                const isSelected = value.some((item) => item.value === option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-300 dark:border-slate-600"
                      )}
                    >
                      {isSelected ? <Check size={11} className="text-white" /> : null}
                    </span>
                    <span className="truncate">{option.label}</span>
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

const SingleSelectDropdown = ({ placeholder, options = [], value = null, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const label = value?.label || placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200",
          isOpen
            ? "border-indigo-500 bg-white shadow-md shadow-indigo-500/10"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
        )}
      >
        <span className="truncate text-slate-500 dark:text-slate-300">{label}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 top-full z-50 mt-2 w-full min-w-[200px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    value?.value === option.value
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

MultiSelectDropdown.propTypes = {
  placeholder: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })),
  value: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })),
  onChange: PropTypes.func,
};

SingleSelectDropdown.propTypes = {
  placeholder: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })),
  value: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }),
  onChange: PropTypes.func,
};

const createInitialControls = () => ({
  labels: [],
  trafficClasses: [],
  periodicity: PERIODICITY_OPTIONS[2],
  metric: METRIC_OPTIONS[2],
  groupBy: [GROUP_BY_OPTIONS[0], null, null],
  routeFilters: createInitialRouteFilters(),
});

const RevenuePage = () => {
  const [controls, setControls] = useState(createInitialControls);
  const [data, setData] = useState({});
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({
    from: [],
    to: [],
    sector: [],
    variant: [],
    poo: [],
    flight: [],
    userTag1: [],
    userTag2: [],
  });

  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        const response = await api.get("/dashboard/populateDropDowns");
        const payload = response.data || {};

        setDropdownOptions({
          from: Array.isArray(payload.from) ? payload.from : [],
          to: Array.isArray(payload.to) ? payload.to : [],
          sector: Array.isArray(payload.sector) ? payload.sector : [],
          variant: Array.isArray(payload.variant) ? payload.variant : [],
          poo: Array.isArray(payload.poo) ? payload.poo : [],
          flight: Array.isArray(payload.flight) ? payload.flight : [],
          userTag1: Array.isArray(payload.userTag1) ? payload.userTag1 : [],
          userTag2: Array.isArray(payload.userTag2) ? payload.userTag2 : [],
        });
      } catch (error) {
        console.error("Failed to load revenue dropdowns:", error);
      }
    };

    loadDropdownOptions();
  }, []);

  const fetchRevenue = useCallback(async (snapshot) => {
    setLoading(true);

    try {
      const groupByFields = snapshot.groupBy.map((option) => option?.value).filter(Boolean);
      const params = {
        periodicity: snapshot.periodicity.value,
        groupBy: (groupByFields.length > 0 ? groupByFields : ["poo"]).join(","),
      };

      if (snapshot.labels.length > 0) {
        params.label = snapshot.labels.map((option) => option.value).join(",");
      }

      if (snapshot.trafficClasses.length > 0) {
        params.trafficClass = snapshot.trafficClasses.map((option) => option.value).join(",");
      }

      const routeFilters = snapshot.routeFilters || createInitialRouteFilters();
      const addJoinedParam = (key, values) => {
        if (Array.isArray(values) && values.length > 0) {
          params[key] = values.map((option) => option.value).join(",");
        }
      };

      addJoinedParam("from", routeFilters.from);
      addJoinedParam("to", routeFilters.to);
      addJoinedParam("sector", routeFilters.sector);
      addJoinedParam("variant", routeFilters.variant);
      addJoinedParam("poo", routeFilters.poo);
      addJoinedParam("flight", routeFilters.flight);
      addJoinedParam("userTag1", routeFilters.userTag1);
      addJoinedParam("userTag2", routeFilters.userTag2);

      const response = await api.get("/revenue", { params });
      const nextData = response.data?.data || {};
      const nextPeriods = response.data?.periods || [];

      setData(nextData);
      setPeriods(nextPeriods);
      setExpandedGroups(
        Object.keys(nextData)
          .slice(0, 5)
          .reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {})
      );
    } catch (error) {
      console.error("Failed to fetch revenue data:", error);
      toast.error("Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue(createInitialControls());
  }, [fetchRevenue]);

  const selectedMetric = controls.metric.value;
  const groupByLabel = controls.groupBy
    .map((option) => option?.label)
    .filter(Boolean)
    .join(" / ") || "POO";

  const metricsByOption = useMemo(() => (
    METRIC_OPTIONS.reduce((acc, option) => {
      acc[option.value] = option;
      return acc;
    }, {})
  ), []);

  const formatMetricValue = (value, metric = selectedMetric) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";

    if (metric === "cargoT") {
      return numeric.toLocaleString(undefined, { minimumFractionDigits: numeric === 0 ? 0 : 1, maximumFractionDigits: 1 });
    }

    if (metric === "pax" || metric === "count") {
      return numeric.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPeriod = (period) => {
    if (!period) return "—";

    if (/^\d{4}$/.test(period)) return period;

    if (/^\d{4}-Q[1-4]$/.test(period)) return period;

    if (/^\d{4}-\d{2}$/.test(period)) {
      const [year, month] = period.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[Number(month) - 1]} ${year}`;
    }

    return period;
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFetch = () => fetchRevenue(controls);

  const resetControls = () => {
    const next = createInitialControls();
    setControls(next);
    fetchRevenue(next);
  };

  const groupRows = useMemo(() => {
    return Object.entries(data)
      .map(([groupKey, periodData]) => {
        const total = periods.reduce((sum, period) => sum + (periodData[period]?.[selectedMetric] || 0), 0);
        return { groupKey, periodData, total };
      })
      .sort((a, b) => b.total - a.total || String(a.groupKey).localeCompare(String(b.groupKey)));
  }, [data, periods, selectedMetric]);

  const periodTotals = useMemo(() => {
    const totals = {};
    periods.forEach((period) => {
      totals[period] = groupRows.reduce((sum, row) => sum + (row.periodData[period]?.[selectedMetric] || 0), 0);
    });
    return totals;
  }, [groupRows, periods, selectedMetric]);

  const grandTotal = useMemo(() => Object.values(periodTotals).reduce((sum, value) => sum + value, 0), [periodTotals]);
  const detailMetrics = METRIC_OPTIONS.filter((metric) => metric.value !== selectedMetric);
  const activeFilterCount =
    controls.labels.length +
    controls.trafficClasses.length +
    controls.groupBy.filter(Boolean).length +
    Object.values(controls.routeFilters || {}).reduce((sum, values) => sum + values.length, 0) +
    (controls.periodicity?.value !== PERIODICITY_OPTIONS[2].value ? 1 : 0) +
    (controls.metric?.value !== METRIC_OPTIONS[2].value ? 1 : 0);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <DollarSign size={20} />
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Revenue Analysis</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Spreadsheet-style revenue controls and grouped output</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFetch}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={14} />
          {loading ? "Loading…" : "Fetch"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mb-6 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
            <Filter size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Revenue Spreadsheet Controls</h3>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {activeFilterCount} control{activeFilterCount === 1 ? "" : "s"} active
            </span>
          </div>

          <div className="space-y-5">
            <div className="relative mb-6 space-y-4 rounded-xl border-2 border-blue-400 bg-white p-5 dark:border-blue-500 dark:bg-slate-900/40">
              <div className="flex max-w-md flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <MultiSelectDropdown
                    placeholder="Labels"
                    options={LABEL_OPTIONS}
                    value={controls.labels}
                    onChange={(next) => setControls((prev) => ({ ...prev, labels: next }))}
                  />
                </div>
                <div className="flex-1">
                  <SingleSelectDropdown
                    placeholder="Periodicity"
                    options={PERIODICITY_OPTIONS}
                    value={controls.periodicity}
                    onChange={(next) => setControls((prev) => ({ ...prev, periodicity: next }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                <MultiSelectDropdown
                  placeholder="Dep Stn"
                  options={dropdownOptions.from}
                  value={controls.routeFilters.from}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, from: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="Arr Stn"
                  options={dropdownOptions.to}
                  value={controls.routeFilters.to}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, to: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="Sector"
                  options={dropdownOptions.sector}
                  value={controls.routeFilters.sector}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, sector: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="Variant"
                  options={dropdownOptions.variant}
                  value={controls.routeFilters.variant}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, variant: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="POO"
                  options={dropdownOptions.poo}
                  value={controls.routeFilters.poo}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, poo: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="Flight #"
                  options={dropdownOptions.flight}
                  value={controls.routeFilters.flight}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, flight: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="User Tag 1"
                  options={dropdownOptions.userTag1}
                  value={controls.routeFilters.userTag1}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, userTag1: next },
                  }))}
                />
                <MultiSelectDropdown
                  placeholder="User Tag 2"
                  options={dropdownOptions.userTag2}
                  value={controls.routeFilters.userTag2}
                  onChange={(next) => setControls((prev) => ({
                    ...prev,
                    routeFilters: { ...prev.routeFilters, userTag2: next },
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:w-[36.5%]">
                <MultiSelectDropdown
                  placeholder="Traffic Class"
                  options={TRAFFIC_OPTIONS}
                  value={controls.trafficClasses}
                  onChange={(next) => setControls((prev) => ({ ...prev, trafficClasses: next }))}
                />
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  Stop
                </div>
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  AL
                </div>
              </div>
            </div>

            <div className="space-y-5 px-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                <label className="w-16 text-sm font-semibold text-slate-700 dark:text-slate-300">Metric</label>
                <div className="w-full md:w-64">
                  <SingleSelectDropdown
                    placeholder="Metric"
                    options={METRIC_OPTIONS}
                    value={controls.metric}
                    onChange={(next) => setControls((prev) => ({ ...prev, metric: next }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                <label className="w-16 text-sm font-semibold text-slate-700 dark:text-slate-300">Group by</label>
                <div className="flex flex-wrap gap-3">
                  {controls.groupBy.map((selected, index) => (
                    <div key={`group-by-${index}`} className="w-full md:w-32">
                      <SingleSelectDropdown
                        placeholder={`Group ${index + 1}`}
                        options={GROUP_BY_OPTIONS}
                        value={selected}
                        onChange={(next) => setControls((prev) => {
                          const groupBy = [...prev.groupBy];
                          groupBy[index] = next;
                          return { ...prev, groupBy };
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetControls}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleFetch}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search size={14} />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </section>


        <section className="mt-4 flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Displayed metric:</span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                {metricsByOption[selectedMetric]?.label}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextExpanded = {};
                  groupRows.forEach(({ groupKey }) => {
                    nextExpanded[groupKey] = true;
                  });
                  setExpandedGroups(nextExpanded);
                }}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => setExpandedGroups({})}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {Object.keys(data).length === 0 && !loading ? (
              <div className="flex h-full items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                <div>
                  <p className="text-lg font-medium">No revenue data</p>
                  <p className="mt-1 text-sm">Use the controls above and click Fetch to load the table.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex h-full items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                <p className="text-lg">Loading revenue data…</p>
              </div>
            ) : (
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[220px] border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {groupByLabel}
                    </th>
                    {periods.map((period) => (
                      <th key={period} className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        {formatPeriod(period)}
                      </th>
                    ))}
                    <th className="border-b border-slate-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800 dark:border-slate-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white dark:bg-transparent">
                  {groupRows.map(({ groupKey, periodData, total }) => {
                    const isExpanded = expandedGroups[groupKey];

                    return (
                      <React.Fragment key={groupKey}>
                        <tr
                          className="cursor-pointer bg-slate-50/60 transition-colors hover:bg-slate-50 dark:bg-slate-900/20 dark:hover:bg-slate-800/30"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <ChevronRight size={16} className={cn("shrink-0 transition-transform", isExpanded && "rotate-90")} />
                              <span className="truncate">{String(groupKey)}</span>
                            </div>
                          </td>

                          {periods.map((period) => (
                            <td key={period} className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
                              {formatMetricValue(periodData[period]?.[selectedMetric], selectedMetric)}
                            </td>
                          ))}

                          <td className="border-b border-slate-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 dark:border-slate-800 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {formatMetricValue(total, selectedMetric)}
                          </td>
                        </tr>

                        {isExpanded && detailMetrics.map((metric) => (
                          <tr key={`${groupKey}-${metric.value}`} className="bg-white hover:bg-indigo-50/40 dark:bg-slate-900/40 dark:hover:bg-slate-800/20">
                            <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
                              {metric.label}
                            </td>
                            {periods.map((period) => (
                              <td key={period} className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                {formatMetricValue(periodData[period]?.[metric.value], metric.value)}
                              </td>
                            ))}
                            <td className="border-b border-slate-100 bg-indigo-50/40 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-indigo-500/5 dark:text-slate-400">
                              {formatMetricValue(periods.reduce((sum, period) => sum + ((periodData[period]?.[metric.value]) || 0), 0), metric.value)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {Object.keys(data).length > 0 && (
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold dark:border-slate-600 dark:bg-slate-800/80">
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                        TOTAL
                      </td>
                      {periods.map((period) => (
                        <td key={period} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {formatMetricValue(periodTotals[period], selectedMetric)}
                        </td>
                      ))}
                      <td className="bg-indigo-100 px-4 py-3 text-sm font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {formatMetricValue(grandTotal, selectedMetric)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RevenuePage;
