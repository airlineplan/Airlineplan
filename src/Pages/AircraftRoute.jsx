import React, { useState } from "react";
import { Link } from "react-router-dom"; // Preserved for Dashboard link
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Plane, Clock, MapPin, Users, Package, DollarSign, 
  Fuel, Wrench, Briefcase, Navigation, TowerControl, 
  Truck, Activity, ShieldCheck, Calculator, RotateCcw, AlertCircle, LayoutDashboard 
} from "lucide-react";
// Ensure this path matches your file structure exactly
import ThemeToggle from "../Components/Homepage/ThemeToggle"; 

// --- UTILITIES & UI COMPONENTS ---

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Input = ({ label, error, suffix, readOnly, className, icon: Icon, ...props }) => (
  <div className="flex flex-col space-y-1.5 w-full">
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Icon size={16} />
        </div>
      )}
      <input
        readOnly={readOnly}
        className={cn(
          "flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all outline-none",
          readOnly 
            ? "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-default font-mono font-medium" 
            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500",
          error && "border-red-500 focus:ring-red-500",
          suffix && "pr-12",
          Icon && "pl-10",
          className
        )}
        {...props}
      />
      {suffix && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-medium">
          {suffix}
        </div>
      )}
    </div>
    {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {error}</span>}
  </div>
);

const Select = ({ label, options, value, onChange, className }) => (
  <div className="flex flex-col space-y-1.5 w-full">
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const Section = ({ title, icon: Icon, children, className }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6", 
      className
    )}
  >
    <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
      {Icon && <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"><Icon size={20} /></div>}
      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const CostRow = ({ label, value, perASM, perRPM, perFH, perBH, subInputs }) => (
  <div className="py-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center mb-4 lg:mb-0">
      <div className="lg:col-span-2 font-medium text-slate-700 dark:text-slate-300 text-sm">{label}</div>
      <div className="lg:col-span-2"><Input readOnly value={value} label={<span className="opacity-0">Total</span>} /></div>
      <div className="lg:col-span-2"><Input readOnly value={perASM} label="per ASM/K" /></div>
      <div className="lg:col-span-2"><Input readOnly value={perRPM} label="per RPM/K" /></div>
      <div className="lg:col-span-2"><Input readOnly value={perFH} label="per FH" /></div>
      <div className="lg:col-span-2"><Input readOnly value={perBH} label="per BH" /></div>
    </div>
    {subInputs && (
      <div className="mt-3 pl-4 lg:pl-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
        {subInputs}
      </div>
    )}
  </div>
);

// --- MAIN COMPONENT ---

const defaultFormState = {
  dep: "", arr: "", blockHours: "", econSeats: "", bizSeats: "", cargoCap: "",
  lfEcon: 0, lfBiz: 0, lfCargo: 0, econFare: "", bizFare: "",
  econPassengers: 0, bizPassengers: 0, cargoCarried: 0, econRevenue: 0,
  pilotRatePerBH: 0, cabinRatePerBH: 0, bizRevenue: 0, cargoRevenue: 0,
  taxiTime: "", tripDistance: "", tripDistanceUnit: "NM", cargoRate: "",
  fuelConsUnit: "per FH", fuelConsKgPerFH: "", fuelPricePerL: "",
  maintPerFH: 0, maintPerFLGT: 0, maintReservePerFHInput: 0, maintOtherPerFLGTInput: 0,
  fuelValue: 0, fuelPerASM: 0, fuelPerRPM: 0, fuelPerFH: 0, fuelPerBH: 0,
  fhDec: 0, paxASM: 0, paxRPM: 0, cargoASM: 0, cargoRPM: 0, totalASM: 0, totalRPM: 0,
  paxRevenue: 0, maintValue: 0, maintPerASM: 0, maintPerRPM: 0, maintPerBH: 0, bhDec: 0,
  pilots: 0, cabin: 0, navEnroutePerFLGT: 0, navTerminalPerArr: 0, airportLandingPerArr: 0,
  airportParkingPerArr: 0, groundHandlingPerDep: 0, groundGSEPerDep: 0, ownershipPerFLGT: 0,
  hullPerBH: 0, liabilityPerFLGT: 0, crewValue: 0, crewPerASM: 0, crewPerRPM: 0, crewPerFH: 0,
  crewPerBH: 0, navValue: 0, navPerASM: 0, navPerRPM: 0, navPerFH: 0, navPerBH: 0,
  airportValue: 0, airportPerASM: 0, airportPerRPM: 0, airportPerFH: 0, airportPerBH: 0,
  groundValue: 0, groundPerASM: 0, groundPerRPM: 0, groundPerFH: 0, groundPerBH: 0,
  docValue: 0, docPerASM: 0, docPerRPM: 0, docPerFH: 0, docPerBH: 0, ownershipUnit: "per FLGT",
  ownershipValue: 0, ownershipPerASM: 0, ownershipPerRPM: 0, ownershipPerFH: 0, ownershipPerBH: 0,
  liabilityUnit: "per FLGT", hullUnit: "per BH", insuranceValue: 0, insurancePerASM: 0,
  insurancePerRPM: 0, insurancePerFH: 0, insurancePerBH: 0, operatingValue: 0,
  operatingPerASM: 0, operatingPerRPM: 0, operatingPerFH: 0, operatingPerBH: 0,
  opValue: 0, opPerASM: 0, opPerRPM: 0, opPerFH: 0, opPerBH: 0,
};

export default function AircraftRoute() {
  const [form, setForm] = useState(defaultFormState);
  const [errors, setErrors] = useState({});

  // --- LOGIC (UNCHANGED) ---
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToHHMM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const subTimes = (t1, t2) => {
    const diff = toMinutes(t1) - toMinutes(t2);
    return minutesToHHMM(Math.max(0, diff));
  };

  const hhmmToDec = (hhmm) => {
    if (!hhmm) return 0;
    const [h = "0", m = "0"] = hhmm.split(":");
    const hr = Number(h) || 0;
    const min = Number(m) || 0;
    return hr + min / 60;
  };

  const div0 = (num, den) => (den ? num / den : 0);
  const fmt = (n) => Number.isFinite(n) ? n.toFixed(2) : "0.00";

  const validate = () => {
    const newErrors = {};
    const codeRegex = /^[A-Za-z0-9]{3,4}$/;
    if (!codeRegex.test(form.dep)) newErrors.dep = "Must be 3-4 alphanumeric";
    if (!codeRegex.test(form.arr)) newErrors.arr = "Must be 3-4 alphanumeric";
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(form.blockHours)) newErrors.blockHours = "Invalid HH:mm format";
    if (!timeRegex.test(form.taxiTime)) newErrors.taxiTime = "Invalid HH:mm format";

    const dist = Number(form.tripDistance);
    if (isNaN(dist) || dist < 0 || dist > 20000) newErrors.tripDistance = "0 - 20000";

    const toNum = (val) => Number(val) || 0;
    if (toNum(form.econSeats) < 0 || toNum(form.econSeats) > 600) newErrors.econSeats = "0–600";
    if (toNum(form.bizSeats) < 0 || toNum(form.bizSeats) > 600) newErrors.bizSeats = "0–600";
    if (toNum(form.cargoCap) < 0 || toNum(form.cargoCap) > 150000) newErrors.cargoCap = "0–150000";

    ["lfEcon", "lfBiz", "lfCargo"].forEach((lf) => {
      const val = toNum(form[lf]);
      if (val < 0 || val > 100) newErrors[lf] = "0–100%";
    });

    ["econFare", "bizFare", "cargoRate"].forEach((fare) => {
      const val = toNum(form[fare]);
      if (val < 0 || val > 999000) newErrors[fare] = "0–999000";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = () => {
    if (!validate()) return;

    const flightTime = subTimes(form.blockHours, form.taxiTime);
    const fhDec = hhmmToDec(flightTime);
    const bhDec = hhmmToDec(form.blockHours || "0:00");

    const econPassengersRaw = Number(form.econSeats) * (Number(form.lfEcon) / 100);
    const bizPassengersRaw = Number(form.bizSeats) * (Number(form.lfBiz) / 100);
    const cargoCarriedRaw = Number(form.cargoCap) * (Number(form.lfCargo) / 100);

    const econPassengers = Math.round(econPassengersRaw);
    const bizPassengers = Math.round(bizPassengersRaw);
    const cargoCarried = Math.round(cargoCarriedRaw);

    const econRevenue = econPassengers * Number(form.econFare || 0);
    const bizRevenue = bizPassengers * Number(form.bizFare || 0);
    const paxRevenue = econRevenue + bizRevenue;
    const cargoRevenue = cargoCarried * Number(form.cargoRate || 0);
    const totalRevenue = paxRevenue + cargoRevenue;

    const DENSITY_KG_PER_L = 0.78;
    const consumptionKg = Number(form.fuelConsKgPerFH || 0);
    const fuelPricePerL = Number(form.fuelPricePerL || 0);
    const unitMultiplier = form.fuelConsUnit === "per FH" ? fhDec : 1;
    const fuelValue = (consumptionKg / DENSITY_KG_PER_L) * fuelPricePerL * unitMultiplier;

    const dist = Number(form.tripDistance || 0);
    const seatsTotal = Number(form.econSeats || 0) + Number(form.bizSeats || 0);
    const paxPassengersTotal = econPassengers + bizPassengers;

    const paxASM = seatsTotal * dist;
    const paxRPM = paxPassengersTotal * dist;
    const cargoASM = Number(form.cargoCap || 0) * dist;
    const cargoRPM = cargoCarried * dist;
    const totalASM = seatsTotal * dist;
    const totalRPM = paxPassengersTotal * dist;

    const fuelPerASM = div0(fuelValue, paxASM);
    const fuelPerRPM = div0(fuelValue, paxRPM);
    const fuelPerFH = div0(fuelValue, fhDec);
    const fuelPerBH = div0(fuelValue, bhDec);

    const maintReservePerFH = Number(form.maintReservePerFHInput || 0);
    const maintOtherPerFLGT = Number(form.maintOtherPerFLGTInput || 0);
    const maintValue = maintReservePerFH * fhDec + maintOtherPerFLGT;
    const maintPerASM = (seatsTotal > 0 && dist > 0) ? (maintValue / (seatsTotal * dist)) : 0;
    const maintPerRPM = (paxPassengersTotal > 0 && dist > 0) ? (maintValue / (paxPassengersTotal * dist)) : 0;
    const maintPerFH = fhDec > 0 ? (maintValue / fhDec) : 0;
    const maintPerBH = bhDec > 0 ? (maintValue / bhDec) : 0;

    const pilotsCount = Number(form.pilots || 0);
    const cabinCount = Number(form.cabin || 0);
    const pilotRate = Number(form.pilotRatePerBH || 0);
    const cabinRate = Number(form.cabinRatePerBH || 0);
    const crewValue = (pilotsCount * pilotRate * bhDec) + (cabinCount * cabinRate * bhDec);
    const crewPerASM = seatsTotal > 0 && dist > 0 ? (crewValue / (seatsTotal * dist)) : 0;
    const crewPerRPM = paxPassengersTotal > 0 && dist > 0 ? (crewValue / (paxPassengersTotal * dist)) : 0;
    const crewPerFH = fhDec > 0 ? (crewValue / fhDec) : 0;
    const crewPerBH = bhDec > 0 ? (crewValue / bhDec) : 0;

    const navEnroute = Number(form.navEnroutePerFLGT || 0);
    const navTerminal = Number(form.navTerminalPerArr || 0);
    const navValue = navEnroute + navTerminal;
    const navPerASM = seatsTotal > 0 && dist > 0 ? (navValue / (seatsTotal * dist)) : 0;
    const navPerRPM = paxPassengersTotal > 0 && dist > 0 ? (navValue / (paxPassengersTotal * dist)) : 0;
    const navPerFH = fhDec > 0 ? (navValue / fhDec) : 0;
    const navPerBH = bhDec > 0 ? (navValue / bhDec) : 0;

    const landingPerArr = Number(form.airportLandingPerArr || 0);
    const parkingPerArr = Number(form.airportParkingPerArr || 0);
    const airportValue = landingPerArr + parkingPerArr;
    const airportPerASM = seatsTotal > 0 && dist > 0 ? airportValue / (seatsTotal * dist) : 0;
    const airportPerRPM = paxPassengersTotal > 0 && dist > 0 ? airportValue / (paxPassengersTotal * dist) : 0;
    const airportPerFH = fhDec > 0 ? airportValue / fhDec : 0;
    const airportPerBH = bhDec > 0 ? airportValue / bhDec : 0;

    const handlingPerDep = Number(form.groundHandlingPerDep || 0);
    const gsePerDep = Number(form.groundGSEPerDep || 0);
    const groundValue = handlingPerDep + gsePerDep;
    const groundPerASM = seatsTotal > 0 && dist > 0 ? groundValue / (seatsTotal * dist) : 0;
    const groundPerRPM = paxPassengersTotal > 0 && dist > 0 ? groundValue / (paxPassengersTotal * dist) : 0;
    const groundPerFH = fhDec > 0 ? (groundValue / fhDec) : 0;
    const groundPerBH = bhDec > 0 ? (groundValue / bhDec) : 0;

    const docValue = (Number(fuelValue) || 0) + (Number(maintValue) || 0) + (Number(crewValue) || 0) +
                     (Number(navValue) || 0) + (Number(airportValue) || 0) + (Number(groundValue) || 0);
    const docPerASM = seatsTotal > 0 && dist > 0 ? (docValue / (seatsTotal * dist)) : 0;
    const docPerRPM = paxPassengersTotal > 0 && dist > 0 ? (docValue / (paxPassengersTotal * dist)) : 0;
    const docPerFH = fhDec > 0 ? (docValue / fhDec) : 0;
    const docPerBH = bhDec > 0 ? (docValue / bhDec) : 0;

    const ownershipRate = Number(form.ownershipPerFLGT || 0);
    const ownershipValue = form.ownershipUnit === "per FLGT" ? ownershipRate : ownershipRate * bhDec;
    const ownershipPerASM = seatsTotal > 0 && dist > 0 ? ownershipValue / (seatsTotal * dist) : 0;
    const ownershipPerRPM = paxPassengersTotal > 0 && dist > 0 ? ownershipValue / (paxPassengersTotal * dist) : 0;
    const ownershipPerFH = fhDec > 0 ? (ownershipValue / fhDec) : 0;
    const ownershipPerBH = bhDec > 0 ? (ownershipValue / bhDec) : 0;

    const hullRate = Number(form.hullPerBH || 0);
    const liabilityRate = Number(form.liabilityPerFLGT || 0);
    const hullValue = form.hullUnit === "per BH" ? hullRate * bhDec : hullRate;
    const liabilityValue = form.liabilityUnit === "per FLGT" ? liabilityRate : liabilityRate * bhDec;
    const insuranceValue = hullValue + liabilityValue;
    const insurancePerASM = seatsTotal > 0 && dist > 0 ? insuranceValue / (seatsTotal * dist) : 0;
    const insurancePerRPM = paxPassengersTotal > 0 && dist > 0 ? insuranceValue / (paxPassengersTotal * dist) : 0;
    const insurancePerFH = fhDec > 0 ? insuranceValue / fhDec : 0;
    const insurancePerBH = bhDec > 0 ? insuranceValue / bhDec : 0;

    const operatingValue = (Number(docValue) || 0) + (Number(ownershipValue) || 0) + (Number(insuranceValue) || 0);
    const operatingPerASM = seatsTotal > 0 && dist > 0 ? operatingValue / (seatsTotal * dist) : 0;
    const operatingPerRPM = paxPassengersTotal > 0 && dist > 0 ? operatingValue / (paxPassengersTotal * dist) : 0;
    const operatingPerFH = fhDec > 0 ? operatingValue / fhDec : 0;
    const operatingPerBH = bhDec > 0 ? operatingValue / bhDec : 0;

    const opValue = (Number(totalRevenue) || 0) - (Number(operatingValue) || 0);
    const opPerASM = seatsTotal > 0 && dist > 0 ? (opValue / (seatsTotal * dist)) : 0;
    const opPerRPM = paxPassengersTotal > 0 && dist > 0 ? (opValue / (paxPassengersTotal * dist)) : 0;
    const opPerFH = fhDec > 0 ? (opValue / fhDec) : 0;
    const opPerBH = bhDec > 0 ? (opValue / bhDec) : 0;

    setForm((f) => ({
      ...f, flightHours: flightTime, fhDec, bhDec, econPassengers, bizPassengers, cargoCarried,
      econRevenue, bizRevenue, paxRevenue, cargoRevenue, totalRevenue, paxASM, paxRPM, cargoASM, cargoRPM,
      totalASM, totalRPM, fuelValue, fuelPerASM, fuelPerRPM, fuelPerFH, fuelPerBH, maintValue, maintPerASM,
      maintPerRPM, maintPerFH, maintPerBH, crewValue, crewPerASM, crewPerRPM, crewPerFH, crewPerBH,
      navValue, navPerASM, navPerRPM, navPerFH, navPerBH, airportValue, airportPerASM, airportPerRPM,
      airportPerFH, airportPerBH, groundValue, groundPerASM, groundPerRPM, groundPerFH, groundPerBH,
      docValue, docPerASM, docPerRPM, docPerFH, docPerBH, ownershipValue, ownershipPerASM, ownershipPerRPM,
      ownershipPerFH, ownershipPerBH, insuranceValue, insurancePerASM, insurancePerRPM, insurancePerFH,
      insurancePerBH, operatingValue, operatingPerASM, operatingPerRPM, operatingPerFH, operatingPerBH,
      opValue, opPerASM, opPerRPM, opPerFH, opPerBH,
    }));
  };

  const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const handleReset = () => setForm(defaultFormState);

  // --- RENDER ---
  return (
<div className="min-h-screen w-full transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 font-sans relative overflow-hidden">      
      {/* Background Ambience - Light Mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-100 dark:opacity-0 transition-opacity duration-300"></div>
      
      {/* Background Ambience - Dark Mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300"></div>

      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500/20 dark:bg-cyan-500/20 blur-[100px] transition-colors duration-300"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-extrabold flex items-center gap-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
              {/* <Plane className="text-indigo-600 dark:text-indigo-400" size={32} /> */}
              
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg"></p>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-full transition-all shadow-sm"
            >
              <RotateCcw size={16} /> Reset Form
            </motion.button>
          </div>
        </div>

        {/* --- SECTION 1: ROUTE --- */}
        <Section title="Route Details" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input 
              label="Departure (ICAO/IATA)" 
              placeholder="e.g. JFK" 
              value={form.dep} 
              onChange={(e) => onChange("dep", e.target.value.toUpperCase())}
              error={errors.dep}
            />
            <Input 
              label="Arrival (ICAO/IATA)" 
              placeholder="e.g. LHR" 
              value={form.arr} 
              onChange={(e) => onChange("arr", e.target.value.toUpperCase())}
              error={errors.arr}
            />
            <div className="grid grid-cols-2 gap-4">
               <Input 
                label="Block Hours" 
                placeholder="HH:MM" 
                value={form.blockHours} 
                onChange={(e) => onChange("blockHours", e.target.value)}
                error={errors.blockHours}
                icon={Clock}
              />
               <Input 
                label="Flight Hours" 
                readOnly
                value={form.flightHours || "--:--"} 
              />
            </div>
            
            <Input 
              label="Taxi Time" 
              placeholder="HH:MM" 
              value={form.taxiTime} 
              onChange={(e) => onChange("taxiTime", e.target.value)}
              error={errors.taxiTime}
            />

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input 
                  label="Distance" 
                  type="number"
                  value={form.tripDistance} 
                  onChange={(e) => onChange("tripDistance", e.target.value)}
                  error={errors.tripDistance}
                />
              </div>
              <Select 
                label="Unit"
                value={form.tripDistanceUnit}
                onChange={(e) => onChange("tripDistanceUnit", e.target.value)}
                options={[{value:"NM", label:"NM"}, {value:"Miles", label:"Miles"}, {value:"Km", label:"Km"}]}
              />
            </div>
          </div>
        </Section>

        {/* --- SECTION 2: CAPACITY --- */}
        <Section title="Capacity & Load" icon={Users}>
          <div className="space-y-6">
            {/* Economy */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Economy Class</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input label="Seats" type="number" value={form.econSeats} onChange={(e) => onChange("econSeats", e.target.value)} error={errors.econSeats} />
                <Input label="Load Factor" type="number" value={form.lfEcon} onChange={(e) => onChange("lfEcon", e.target.value)} suffix="%" error={errors.lfEcon} />
                <Input label="Passengers" readOnly value={Math.round(form.econPassengers)} />
                <Input label="Fare" type="number" value={form.econFare} onChange={(e) => onChange("econFare", e.target.value)} error={errors.econFare} suffix="$" />
                <Input label="Revenue" readOnly value={Math.round(form.econRevenue)} suffix="$" />
              </div>
            </div>

            {/* Business */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Business Class</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input label="Seats" type="number" value={form.bizSeats} onChange={(e) => onChange("bizSeats", e.target.value)} error={errors.bizSeats} />
                <Input label="Load Factor" type="number" value={form.lfBiz} onChange={(e) => onChange("lfBiz", e.target.value)} suffix="%" error={errors.lfBiz} />
                <Input label="Passengers" readOnly value={Math.round(form.bizPassengers)} />
                <Input label="Fare" type="number" value={form.bizFare} onChange={(e) => onChange("bizFare", e.target.value)} error={errors.bizFare} suffix="$" />
                <Input label="Revenue" readOnly value={Math.round(form.bizRevenue)} suffix="$" />
              </div>
            </div>

            {/* Cargo */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2"><Package size={16}/> Cargo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input label="Capacity" type="number" value={form.cargoCap} onChange={(e) => onChange("cargoCap", e.target.value)} suffix="Kg" error={errors.cargoCap} />
                <Input label="Load Factor" type="number" value={form.lfCargo} onChange={(e) => onChange("lfCargo", e.target.value)} suffix="%" error={errors.lfCargo} />
                <Input label="Carried" readOnly value={Math.round(form.cargoCarried)} suffix="Kg" />
                <Input label="Rate" type="number" value={form.cargoRate} onChange={(e) => onChange("cargoRate", e.target.value)} error={errors.cargoRate} suffix="$" />
                <Input label="Revenue" readOnly value={Math.round(form.cargoRevenue)} suffix="$" />
              </div>
            </div>
          </div>
        </Section>

        {/* --- SECTION 3: REVENUE SUMMARY --- */}
        <Section title="Revenue Summary" icon={DollarSign}>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Metric</th>
                  <th className="px-6 py-4 text-right">Total ($)</th>
                  <th className="px-6 py-4 text-right">per {form.tripDistanceUnit === "Miles" ? "ASM" : form.tripDistanceUnit === "NM" ? "ASNm" : "ASK"}</th>
                  <th className="px-6 py-4 text-right">per {form.tripDistanceUnit === "Miles" ? "RPM" : form.tripDistanceUnit === "NM" ? "RPNm" : "RPK"}</th>
                  <th className="px-6 py-4 text-right">per FH</th>
                  <th className="px-6 py-4 text-right">per BH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {[
                  { label: "Pax Revenue", val: form.paxRevenue, asm: form.paxASM, rpm: form.paxRPM, fh: form.fhDec, bh: form.bhDec },
                  { label: "Cargo Revenue", val: form.cargoRevenue, asm: form.paxASM, rpm: form.paxRPM, fh: form.fhDec, bh: form.bhDec },
                  { label: "Total Revenue", val: form.totalRevenue, asm: form.totalASM, rpm: form.totalRPM, fh: form.fhDec, bh: form.bhDec, bold: true },
                ].map((row, i) => (
                  <tr key={i} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-800/20", row.bold && "font-bold bg-slate-50 dark:bg-slate-800/30")}>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{row.label}</td>
                    <td className="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400 font-bold">{Math.round(row.val || 0)}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(div0(row.val, row.asm))}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(div0(row.val, row.rpm))}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(div0(row.val, row.fh))}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(div0(row.val, row.bh))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* --- SECTION 4: COSTS BREAKDOWN --- */}
        <Section title="Operational Costs Breakdown" icon={Calculator}>
          
          <div className="space-y-2">
            {/* FUEL */}
            <CostRow 
              label={<span className="flex items-center gap-2"><Fuel size={16}/> Fuel</span>}
              value={fmt(form.fuelValue)}
              perASM={fmt(form.fuelPerASM)}
              perRPM={fmt(form.fuelPerRPM)}
              perFH={fmt(form.fuelPerFH)}
              perBH={fmt(form.fuelPerBH)}
              subInputs={
                <>
                  <Input label="Consumption" type="number" value={form.fuelConsKgPerFH} onChange={(e) => onChange("fuelConsKgPerFH", Number(e.target.value))} suffix="Kg" />
                  <Select label="Unit" value={form.fuelConsUnit} onChange={(e) => onChange("fuelConsUnit", e.target.value)} options={[{value:"per FH", label:"per FH"}, {value:"per FLGT", label:"per FLGT"}]} />
                  <Input label="Price" type="number" value={form.fuelPricePerL} onChange={(e) => onChange("fuelPricePerL", Number(e.target.value))} suffix="/ L" />
                </>
              }
            />

            {/* MAINTENANCE */}
            <CostRow 
              label={<span className="flex items-center gap-2"><Wrench size={16}/> Maintenance</span>}
              value={fmt(form.maintValue)}
              perASM={fmt(form.maintPerASM)}
              perRPM={fmt(form.maintPerRPM)}
              perFH={fmt(form.maintPerFH)}
              perBH={fmt(form.maintPerBH)}
              subInputs={
                <>
                  <Input label="Reserve + Other" type="number" value={form.maintReservePerFHInput} onChange={(e) => onChange("maintReservePerFHInput", Number(e.target.value))} suffix="per FH" />
                  <Input label="Reserve + Other" type="number" value={form.maintOtherPerFLGTInput} onChange={(e) => onChange("maintOtherPerFLGTInput", Number(e.target.value))} suffix="per FLGT" />
                </>
              }
            />

            {/* CREW */}
            <CostRow 
              label={<span className="flex items-center gap-2"><Briefcase size={16}/> Crew</span>}
              value={fmt(form.crewValue)}
              perASM={fmt(form.crewPerASM)}
              perRPM={fmt(form.crewPerRPM)}
              perFH={fmt(form.crewPerFH)}
              perBH={fmt(form.crewPerBH)}
              subInputs={
                <>
                  <Input label="Pilots" type="number" value={form.pilots} onChange={(e) => onChange("pilots", Number(e.target.value))} />
                  <Input label="Pilot Rate" type="number" value={form.pilotRatePerBH} onChange={(e) => onChange("pilotRatePerBH", Number(e.target.value))} suffix="per BH" />
                  <Input label="Cabin Crew" type="number" value={form.cabin} onChange={(e) => onChange("cabin", Number(e.target.value))} />
                  <Input label="Cabin Rate" type="number" value={form.cabinRatePerBH} onChange={(e) => onChange("cabinRatePerBH", Number(e.target.value))} suffix="per BH" />
                </>
              }
            />

            {/* NAVIGATION */}
            <CostRow 
              label={<span className="flex items-center gap-2"><Navigation size={16}/> Navigation</span>}
              value={fmt(form.navValue)}
              perASM={fmt(form.navPerASM)}
              perRPM={fmt(form.navPerRPM)}
              perFH={fmt(form.navPerFH)}
              perBH={fmt(form.navPerBH)}
              subInputs={
                <>
                  <Input label="Enroute" type="number" value={form.navEnroutePerFLGT} onChange={(e) => onChange("navEnroutePerFLGT", Number(e.target.value))} suffix="per FLGT" />
                  <Input label="Terminal" type="number" value={form.navTerminalPerArr} onChange={(e) => onChange("navTerminalPerArr", Number(e.target.value))} suffix="per Arr" />
                </>
              }
            />

            {/* AIRPORT */}
            <CostRow 
              label={<span className="flex items-center gap-2"><TowerControl size={16}/> Airport</span>}
              value={fmt(form.airportValue)}
              perASM={fmt(form.airportPerASM)}
              perRPM={fmt(form.airportPerRPM)}
              perFH={fmt(form.airportPerFH)}
              perBH={fmt(form.airportPerBH)}
              subInputs={
                <>
                  <Input label="Landing" type="number" value={form.airportLandingPerArr} onChange={(e) => onChange("airportLandingPerArr", Number(e.target.value))} suffix="per Arr" />
                  <Input label="Parking" type="number" value={form.airportParkingPerArr} onChange={(e) => onChange("airportParkingPerArr", Number(e.target.value))} suffix="per Arr" />
                </>
              }
            />

            {/* GROUND */}
            <CostRow 
              label={<span className="flex items-center gap-2"><Truck size={16}/> Ground Ops</span>}
              value={fmt(form.groundValue)}
              perASM={fmt(form.groundPerASM)}
              perRPM={fmt(form.groundPerRPM)}
              perFH={fmt(form.groundPerFH)}
              perBH={fmt(form.groundPerBH)}
              subInputs={
                <>
                  <Input label="Handling" type="number" value={form.groundHandlingPerDep} onChange={(e) => onChange("groundHandlingPerDep", Number(e.target.value))} suffix="per Dep" />
                  <Input label="GSE" type="number" value={form.groundGSEPerDep} onChange={(e) => onChange("groundGSEPerDep", Number(e.target.value))} suffix="per Dep" />
                </>
              }
            />
            
            {/* DIRECT OPERATING */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20 my-4">
              <CostRow 
                label={<span className="font-bold text-indigo-700 dark:text-indigo-400">Total Direct Operating</span>}
                value={fmt(form.docValue)}
                perASM={fmt(form.docPerASM)}
                perRPM={fmt(form.docPerRPM)}
                perFH={fmt(form.docPerFH)}
                perBH={fmt(form.docPerBH)}
              />
            </div>

            {/* OWNERSHIP */}
            <CostRow 
              label="Aircraft Ownership"
              value={fmt(form.ownershipValue)}
              perASM={fmt(form.ownershipPerASM)}
              perRPM={fmt(form.ownershipPerRPM)}
              perFH={fmt(form.ownershipPerFH)}
              perBH={fmt(form.ownershipPerBH)}
              subInputs={
                <>
                   <Input label="Rate" type="number" value={form.ownershipPerFLGT} onChange={(e) => onChange("ownershipPerFLGT", Number(e.target.value))} />
                   <Select label="Unit" value={form.ownershipUnit} onChange={(e) => onChange("ownershipUnit", e.target.value)} options={[{value:"per FLGT", label:"per FLGT"}, {value:"per BH", label:"per BH"}]} />
                </>
              }
            />

            {/* INSURANCE */}
            <CostRow 
              label={<span className="flex items-center gap-2"><ShieldCheck size={16}/> Insurance</span>}
              value={fmt(form.insuranceValue)}
              perASM={fmt(form.insurancePerASM)}
              perRPM={fmt(form.insurancePerRPM)}
              perFH={fmt(form.insurancePerFH)}
              perBH={fmt(form.insurancePerBH)}
              subInputs={
                <>
                   <div className="flex gap-2">
                    <Input label="Hull Rate" type="number" value={form.hullPerBH} onChange={(e) => onChange("hullPerBH", Number(e.target.value))} />
                    <Select label="Unit" value={form.hullUnit} onChange={(e) => onChange("hullUnit", e.target.value)} options={[{value:"per FLGT", label:"per FLGT"}, {value:"per BH", label:"per BH"}]} />
                   </div>
                   <div className="flex gap-2">
                    <Input label="Liability" type="number" value={form.liabilityPerFLGT} onChange={(e) => onChange("liabilityPerFLGT", Number(e.target.value))} />
                    <Select label="Unit" value={form.liabilityUnit} onChange={(e) => onChange("liabilityUnit", e.target.value)} options={[{value:"per FLGT", label:"per FLGT"}, {value:"per BH", label:"per BH"}]} />
                   </div>
                </>
              }
            />
            
            {/* TOTAL OPERATING */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mt-4">
              <CostRow 
                label={<span className="font-bold text-slate-800 dark:text-white">Total Operating Cost</span>}
                value={fmt(form.operatingValue)}
                perASM={fmt(form.operatingPerASM)}
                perRPM={fmt(form.operatingPerRPM)}
                perFH={fmt(form.operatingPerFH)}
                perBH={fmt(form.operatingPerBH)}
              />
            </div>
          </div>
        </Section>

        {/* --- SECTION 5: PROFIT/LOSS --- */}
        <Section title="Final Analysis" icon={Activity} className="border-indigo-500/30 dark:border-indigo-500/30 shadow-indigo-500/10">
          <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
             <CostRow 
                label={<span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">Operating Profit/Loss</span>}
                value={fmt(form.opValue)}
                perASM={fmt(form.opPerASM)}
                perRPM={fmt(form.opPerRPM)}
                perFH={fmt(form.opPerFH)}
                perBH={fmt(form.opPerBH)}
              />
          </div>
        </Section>

        {/* --- FOOTER CONTENT (Email) --- */}
        <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400 pb-24">
          <p>
            Email <a href="mailto:admin@airlineplan.com" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">admin@airlineplan.com</a> for questions on the revenue and cost of aircraft types on routes.
          </p>
          <p className="mt-1 text-slate-400 dark:text-slate-500 text-xs">
            You can include aircraft type(s) and route(s) in your email and receive our estimate(s).
          </p>
        </div>

        {/* --- FIXED FLOATING FOOTER ACTION --- */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 flex justify-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]"
        >
          <div className="w-full max-w-7xl flex justify-between items-center gap-4">
            
            {/* Left: Dashboard Button */}
            <Link 
              to="/" 
              className="flex items-center gap-2 px-6 py-3 text-slate-600 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              <LayoutDashboard size={20} />
              <span className="hidden sm:inline">Airlineplan Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>

            {/* Right: Calculate Button */}
            <button
              onClick={handleCalculate}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-3"
            >
              <Calculator size={20} /> Calculate
            </button>
          </div>
        </motion.div>
        
        {/* Spacer for fixed footer */}
        <div className="h-10"></div>

      </div>
    </div>
  );
}