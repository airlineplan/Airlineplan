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
  if (!reportingCurrency) return [];
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

function toNumberLike(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateSafe(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPeriodStartDate(endDate, periodicity) {
  const date = parseDateSafe(endDate);
  if (!date) return null;

  if (periodicity === "monthly") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  if (periodicity === "quarterly") {
    const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
    return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
  }

  if (periodicity === "annually") {
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  }

  if (periodicity === "weekly") {
    const dayOfWeek = date.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(date);
    start.setUTCDate(start.getUTCDate() - daysUntilMonday);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isDateInPeriod(value, startDate, endDate) {
  const date = parseDateSafe(value);
  const start = parseDateSafe(startDate);
  const end = parseDateSafe(endDate);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
}

function sumBy(rows = [], selector) {
  return rows.reduce((total, row) => total + toNumberLike(typeof selector === "function" ? selector(row) : row?.[selector]), 0);
}

function getCarriedForwardFxRate(savedFxRates = [], pair, dateKey) {
  if (!pair || !dateKey) return 1;

  const targetDate = parseDateSafe(dateKey);
  if (!targetDate) return 1;

  const matches = (Array.isArray(savedFxRates) ? savedFxRates : [])
    .filter((row) => String(row?.pair || "").trim() === pair)
    .map((row) => ({
      date: parseDateSafe(row?.dateKey),
      rate: formatFxRate(row?.rate),
    }))
    .filter((row) => row.date)
    .sort((a, b) => a.date - b.date);

  if (matches.length === 0) return 1;

  let chosen = matches[0];
  for (const row of matches) {
    if (row.date <= targetDate) {
      chosen = row;
    } else {
      break;
    }
  }

  return toNumberLike(chosen.rate) || 1;
}

function convertRccyAmount(amount, reportingCurrency, exposureCurrency, fxRates, dateKey) {
  const base = toNumberLike(amount);
  const selected = normalizeCurrencyCode(exposureCurrency);
  const reporting = normalizeCurrencyCode(reportingCurrency);
  if (!selected || !reporting || selected === reporting) return base;

  const pair = `${selected}/${reporting}`;
  const rate = getCarriedForwardFxRate(fxRates, pair, dateKey);
  return rate > 0 ? base / rate : base;
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
      return typeof raw === "number" ? formatNumber(raw, Number.isInteger(raw) ? 0 : 2) : String(raw);
  }
}

const FINANCE_BASIS_DENOMINATOR_KEYS = {
  "absolute": null,
  "% of total revenue": "fnlRccyTotalRev",
  "per ASK": "sumOfask",
  "per RPK": "sumOfrsk",
  "per ATK": "sumOfcargoAtk",
  "per RTK": "sumOfcargoRtk",
  "per BH": "bh",
  "per FH": "fh",
  "per Departure": "departures",
  "per Seat": "seats",
  "per Pax": "pax",
  "per Cargo capacity T": "cargoCapT",
  "per Cargo T": "cargoT",
};

function getFinanceNodeValue(node, finance = {}) {
  if (node?.getValue) return toNumberLike(node.getValue(finance));
  return toNumberLike(finance?.[node?.key]);
}

function getFinanceBasisDenominator(periodData = {}, basis = "absolute") {
  const normalizedBasis = String(basis || "absolute").trim();
  if (normalizedBasis === "absolute") return 1;

  const denominatorKey = FINANCE_BASIS_DENOMINATOR_KEYS[normalizedBasis];
  if (!denominatorKey) return 1;

  const denominator = toNumberLike(periodData?.[denominatorKey]);
  return denominator > 0 ? denominator : 0;
}

function formatFinanceDisplayValue(value, periodData = {}, basis = "absolute") {
  const raw = toNumberLike(value);
  const normalizedBasis = String(basis || "absolute").trim();

  if (normalizedBasis === "absolute") {
    return formatNumber(raw, Number.isInteger(raw) ? 0 : 2);
  }

  const denominator = getFinanceBasisDenominator(periodData, normalizedBasis);
  if (!denominator) {
    return normalizedBasis === "% of total revenue" ? "0.00%" : "0.00";
  }

  if (normalizedBasis === "% of total revenue") {
    return `${((raw / denominator) * 100).toFixed(2)}%`;
  }

  return formatNumber(raw / denominator, 2);
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
      {
        id: "revenue-total",
        label: "Total revenue",
        key: "fnlRccyTotalRev",
        emphasize: true,
        summaryAfterChildren: true,
        children: [
          { id: "revenue-pax", label: "Pax revenue", key: "fnlRccyPaxRev" },
          { id: "revenue-cargo", label: "Cargo revenue", key: "fnlRccyCargoRev" },
        ],
      },
    ],
  },
  {
    title: "Fuel",
    icon: Fuel,
    rows: [
      {
        id: "fuel-total",
        label: "Total fuel cost",
        key: "totalFuelCostRCCY",
        emphasize: true,
        children: [
          { id: "fuel-engine", label: "Engine fuel cost", key: "engineFuelCostRCCY" },
          { id: "fuel-apu", label: "APU fuel cost", key: "apuFuelCostRCCY" },
        ],
      },
    ],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    rows: [
      {
        id: "maintenance-total",
        label: "Total Maintenance cost",
        key: "totalMaintenanceCostRCCY",
        emphasize: true,
        children: [
          {
            id: "maintenance-mr",
            label: "MR contributions",
            key: "totalMrContributionRCCY",
            children: [
              { id: "maintenance-mr-utilisation", label: "Utilisation driven", key: "maintenanceReserveContributionRCCY" },
              { id: "maintenance-mr-calendar", label: "Calendar driven", key: "mrMonthlyRCCY" },
            ],
          },
          {
            id: "maintenance-schmx",
            label: "Sch. Mx.",
            key: "qualifyingSchMxEventsRCCY",
          },
          {
            id: "maintenance-transit-maintenance",
            label: "Transit maintenance",
            key: "transitMaintenanceRCCY",
          },
          {
            id: "maintenance-other-maintenance",
            label: "Other maintenance",
            key: "otherMaintenanceRCCY",
            children: [
              { id: "maintenance-other-utilisation", label: "Utilisation driven", key: "otherMaintenanceUtilisationRCCY" },
              { id: "maintenance-other-calendar", label: "Calendar driven", key: "otherMaintenanceCalendarRCCY" },
            ],
          },
          {
            id: "maintenance-rotable",
            label: "Rotable changes",
            key: "rotableChangesRCCY",
          },
          {
            id: "maintenance-other-mx-expenses",
            label: "Other Mx expenses",
            key: "otherMxExpensesRCCY",
          },
          {
            id: "crew-total-direct",
            label: "Crew total direct cost",
            key: "crewTotalDirectCostRCCY",
            emphasize: true,
            children: [
              { id: "crew-allowances", label: "Allowances", key: "crewAllowancesRCCY" },
              { id: "crew-layovers", label: "Layovers", key: "layoverCostRCCY" },
              { id: "crew-positioning", label: "Positioning", key: "crewPositioningCostRCCY" },
            ],
          },
          { id: "other-airport-cost", label: "Airport cost", key: "airportRCCY", emphasize: true },
          { id: "other-navigation-cost", label: "Navigation cost", key: "navigationRCCY", emphasize: true },
          { id: "other-doc", label: "Other DOC", key: "otherDocRCCY", emphasize: true },
          { id: "total-doc", label: "Total DOC", key: "totalDocRCCY", emphasize: true },
          { id: "gross-profit-loss", label: "Gross profit/loss", key: "grossProfitLossRCCY", emphasize: true },
        ],
      },
    ],
  },
];

function buildFinancePeriods({
  periodColumns = [],
  apuFuelRows = [],
  periodicity,
  reportingCurrency,
  exposureCurrency,
  fxRates = [],
}) {
  const exposureCode = normalizeCurrencyCode(exposureCurrency || reportingCurrency);
  const reportingCode = normalizeCurrencyCode(reportingCurrency);
  const apuRows = Array.isArray(apuFuelRows) ? apuFuelRows : [];

  return periodColumns.map((period) => {
    const periodData = period?.data || {};
    const startDate = getPeriodStartDate(period.endDate, periodicity);
    const endDate = parseDateSafe(period.endDate);
    const dateKey = normalizeDateKey(period.endDate || period.dateKey || "");
    const apuInPeriod = apuRows.filter((row) => isDateInPeriod(row?.date, startDate, endDate));
    const fxRate = getCarriedForwardFxRate(fxRates, `${exposureCode}/${reportingCode}`, dateKey);

    const fnlRccyPaxRev = toNumberLike(periodData.fnlRccyPaxRev);
    const fnlRccyCargoRev = toNumberLike(periodData.fnlRccyCargoRev);
    const fnlRccyTotalRev = toNumberLike(periodData.fnlRccyTotalRev || fnlRccyPaxRev + fnlRccyCargoRev);

    const engineFuelConsumption = toNumberLike(periodData.engineFuelConsumption);
    const apuFuelConsumption = sumBy(apuInPeriod, (row) => row?.consumptionKg);
    const totalFuelConsumption = engineFuelConsumption + apuFuelConsumption;

    const engineFuelCostRCCY = toNumberLike(periodData.engineFuelCostRCCY);
    const apuFuelCostRCCY = toNumberLike(periodData.apuFuelCostRCCY);
    const totalFuelCostRCCY = toNumberLike(periodData.totalFuelCostRCCY || engineFuelCostRCCY + apuFuelCostRCCY);

    const maintenanceReserveContributionRCCY = toNumberLike(periodData.maintenanceReserveContributionRCCY ?? periodData.mrContributionRCCY);
    const mrMonthlyRCCY = toNumberLike(periodData.mrMonthlyRCCY);
    const totalMrContributionRCCY = toNumberLike(periodData.totalMrContributionRCCY || maintenanceReserveContributionRCCY + mrMonthlyRCCY);

    const qualifyingSchMxEventsRCCY = toNumberLike(periodData.qualifyingSchMxEventsRCCY);
    const schMxEvent1Detail1RCCY = toNumberLike(periodData.schMxEvent1Detail1RCCY);
    const schMxEvent1Detail2RCCY = toNumberLike(periodData.schMxEvent1Detail2RCCY);
    const schMxEvent2Detail1RCCY = toNumberLike(periodData.schMxEvent2Detail1RCCY);

    const transitMaintenanceRCCY = toNumberLike(periodData.transitMaintenanceRCCY);
    const otherMaintenanceRCCY = toNumberLike(periodData.otherMaintenanceRCCY);
    const otherMaintenanceUtilisationRCCY = toNumberLike(periodData.otherMaintenanceUtilisationRCCY ?? (toNumberLike(periodData.otherMaintenance1) + toNumberLike(periodData.otherMaintenance2)));
    const otherMaintenanceCalendarRCCY = toNumberLike(periodData.otherMaintenanceCalendarRCCY ?? periodData.otherMaintenance3);
    const otherMxExpensesRCCY = toNumberLike(periodData.otherMxExpensesRCCY);
    const rotableChangesRCCY = toNumberLike(periodData.rotableChangesRCCY);

    const crewAllowancesRCCY = toNumberLike(periodData.crewAllowancesRCCY);
    const layoverCostRCCY = toNumberLike(periodData.layoverCostRCCY);
    const crewPositioningCostRCCY = toNumberLike(periodData.crewPositioningCostRCCY);
    const crewTotalDirectCostRCCY = toNumberLike(periodData.crewTotalDirectCostRCCY || crewAllowancesRCCY + layoverCostRCCY + crewPositioningCostRCCY);

    const airportRCCY = toNumberLike(periodData.airportRCCY);
    const navigationRCCY = toNumberLike(periodData.navigationRCCY);
    const otherDocRCCY = toNumberLike(periodData.otherDocRCCY);

    const totalMaintenanceCostRCCY =
      toNumberLike(periodData.totalMaintenanceCostRCCY || (
        totalMrContributionRCCY +
        qualifyingSchMxEventsRCCY +
        transitMaintenanceRCCY +
        otherMaintenanceRCCY +
        otherMxExpensesRCCY +
        rotableChangesRCCY
      ));

    const totalDocRCCY =
      toNumberLike(periodData.totalDocRCCY || (
        totalFuelCostRCCY +
        totalMaintenanceCostRCCY +
        crewTotalDirectCostRCCY +
        airportRCCY +
        navigationRCCY +
        otherDocRCCY
      ));

    const grossProfitLossRCCY = fnlRccyTotalRev - totalDocRCCY;

    const finance = {
      dateKey,
      reportingCurrency: reportingCode,
      exposureCurrency: exposureCode,
      fxRate,
      fxDisplayRate: formatFxRate(fxRate),
      fnlRccyPaxRev,
      fnlRccyCargoRev,
      fnlRccyTotalRev,
      engineFuelConsumption,
      apuFuelConsumption,
      totalFuelConsumption,
      engineFuelCostRCCY,
      apuFuelCostRCCY,
      totalFuelCostRCCY,
      maintenanceReserveContributionRCCY,
      mrMonthlyRCCY,
      totalMrContributionRCCY,
      qualifyingSchMxEventsRCCY,
      schMxEvent1RCCY: schMxEvent1Detail1RCCY + schMxEvent1Detail2RCCY,
      schMxEvent1Detail1RCCY,
      schMxEvent1Detail2RCCY,
      schMxEvent2RCCY: schMxEvent2Detail1RCCY,
      schMxEvent2Detail1RCCY,
      transitMaintenanceRCCY,
      otherMaintenanceRCCY,
      otherMaintenanceUtilisationRCCY,
      otherMaintenanceCalendarRCCY,
      otherMxExpensesRCCY,
      rotableChangesRCCY,
      crewAllowancesRCCY,
      layoverCostRCCY,
      crewPositioningCostRCCY,
      crewTotalDirectCostRCCY,
      airportRCCY,
      navigationRCCY,
      otherDocRCCY,
      totalMaintenanceCostRCCY,
      totalDocRCCY,
      grossProfitLossRCCY,
      exposureFnlRccyPaxRev: convertRccyAmount(fnlRccyPaxRev, reportingCode, exposureCode, fxRates, dateKey),
      exposureFnlRccyCargoRev: convertRccyAmount(fnlRccyCargoRev, reportingCode, exposureCode, fxRates, dateKey),
      exposureFnlRccyTotalRev: convertRccyAmount(fnlRccyTotalRev, reportingCode, exposureCode, fxRates, dateKey),
      exposureTotalFuelCost: convertRccyAmount(totalFuelCostRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureTotalMaintenanceCost: convertRccyAmount(totalMaintenanceCostRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureCrewTotalDirectCost: convertRccyAmount(crewTotalDirectCostRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureAirport: convertRccyAmount(airportRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureNavigation: convertRccyAmount(navigationRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureOtherDoc: convertRccyAmount(otherDocRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureTotalDoc: convertRccyAmount(totalDocRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureGrossProfitLoss: convertRccyAmount(grossProfitLossRCCY, reportingCode, exposureCode, fxRates, dateKey),
      exposureFuelRequirement: totalFuelConsumption,
    };

    return {
      ...period,
      startDate: startDate ? startDate.toISOString() : "",
      finance,
    };
  });
}

function flattenFinanceNodes(nodes = [], level = 0) {
  const rows = [];

  nodes.forEach((node) => {
    const childNodes = Array.isArray(node.children) ? node.children : [];

    if (node.summaryAfterChildren && childNodes.length > 0) {
      rows.push(...flattenFinanceNodes(childNodes, level + 1));
      rows.push({ ...node, level });
      return;
    }

    rows.push({ ...node, level });

    if (childNodes.length > 0) {
      rows.push(...flattenFinanceNodes(childNodes, level + 1));
    }
  });

  return rows;
}

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
    <div className="mt-1 text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">
      {value}
    </div>
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
  setExposureCurrency,
  fxRows,
  setFxRows,
  fxRowRefs,
  selectedFxDate,
  setSelectedFxDate,
  savedFxRates,
  setSavedFxRates,
  periodColumns,
  fxBasis,
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

  const selectedFxRowIndex = useMemo(() => {
    const selectedKey = normalizeDateKey(selectedFxDate);
    if (!selectedKey) return -1;
    return fxRows.findIndex((row) => normalizeDateKey(row.dateKey) === selectedKey);
  }, [fxRows, selectedFxDate]);

  useEffect(() => {
    if (!open) return;
    setFxRows(createFxRows(periodColumns, generatedPairs, savedFxRates));
  }, [open, generatedPairs, periodColumns, savedFxRates, setFxRows]);

  useEffect(() => {
    if (!open || selectedFxRowIndex < 0) return;
    fxRowRefs.current[selectedFxRowIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fxRowRefs, open, selectedFxRowIndex]);

  const addCurrency = () => {
    const code = normalizeCurrencyCode(currencyInput);
    if (!code) return;
    setCurrencyCodes((prev) => {
      if (prev.includes(code)) return prev;
      const next = [...prev, code];
      if (!reportingCurrency) {
        setReportingCurrency(code);
      }
      return next;
    });
    setCurrencyInput("");
  };

  const removeCurrency = (code) => {
    setCurrencyCodes((prev) => {
      const next = prev.filter((item) => item !== code);
      return next;
    });
    if (code === reportingCurrency) {
      const fallback = currencyCodes.find((item) => item !== code) || "";
      setReportingCurrency(fallback);
      setExposureCurrency?.(fallback);
      setSavedFxRates([]);
      setFxRows(createFxRows(periodColumns, buildCurrencyPairs(currencyCodes.filter((item) => item !== code), fallback), []));
    }
  };

  const resetForReportingCurrency = (nextReportingCurrency) => {
    const normalized = normalizeCurrencyCode(nextReportingCurrency);
    if (!normalized) return;
    setReportingCurrency(normalized);
    setExposureCurrency?.(normalized);
    const nextPairs = buildCurrencyPairs(currencyCodes, normalized);
    const resetRows = createFxRows(periodColumns, nextPairs, []);
    setSavedFxRates(
      resetRows.flatMap((row) =>
        Object.entries(row.pairs || {}).map(([pair, rate]) => ({
          pair,
          dateKey: row.dateKey,
          rate: Number(formatFxRate(rate)),
        }))
      )
    );
    setFxRows(resetRows);
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
    const nextReportingCurrency = normalizeCurrencyCode(reportingCurrency) || normalizeCurrencyCode(currencyCodes[0]) || "";
    if (!nextReportingCurrency) {
      toast.warn("Please add a reporting currency before saving FX rates");
      return;
    }

    const nextRates = (Array.isArray(fxRows) ? fxRows : []).flatMap((row) =>
      Object.entries(row.pairs || {}).map(([pair, rate]) => ({
        pair,
        dateKey: row.dateKey,
        rate: Number(formatFxRate(rate)),
      }))
    );

    try {
      setSaving(true);
      await api.post("/revenue/config", {
        reportingCurrency: nextReportingCurrency,
        currencyCodes,
        fxRates: nextRates,
      });
      setSavedFxRates(nextRates);
      toast.success("FX rates saved");
    } catch (error) {
      console.error("Error saving FX rates:", error);
      toast.error("Failed to save FX rates");
    } finally {
      setSaving(false);
    }
  };

  const getFxDateLabel = (row, rowIndex) => {
    if (fxRows.length > 0 && rowIndex === 0) return "First / earliest date";
    if (fxRows.length > 1 && rowIndex === fxRows.length - 1) return "Last / latest date";
    if (rowIndex === selectedFxRowIndex) return "Centre row";
    return row.dateLabel;
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
              <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {FX_BASIS_OPTIONS.find((option) => option.value === fxBasis)?.label || "Absolute"}
              </div>
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
                      {fxRows.map((row, rowIndex) => (
                        <tr
                          key={row.key}
                          ref={(node) => {
                            fxRowRefs.current[rowIndex] = node;
                          }}
                          className={cn(
                            "hover:bg-cyan-50/40 dark:hover:bg-cyan-500/5",
                            rowIndex === selectedFxRowIndex && "bg-cyan-50/60 dark:bg-cyan-500/10"
                          )}
                        >
                          <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{getFxDateLabel(row, rowIndex)}</span>
                              {getFxDateLabel(row, rowIndex) !== row.dateLabel && (
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{row.dateLabel}</span>
                              )}
                            </div>
                          </td>
                          {generatedPairs.map((pair) => (
                            <td key={`${row.key}-${pair}`} className="border-b border-slate-200 px-2 py-2 dark:border-slate-800">
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`${row.dateLabel} ${pair}`}
                                value={row.pairs[pair] ?? "1.00"}
                                onChange={(e) => {
                                  const next = [...fxRows];
                                  const sourceIndex = fxRows.findIndex((candidate) => candidate.key === row.key);
                                  if (sourceIndex < 0) return;
                                  const nextRate = formatFxRate(e.target.value);
                                  for (let index = sourceIndex; index < next.length; index += 1) {
                                    next[index] = {
                                      ...next[index],
                                      pairs: {
                                        ...next[index].pairs,
                                        [pair]: nextRate,
                                      },
                                    };
                                  }
                                  setFxRows(next);
                                  const nextSavedRates = next.flatMap((item) =>
                                    Object.entries(item.pairs || {}).map(([fxPair, rate]) => ({
                                      pair: fxPair,
                                      dateKey: item.dateKey,
                                      rate: Number(formatFxRate(rate)),
                                    }))
                                  );
                                  setSavedFxRates(nextSavedRates);
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

              {fxRows.length === 0 && (
                <div className="border-b border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No FX rows available for the master date range.
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

const RiskExposureModal = ({
  open,
  onClose,
  exposureCurrency,
  setExposureCurrency,
  periodColumns,
  financePeriods,
  reportingCurrency,
  currencyCodes,
  savedFxRates,
}) => {
  const [seriesType, setSeriesType] = useState("revenue-cost");

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const chartSeriesOptions = [
    { label: "Revenue & cost", value: "revenue-cost" },
    { label: "Fuel requirement", value: "fuel-requirement" },
  ];

  const currencyOptions = useMemo(() => {
    const codes = Array.from(new Set([reportingCurrency, ...(Array.isArray(currencyCodes) ? currencyCodes : [])]))
      .map((code) => normalizeCurrencyCode(code))
      .filter(Boolean);
    return codes.map((code) => ({ label: code, value: code }));
  }, [currencyCodes, reportingCurrency]);

  const currentSeries = chartSeriesOptions.find((opt) => opt.value === seriesType) || chartSeriesOptions[0];
  const currentCurrency = normalizeCurrencyCode(exposureCurrency || reportingCurrency);

  const chartPoints = useMemo(() => {
    return periodColumns.map((period, index) => {
      const finance = financePeriods?.[index]?.finance || {};
      if (seriesType === "fuel-requirement") {
        return {
          label: period.dateLabel,
          value: finance.exposureFuelRequirement || 0,
          unit: "ATF Kg",
          subtitle: `${formatNumber(finance.engineFuelConsumption || 0, 0)} + ${formatNumber(finance.apuFuelConsumption || 0, 0)}`,
        };
      }

      return {
        label: period.dateLabel,
        revenue: convertRccyAmount(finance.fnlRccyTotalRev || 0, reportingCurrency, currentCurrency, savedFxRates, finance.dateKey),
        cost: -convertRccyAmount(finance.totalDocRCCY || 0, reportingCurrency, currentCurrency, savedFxRates, finance.dateKey),
        unit: currentCurrency,
        subtitle: currentCurrency === reportingCurrency
          ? `FX 1.00`
          : `FX ${formatFxRate(getCarriedForwardFxRate(savedFxRates, `${currentCurrency}/${reportingCurrency}`, finance.dateKey))}`,
      };
    });
  }, [currentCurrency, financePeriods, periodColumns, reportingCurrency, savedFxRates, seriesType]);

  const maxMagnitude = useMemo(() => {
    if (seriesType === "fuel-requirement") {
      return Math.max(...chartPoints.map((point) => Math.abs(point.value || 0)), 1);
    }
    return Math.max(...chartPoints.flatMap((point) => [Math.abs(point.revenue || 0), Math.abs(point.cost || 0)]), 1);
  }, [chartPoints, seriesType]);

  if (!open) return null;

  const barHeight = (value, maxHeight = 160) => Math.max(8, Math.round((Math.abs(value) / maxMagnitude) * maxHeight));

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[10000] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldAlert size={12} />
              Risk exposures
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-50">Exposure chart</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              MMM-YY on the X axis, with the selected series rendered across the full master date range.
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
              <div className="mt-3">
                <SingleSelectDropdown
                  placeholder="Revenue & cost"
                  options={chartSeriesOptions}
                  value={seriesType}
                  onChange={setSeriesType}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Currency</div>
              <div className="mt-3">
                <SingleSelectDropdown
                  placeholder={reportingCurrency || "Select CCY"}
                  options={currencyOptions}
                  value={currentCurrency}
                  onChange={setExposureCurrency}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-slate-50">Expected behavior</div>
              <ul className="mt-3 space-y-2">
                <li>Fuel requirement uses engine fuel consumption plus APU fuel consumption.</li>
                <li>Revenue and cost are converted with the saved FX rate for the selected currency.</li>
                <li>The chart stays horizontally scrollable across the full date range.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-100">
              {currentCurrency} {currentSeries.value === "fuel-requirement" ? "fuel requirement" : "revenue and cost"}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {currentCurrency}
              </div>
              <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {currentSeries.label}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Series is derived from the currently loaded dashboard periods.
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                Graphical output
              </div>
              <div className="overflow-x-auto p-4">
                <div className="min-w-[860px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start gap-4">
                    {chartPoints.map((point) => (
                      <div key={point.label} className="flex w-28 flex-col items-center gap-3">
                        {seriesType === "fuel-requirement" ? (
                          <div className="flex h-52 w-full items-end justify-center">
                            <div className="w-8 rounded-t-2xl bg-cyan-500/80 shadow-lg shadow-cyan-500/20" style={{ height: `${barHeight(point.value, 180)}px` }} />
                          </div>
                        ) : (
                          <div className="flex h-52 w-full flex-col items-center justify-between">
                            <div className="flex h-[88px] w-full items-end justify-center">
                              <div className="w-8 rounded-t-2xl bg-emerald-500/80 shadow-lg shadow-emerald-500/20" style={{ height: `${barHeight(point.revenue, 88)}px` }} />
                            </div>
                            <div className="h-px w-full bg-slate-300 dark:bg-slate-700" />
                            <div className="flex h-[88px] w-full items-start justify-center">
                              <div className="w-8 rounded-b-2xl bg-rose-500/80 shadow-lg shadow-rose-500/20" style={{ height: `${barHeight(point.cost, 88)}px` }} />
                            </div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{point.label}</div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {seriesType === "fuel-requirement"
                              ? `${formatNumber(point.value, 0)} ${point.unit}`
                              : `${formatNumber(point.revenue, 2)} / ${formatNumber(Math.abs(point.cost), 2)} ${point.unit}`}
                          </div>
                          {point.subtitle && <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{point.subtitle}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                For non-RCCY currencies, revenue is rendered above the axis and cost below it using the saved FX rate for the selected currency/date.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
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
  const [currencyCodes, setCurrencyCodes] = useState([]);
  const [reportingCurrency, setReportingCurrency] = useState("");
  const [fxBasis, setFxBasis] = useState("absolute");
  const [fxRows, setFxRows] = useState([]);
  const [fxDateColumns, setFxDateColumns] = useState([]);
  const [savedFxRates, setSavedFxRates] = useState([]);
  const [selectedFxDate, setSelectedFxDate] = useState("");
  const fxRowRefs = useRef([]);
  const [creatingConnections, setCreatingConnections] = useState(false);
  const [exposureCurrency, setExposureCurrency] = useState("");
  const [financeSourceData, setFinanceSourceData] = useState({
    apuFuelRows: [],
  });
  const [financePeriods, setFinancePeriods] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [expandedFinanceNodes, setExpandedFinanceNodes] = useState(() => ({
    "revenue-total": true,
    "fuel-total": true,
    "maintenance-total": true,
    "maintenance-event-1": true,
    "maintenance-event-2": true,
    "crew-total-direct": true,
  }));

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
        const normalizedCodes = [...new Set(savedCurrencyCodes.map((code) => normalizeCurrencyCode(code)).filter(Boolean))];
        const normalizedReportingCurrency = normalizeCurrencyCode(config.reportingCurrency) || normalizedCodes[0] || "";
        const nextReportingCurrency =
          normalizedCodes.length === 0 && (Array.isArray(config.fxRates) ? config.fxRates.length === 0 : true)
            ? ""
            : normalizedReportingCurrency;
        const nextCurrencyCodes = normalizedCodes.length > 0
          ? normalizedCodes
          : nextReportingCurrency
            ? [nextReportingCurrency]
            : [];
        const nextFxRates = Array.isArray(config.fxRates) ? config.fxRates : [];

        setCurrencyCodes(nextCurrencyCodes);
        setReportingCurrency(nextReportingCurrency);
        setSavedFxRates(nextFxRates);
        setExposureCurrency((prev) => normalizeCurrencyCode(prev) || nextReportingCurrency || nextCurrencyCodes[0] || "");
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
      if (response.data && !Array.isArray(response.data)) {
        const config = response.data.revenueConfig || {};
        const codes = response.data.currencyCodes || config.currencyCodes || [];
        const normalizedCodes = [...new Set(codes.map((code) => normalizeCurrencyCode(code)).filter(Boolean))];
        if (normalizedCodes.length) setCurrencyCodes(normalizedCodes);
        if (config.reportingCurrency) setReportingCurrency(normalizeCurrencyCode(config.reportingCurrency));
        if (Array.isArray(response.data.fxRates)) setSavedFxRates(response.data.fxRates);
        if (Array.isArray(response.data.flightsForFxDates)) setFxDateColumns(buildFxDateColumns(response.data.flightsForFxDates));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConnections = async () => {
    try {
      setCreatingConnections(true);
      await api.get("/createConnections");
      toast.success("Connections updated successfully");
      await fetchData();
    } catch (error) {
      console.error("Error updating connections:", error);
      toast.error("Failed to update connections");
    } finally {
      setCreatingConnections(false);
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
      startDate: period?.startDate || getPeriodStartDate(period?.endDate, selectedValues.periodicity)?.toISOString() || "",
      endDate: period?.endDate || "",
      data: period,
    }));
  }, [data, selectedValues.periodicity]);

  const loadingOverlay =
    (loading || financeLoading) && typeof document !== "undefined"
      ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className="animate-spin text-indigo-500" size={18} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {loading ? "Loading dashboard..." : "Loading financial segment..."}
            </span>
          </div>
        </div>,
        document.body
      )
      : null;

  useEffect(() => {
    if (!fxDateColumns.length) return;
    const nextPairs = buildCurrencyPairs(currencyCodes, reportingCurrency);
    setFxRows(createFxRows(fxDateColumns, nextPairs, savedFxRates));
    if (!exposureCurrency) {
      setExposureCurrency(reportingCurrency || currencyCodes[0] || "");
    }
  }, [currencyCodes, exposureCurrency, fxDateColumns, reportingCurrency, savedFxRates]);

  useEffect(() => {
    if (!periodColumns.length) {
      setFinancePeriods([]);
      setFinanceSourceData({
        apuFuelRows: [],
      });
      return;
    }

    let cancelled = false;

    const loadFinanceData = async () => {
      try {
        setFinanceLoading(true);
        const apuResponse = await api.get("/apu-fuel-costs");
        const apuFuelRows = Array.isArray(apuResponse.data?.data) ? apuResponse.data.data : [];

        if (!cancelled) {
          setFinanceSourceData({
            apuFuelRows,
          });
        }
      } catch (error) {
        console.error("Error loading finance data:", error);
        if (!cancelled) {
          setFinanceSourceData({
            apuFuelRows: [],
          });
        }
      } finally {
        if (!cancelled) {
          setFinanceLoading(false);
        }
      }
    };

    loadFinanceData();

    return () => {
      cancelled = true;
    };
  }, [filters, periodColumns, selectedValues.label, selectedValues.periodicity]);

  useEffect(() => {
    if (!periodColumns.length) {
      setFinancePeriods([]);
      return;
    }

    const nextFinancePeriods = buildFinancePeriods({
      periodColumns,
      apuFuelRows: financeSourceData.apuFuelRows,
      periodicity: selectedValues.periodicity,
      reportingCurrency,
      exposureCurrency: reportingCurrency,
      fxRates: savedFxRates,
    });

    setFinancePeriods(nextFinancePeriods);
  }, [financeSourceData, periodColumns, reportingCurrency, savedFxRates, selectedValues.periodicity]);

  const operationalSections = useMemo(() => OPERATIONAL_SECTIONS, []);
  const financeSections = useMemo(() => FINANCE_SECTIONS, []);

  const toggleFinanceNode = (nodeId) => {
    setExpandedFinanceNodes((prev) => ({
      ...prev,
      [nodeId]: !(prev[nodeId] !== false),
    }));
  };

  const isFinanceNodeExpanded = (nodeId) => expandedFinanceNodes[nodeId] !== false;

  const buildDashboardExportRows = () => {
    const rows = [["", ...periodColumns.map((period) => period.dateLabel)]];
    rows.push(["Financial segment", ...Array(periodColumns.length).fill("")]);
    rows.push([
      `FX rate setting`,
      `Basis: ${fxBasis}`,
      `Reporting currency: ${reportingCurrency || "--"}`,
      `Pairs: ${buildCurrencyPairs(currencyCodes, reportingCurrency).join(", ") || "--"}`,
      ...Array(Math.max(periodColumns.length - 3, 0)).fill(""),
    ]);

    const pushMetricRow = (label, values) => {
      const hasValue = values.some((value) => value !== "" && value !== null && value !== undefined);
      if (!hasValue) return;
      rows.push([label, ...values]);
    };

    operationalSections.forEach((section) => {
      section.rows.forEach((row) => {
        pushMetricRow(row.label, periodColumns.map((period) => cnTableValue(row, period.data)));
      });
    });

    financeSections.forEach((section) => {
      flattenFinanceNodes(section.rows).forEach((row) => {
        const indent = "  ".repeat(row.level || 0);
        pushMetricRow(
          `${indent}${row.label}`,
          periodColumns.map((period, index) => {
            const finance = financePeriods[index]?.finance || {};
            return formatFinanceDisplayValue(getFinanceNodeValue(row, finance), period.data, fxBasis);
          })
        );
      });
    });

    return rows;
  };

  const renderFinanceNodes = (nodes = [], level = 0) =>
    nodes.flatMap((node) => {
      const childNodes = Array.isArray(node.children) ? node.children : [];
      const expanded = childNodes.length === 0 ? false : isFinanceNodeExpanded(node.id);
      const rowPaddingLeft = `${1 + level * 1.35}rem`;

      const renderRow = () => (
        <tr key={node.id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5">
          <td
            className={cn(
              "sticky left-0 z-20 w-[340px] min-w-[340px] max-w-[340px] border-b border-r border-slate-200 bg-white px-4 py-3 text-sm shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900",
              node.emphasize ? "font-semibold text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200"
            )}
          >
            <div className="flex items-center gap-2" style={{ paddingLeft: rowPaddingLeft }}>
              {childNodes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleFinanceNode(node.id)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
                >
                  <ChevronRight
                    size={14}
                    className={cn("transition-transform", expanded ? "rotate-90" : "rotate-0")}
                  />
                </button>
              ) : (
                <span className="inline-flex h-5 w-5" />
              )}
              <span>{node.label}</span>
            </div>
          </td>
          {periodColumns.map((period, index) => (
            <td
              key={`${node.id}-${period.key}`}
              className={cn(
                "w-[140px] min-w-[140px] max-w-[140px] border-b border-slate-200 px-3 py-3 text-center text-sm tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-300",
                index === 0 && "bg-indigo-50/70 dark:bg-indigo-500/10"
              )}
            >
              <span className={cn(node.emphasize && "font-semibold text-slate-900 dark:text-slate-50")}>
                {formatFinanceDisplayValue(
                  getFinanceNodeValue(node, financePeriods[index]?.finance || {}),
                  period.data,
                  fxBasis
                )}
              </span>
            </td>
          ))}
        </tr>
      );

      if (childNodes.length === 0) {
        return [renderRow()];
      }

      if (node.summaryAfterChildren) {
        return [
          ...(expanded ? renderFinanceNodes(childNodes, level + 1) : []),
          renderRow(),
        ];
      }

      return [
        renderRow(),
        ...(expanded ? renderFinanceNodes(childNodes, level + 1) : []),
      ];
    });

  const downloadDashboardTable = () => {
    if (!data || data.length === 0) {
      toast.warn("No data to download");
      return;
    }

    const worksheetData = buildDashboardExportRows();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!cols"] = [
      { wch: 42 },
      ...periodColumns.map(() => ({ wch: 16 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
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
              onClick={handleUpdateConnections}
              disabled={creatingConnections}
              className="mt-4 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {creatingConnections ? "Updating Connections..." : "Update Connections"}
              <RefreshCw size={16} className={creatingConnections ? "animate-spin" : ""} />
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
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                      >
                        Risk Exposures
                        <ChevronRight size={16} />
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
                      {renderFinanceNodes(section.rows)}
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
        setExposureCurrency={setExposureCurrency}
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
        financePeriods={financePeriods}
        reportingCurrency={reportingCurrency}
        currencyCodes={currencyCodes}
        savedFxRates={savedFxRates}
      />

    </div>
  );
};

export default DashboardTable;
