import * as React from "react";
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  MenuItem
} from "@mui/material";

// Small helper to render a label+helper under section titles
function SectionTitle({ title }) {
  return (
    <Box sx={{ mb: 1, mt: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}

// Inline styling helper for the “sheet-like” input look
const inputSx = {
  fontFamily: "monospace",
  "& input": {
    bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"),
  },
};

export default function AircraftRoute() {
  const [form, setForm] = React.useState({
    dep: "",
    arr: "",
    blockHours: "",
    econSeats: "",
    bizSeats: "",
    cargoCap: "",
    lfEcon: 0,
    lfBiz: 0,
    lfCargo: 0,
    econFare: "",
    bizFare: "",
    econPassengers: 0,
    bizPassengers: 0,
    cargoCarried: 0,
    econRevenue: 0,
    pilotRatePerBH: 0,   // 👈 new: rate for flight crew
    cabinRatePerBH: 0,
    bizRevenue: 0,
    cargoRevenue: 0,
    taxiTime: "",
    tripDistance: "",
    tripDistanceUnit: "NM",
    cargoRate: "",
    fuelConsUnit: "per FH",
    fuelConsKgPerFH: "",
    fuelPricePerL: "",
    maintPerFH: 0,
    maintPerFLGT: 0,
    fuelValue: 0,
    fuelPerASM: 0,
    fuelPerRPM: 0,
    fuelPerFH: 0,
    fuelPerBH: 0,
    fhDec: 0,
    paxASM: 0,
    paxRPM: 0,
    cargoASM: 0,
    cargoRPM: 0,
    totalASM: 0,
    totalRPM: 0,
    paxRevenue: 0,
    maintValue: 0,
    maintPerASM: 0,
    maintPerRPM: 0,
    maintPerBH: 0,
    bhDec: 0,
    pilots: 0,
    cabin: 0,
    navEnroutePerFLGT: 0,
    navTerminalPerArr: 0,
    airportLandingPerArr: 0,
    airportParkingPerArr: 0,
    groundHandlingPerDep: 0,
    groundGSEPerDep: 0,
    ownershipPerFLGT: 0,
    hullPerBH: 0,
    liabilityPerFLGT: 0,
    crewValue: 0,
    crewPerASM: 0,
    crewPerRPM: 0,
    crewPerFH: 0,
    crewPerBH: 0,
    navValue: 0,
    navPerASM: 0,
    navPerRPM: 0,
    navPerFH: 0,
    navPerBH: 0,
    airportValue: 0,
    airportPerASM: 0,
    airportPerRPM: 0,
    airportPerFH: 0,
    airportPerBH: 0,
    groundValue: 0,
    groundPerASM: 0,
    groundPerRPM: 0,
    groundPerFH: 0,
    groundPerBH: 0,
  });

  const [errors, setErrors] = React.useState({});

  // ✅ Time helper to add HH:mm
  const addTimes = (t1, t2) => {
    const [h1, m1] = t1.split(":").map(Number);
    const [h2, m2] = t2.split(":").map(Number);
    let totalMin = m1 + m2;
    let totalHr = h1 + h2 + Math.floor(totalMin / 60);
    totalMin = totalMin % 60;
    return `${String(totalHr).padStart(2, "0")}:${String(totalMin).padStart(
      2,
      "0"
    )}`;
  };

  const validate = () => {
    const newErrors = {};

    // Departure & Arrival → 3-4 alphanumeric
    const codeRegex = /^[A-Za-z0-9]{3,4}$/;
    if (!codeRegex.test(form.dep)) newErrors.dep = "Must be 3-4 alphanumeric";
    if (!codeRegex.test(form.arr)) newErrors.arr = "Must be 3-4 alphanumeric";

    // HH:mm validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(form.blockHours))
      newErrors.blockHours = "Invalid HH:mm format";
    if (!timeRegex.test(form.taxiTime))
      newErrors.taxiTime = "Invalid HH:mm format";

    // Trip distance
    const dist = Number(form.tripDistance);
    if (isNaN(dist) || dist < 0 || dist > 20000)
      newErrors.tripDistance = "Must be between 0 and 20000";

    const toNum = (val) => Number(val) || 0;

    // Economy seats
    if (toNum(form.econSeats) < 0 || toNum(form.econSeats) > 600)
      newErrors.econSeats = "0–600 allowed";

    // Business seats
    if (toNum(form.bizSeats) < 0 || toNum(form.bizSeats) > 600)
      newErrors.bizSeats = "0–600 allowed";

    // Cargo
    if (toNum(form.cargoCap) < 0 || toNum(form.cargoCap) > 150000)
      newErrors.cargoCap = "0–150000 allowed";

    // Load factors
    ["lfEcon", "lfBiz", "lfCargo"].forEach((lf) => {
      const val = toNum(form[lf]);
      if (val < 0 || val > 100)
        newErrors[lf] = "Load factor must be 0–100%";
    });

    // Fares
    ["econFare", "bizFare", "cargoRate"].forEach((fare) => {
      const val = toNum(form[fare]);
      if (val < 0 || val > 999000)
        newErrors[fare] = "0–999000 allowed";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = () => {
    if (!validate()) return;

    // Flight Hours
    const flightTime = addTimes(form.blockHours, form.taxiTime);
    const fhDec = hhmmToDec(flightTime);
    const bhDec = hhmmToDec(form.blockHours || "0:00");

    // Passengers & cargo
    const econPassengers = Number(form.econSeats) * (Number(form.lfEcon) / 100);
    const bizPassengers = Number(form.bizSeats) * (Number(form.lfBiz) / 100);
    const cargoCarried = Number(form.cargoCap) * (Number(form.lfCargo) / 100);

    // Revenues
    const econRevenue = econPassengers * Number(form.econFare || 0);
    const bizRevenue = bizPassengers * Number(form.bizFare || 0);
    const paxRevenue = econRevenue + bizRevenue;
    const cargoRevenue = cargoCarried * Number(form.cargoRate || 0);
    const totalRevenue = paxRevenue + cargoRevenue;

    // Fuel
    const DENSITY_KG_PER_L = 0.78;
    const consumptionKg = Number(form.fuelConsKgPerFH || 0);
    const fuelPricePerL = Number(form.fuelPricePerL || 0);
    const unitMultiplier = form.fuelConsUnit === "per FH" ? fhDec : 1;
    const fuelValue = (consumptionKg / DENSITY_KG_PER_L) * fuelPricePerL * unitMultiplier;

    // Denominators
    const dist = Number(form.tripDistance || 0);
    const seatsTotal = Number(form.econSeats || 0) + Number(form.bizSeats || 0);
    const paxPassengersTotal = econPassengers + bizPassengers;

    const paxASM = seatsTotal * dist;
    const paxRPM = paxPassengersTotal * dist;
    const cargoASM = Number(form.cargoCap || 0) * dist;
    const cargoRPM = cargoCarried * dist;
    const totalASM = seatsTotal * dist;  // same as pax ASM
    const totalRPM = paxPassengersTotal * dist;

    // Fuel breakdowns
    const fuelPerASM = div0(fuelValue, paxASM);
    const fuelPerRPM = div0(fuelValue, paxRPM);
    const fuelPerFH = div0(fuelValue, fhDec);
    const fuelPerBH = div0(fuelValue, bhDec);

    const maintReservePerFH = Number(form.maintPerFH || 0);      // per FH
    const maintOtherPerFLGT = Number(form.maintPerFLGT || 0);    // per FLGT

    // (1) Value = (reserve per FH * Flight Hours) + Other per FLGT
    const maintValue = maintReservePerFH * fhDec + maintOtherPerFLGT;


    // (2) per ASM
    const maintPerASM = (seatsTotal > 0 && dist > 0) ? (maintValue / (seatsTotal * dist)) : 0;

    // (3) per RPM
    const maintPerRPM = (paxPassengersTotal > 0 && dist > 0) ? (maintValue / (paxPassengersTotal * dist)) : 0;

    // (4) per FH
    const maintPerFH = fhDec > 0 ? (maintValue / fhDec) : 0;

    // (5) per BH
    const maintPerBH = bhDec > 0 ? (maintValue / bhDec) : 0;

    // --- Crew cost ---
    // Value = (#Pilots * PilotRatePerBH * BlockHours) + (#Cabin * CabinRatePerBH * BlockHours)
    const pilotsCount = Number(form.pilots || 0);
    const cabinCount = Number(form.cabin || 0);
    const pilotRate = Number(form.pilotRatePerBH || 0);
    const cabinRate = Number(form.cabinRatePerBH || 0);

    const crewValue = (pilotsCount * pilotRate * bhDec) + (cabinCount * cabinRate * bhDec);


    // per ASM / RPM / FH / BH
    const crewPerASM = seatsTotal > 0 && dist > 0 ? (crewValue / (seatsTotal * dist)) : 0;
    const crewPerRPM = paxPassengersTotal > 0 && dist > 0 ? (crewValue / (paxPassengersTotal * dist)) : 0;
    const crewPerFH = fhDec > 0 ? (crewValue / fhDec) : 0;
    const crewPerBH = bhDec > 0 ? (crewValue / bhDec) : 0;

    const navPerASM = seatsTotal > 0 && dist > 0 ? (navValue / (seatsTotal * dist)) : 0;

    // (3) per RPM
    const navPerRPM = paxPassengersTotal > 0 && dist > 0 ? (navValue / (paxPassengersTotal * dist)) : 0;

    // (4) per FH
    const navPerFH = fhDec > 0 ? (navValue / fhDec) : 0;

    // (5) per BH
    const navPerBH = bhDec > 0 ? (navValue / bhDec) : 0;

    const landingPerArr = Number(form.airportLandingPerArr || 0);
    const parkingPerArr = Number(form.airportParkingPerArr || 0);

    // (1) Value
    const airportValue = landingPerArr + parkingPerArr;


    // (2) per ASM
    const airportPerASM = seatsTotal > 0 && dist > 0
      ? airportValue / (seatsTotal * dist)
      : 0;

    // (3) per RPM
    const airportPerRPM = paxPassengersTotal > 0 && dist > 0
      ? airportValue / (paxPassengersTotal * dist)
      : 0;

    // (4) per FH
    const airportPerFH = fhDec > 0 ? airportValue / fhDec : 0;

    // (5) per BH
    const airportPerBH = bhDec > 0 ? airportValue / bhDec : 0;

    const handlingPerDep = Number(form.groundHandlingPerDep || 0);
    const gsePerDep = Number(form.groundGSEPerDep || 0);

    // (1) Value = Handling + GSE
    const groundValue = handlingPerDep + gsePerDep;



    // (2) per ASM
    const groundPerASM = seatsTotal > 0 && dist > 0
      ? groundValue / (seatsTotal * dist)
      : 0;

    // (3) per RPM
    const groundPerRPM = paxPassengersTotal > 0 && dist > 0
      ? groundValue / (paxPassengersTotal * dist)
      : 0;

    // (4) per FH
    const groundPerFH = fhDec > 0 ? (groundValue / fhDec) : 0;

    // (5) per BH  (assuming your #5 was a typo; using BH here)
    const groundPerBH = bhDec > 0 ? (groundValue / bhDec) : 0;

    // Save everything
    setForm((f) => ({
      ...f,
      flightHours: flightTime,
      econPassengers,
      bizPassengers,
      cargoCarried,
      econRevenue,
      bizRevenue,
      paxRevenue,
      cargoRevenue,
      totalRevenue,
      paxASM,
      paxRPM,
      cargoASM,
      cargoRPM,
      totalASM,
      totalRPM,
      fuelValue,
      fuelPerASM,
      fuelPerRPM,
      fuelPerFH,
      fuelPerBH,
      maintValue,
      maintPerASM,
      maintPerRPM,
      maintPerFH,
      maintPerBH,
      crewValue,
      crewPerASM,
      crewPerRPM,
      crewPerFH,
      crewPerBH,
      navValue,
      navPerASM,
      navPerRPM,
      navPerFH,
      navPerBH,
      airportValue,
      airportPerASM,
      airportPerRPM,
      airportPerFH,
      airportPerBH,
      groundValue,
      groundPerASM,
      groundPerRPM,
      groundPerFH,
      groundPerBH,
    }));
  };


  // ✅ fixed: allow setting any key/value
  const onChange = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

  // For now, mock outputs; calculations can be wired later.
  const value = "#VALUE!";

  const hhmmToDec = (hhmm) => {
    if (!hhmm) return 0;
    const [h = "0", m = "0"] = hhmm.split(":");
    const hr = Number(h) || 0;
    const min = Number(m) || 0;
    return hr + min / 60;
  };

  // safe division (returns 0 when denom is 0)
  const div0 = (num, den) => (den ? num / den : 0);

  // number formatter for cells
  const fmt = (n) =>
    Number.isFinite(n) ? n.toFixed(2) : "0.00";



  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          Route
        </Typography>

        <Grid container spacing={2}>
          {/* Departure */}
          <Grid item xs={12} md={4}>
            <TextField
              label="Departure station/city"
              fullWidth
              value={form.dep}
              onChange={(e) => onChange("dep", e.target.value)}
              error={!!errors.dep}
              helperText={errors.dep || "3 or 4 alphanumeric"}
            />
          </Grid>

          {/* Arrival */}
          <Grid item xs={12} md={4}>
            <TextField
              label="Arrival station/city"
              fullWidth
              value={form.arr}
              onChange={(e) => onChange("arr", e.target.value)}
              error={!!errors.arr}
              helperText={errors.arr || "3 or 4 alphanumeric"}
            />
          </Grid>

          {/* Block Hours */}
          <Grid item xs={12} md={2}>
            <TextField
              label="Block hours (BH)"
              fullWidth
              value={form.blockHours}
              onChange={(e) => onChange("blockHours", e.target.value)}
              placeholder="hh:mm"
              error={!!errors.blockHours}
              helperText={errors.blockHours || "HH:mm"}
            />
          </Grid>

          {/* Taxi Time */}
          <Grid item xs={12} md={2}>
            <TextField
              label="Total taxi time"
              fullWidth
              value={form.taxiTime}
              onChange={(e) => onChange("taxiTime", e.target.value)}
              placeholder="hh:mm"
              error={!!errors.taxiTime}
              helperText={errors.taxiTime || "HH:mm"}
            />
          </Grid>

          {/* Flight Hours */}
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Flight hours (FH)
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "monospace",
                  bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"),
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                {form.flightHours || "--:--"}
              </Typography>
            </Box>
          </Grid>

          {/* Trip Distance */}
          <Grid item xs={12} md={3}>
            <TextField
              label="Trip Distance"
              type="number"
              fullWidth
              value={form.tripDistance}
              onChange={(e) => onChange("tripDistance", e.target.value)}
              error={!!errors.tripDistance}
              helperText={errors.tripDistance || "Int min 0 max 20000"}
            />
          </Grid>

          {/* Unit Select */}
          <Grid item xs={12} md={2}>
            <TextField
              select
              label="Unit"
              value={form.tripDistanceUnit}
              onChange={(e) => onChange("tripDistanceUnit", e.target.value)}
              fullWidth
            >
              <MenuItem value="NM">NM</MenuItem>
              <MenuItem value="Miles">Miles</MenuItem>
              <MenuItem value="Km">Km</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <SectionTitle title="Capacity" />
        <Grid container spacing={2} alignItems="center">
          {/* Economy */}
          <Grid item xs={12} md={3}>
            <TextField
              label="Economy class Seats"
              type="number"
              fullWidth
              value={form.econSeats}
              onChange={(e) => onChange("econSeats", e.target.value)}
              error={!!errors.econSeats}
              helperText={errors.econSeats || "0–600"}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <TextField
              label="Load factor"
              type="number"
              fullWidth
              value={form.lfEcon}
              onChange={(e) => onChange("lfEcon", e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              error={!!errors.lfEcon}
              helperText={errors.lfEcon || "0–100"}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Economy class passengers"
              fullWidth
              value={Math.round(form.econPassengers)}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Fares & Rates: Economy"
              type="number"
              fullWidth
              value={form.econFare}
              onChange={(e) => onChange("econFare", e.target.value)}
              error={!!errors.econFare}
              helperText={errors.econFare || "0–999000"}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Economy class revenue"
              fullWidth
              value={Math.round(form.econRevenue)}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          {/* Business */}
          <Grid item xs={12} md={3}>
            <TextField
              label="Business class Seats"
              type="number"
              fullWidth
              value={form.bizSeats}
              onChange={(e) => onChange("bizSeats", e.target.value)}
              error={!!errors.bizSeats}
              helperText={errors.bizSeats || "0–600"}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <TextField
              label="Load factor"
              type="number"
              fullWidth
              value={form.lfBiz}
              onChange={(e) => onChange("lfBiz", e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              error={!!errors.lfBiz}
              helperText={errors.lfBiz || "0–100"}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Business class passengers"
              fullWidth
              value={Math.round(form.bizPassengers)}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Fares & Rates: Business"
              type="number"
              fullWidth
              value={form.bizFare}
              onChange={(e) => onChange("bizFare", e.target.value)}
              error={!!errors.bizFare}
              helperText={errors.bizFare || "0–999000"}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Business class revenue"
              fullWidth
              value={Math.round(form.bizRevenue)}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          {/* Cargo */}
          <Grid item xs={12} md={3}>
            <TextField
              label="Cargo capacity (Kg)"
              type="number"
              fullWidth
              value={form.cargoCap}
              onChange={(e) => onChange("cargoCap", e.target.value)}
              error={!!errors.cargoCap}
              helperText={errors.cargoCap || "0–150000"}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <TextField
              label="Load factor"
              type="number"
              fullWidth
              value={form.lfCargo}
              onChange={(e) => onChange("lfCargo", e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              error={!!errors.lfCargo}
              helperText={errors.lfCargo || "0–100"}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Cargo carried (Kg)"
              fullWidth
              value={Math.round(form.cargoCarried)}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Cargo rate"
              type="number"
              fullWidth
              value={form.cargoRate}
              onChange={(e) => onChange("cargoRate", e.target.value)}
              error={!!errors.cargoRate}
              helperText={errors.cargoRate || "0–999000"}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Cargo revenue"
              fullWidth
              value={Math.round(form.cargoRevenue)}
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        <SectionTitle title="Revenue" />
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">per ASM</TableCell>
              <TableCell align="right">per RPM</TableCell>
              <TableCell align="right">per FH</TableCell>
              <TableCell align="right">per BH</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Pax revenue */}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Pax revenue</TableCell>
              <TableCell align="right">
                <Box sx={{ fontFamily: "monospace", bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"), px: 1, py: 0.5, borderRadius: 1, textAlign: "right" }}>
                  {Math.round((form.paxRevenue ?? 0).toFixed(2))}
                </Box>
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0((form.paxRevenue ?? 0).toFixed(2), form.paxASM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0((form.paxRevenue ?? 0).toFixed(2), form.paxASM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0((form.paxRevenue ?? 0).toFixed(2), form.paxASM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0((form.paxRevenue ?? 0).toFixed(2), form.paxASM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
            </TableRow>

            {/* Cargo revenue */}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Cargo revenue</TableCell>
              <TableCell align="right">
                <Box sx={{ fontFamily: "monospace", bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"), px: 1, py: 0.5, borderRadius: 1, textAlign: "right" }}>
                  {Math.round(form.cargoRevenue)}
                </Box>
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.cargoRevenue, form.cargoASM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.cargoRevenue, form.cargoRPM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.cargoRevenue, form.fhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.cargoRevenue, form.bhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
            </TableRow>

            {/* Total revenue */}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Total revenue</TableCell>
              <TableCell align="right">
                <Box sx={{ fontFamily: "monospace", bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"), px: 1, py: 0.5, borderRadius: 1, textAlign: "right" }}>
                  {Math.round(form.totalRevenue)}
                </Box>
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.totalRevenue, form.totalASM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.totalRevenue, form.totalRPM))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.totalRevenue, form.fhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
              <TableCell align="right">
                <TextField size="small" fullWidth value={fmt(div0(form.totalRevenue, form.bhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <SectionTitle title="Costs" />
        <Grid container spacing={2} alignItems="center">
          {/* Left-aligned label */}
          <Grid item xs={12} md={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Fuel
            </Typography>
          </Grid>

          {/* Value */}
          <Grid item xs={12} md={2}>
            <TextField
              size="small"
              fullWidth
              label="Value"
              value={fmt(form.fuelValue)}
              InputProps={{ readOnly: true, sx: inputSx }}
            />
          </Grid>

          {/* per ASM */}
          <Grid item xs={12} md={2}>
            <TextField
              size="small"
              fullWidth
              label="per ASM"
              value={fmt(form.fuelPerASM)}
              InputProps={{ readOnly: true, sx: inputSx }}
            />
          </Grid>

          {/* per RPM */}
          <Grid item xs={12} md={2}>
            <TextField
              size="small"
              fullWidth
              label="per RPM"
              value={fmt(form.fuelPerRPM)}
              InputProps={{ readOnly: true, sx: inputSx }}
            />
          </Grid>

          {/* per FH */}
          <Grid item xs={12} md={2}>
            <TextField
              size="small"
              fullWidth
              label="per FH"
              value={fmt(form.fuelPerFH)}
              InputProps={{ readOnly: true, sx: inputSx }}
            />
          </Grid>

          {/* per BH */}
          <Grid item xs={12} md={2}>
            <TextField
              size="small"
              fullWidth
              label="per BH"
              value={fmt(form.fuelPerBH)}
              InputProps={{ readOnly: true, sx: inputSx }}
            />
          </Grid>

          {/* second row inputs unchanged */}
          <Grid item xs={12} md={2} />
          <Grid item xs={12} md={2}>
            <TextField
              label="Consumption (Kg)"
              type="number"
              value={form.fuelConsKgPerFH}
              onChange={(e) => onChange("fuelConsKgPerFH", Number(e.target.value))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              label="Unit"
              value={form.fuelConsUnit || "per FH"}
              onChange={(e) => onChange("fuelConsUnit", e.target.value)}
              fullWidth
            >
              <MenuItem value="per FH">per FH</MenuItem>
              <MenuItem value="per FLGT">per FLGT</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Fuel price"
              type="number"
              value={form.fuelPricePerL}
              onChange={(e) => onChange("fuelPricePerL", Number(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">per Litre</InputAdornment> }}
              fullWidth
            />
          </Grid>
        </Grid>


        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Maintenance cost
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth label="Value" value={(form.maintValue ?? 0).toFixed(2)} InputProps={{ readOnly: true, sx: inputSx }} />

            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth label="per ASM" value={(form.maintPerASM ?? 0).toFixed(2)} InputProps={{ readOnly: true, sx: inputSx }} />

            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth label="per RPM" value={(form.maintPerRPM ?? 0).toFixed(2)} InputProps={{ readOnly: true, sx: inputSx }} />

            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth label="per FH" value={(Number(form.maintPerFH) ?? 0).toFixed(2)} InputProps={{ readOnly: true, sx: inputSx }} />

            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth label="per BH" value={(form.maintPerBH ?? 0).toFixed(2)} InputProps={{ readOnly: true, sx: inputSx }} />

            </Grid>

            {/* Second row: inputs stacked vertically under right side */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}
            <Grid item xs={12} md={2}>
              <TextField
                label="Maintenance reserve"
                type="number"
                value={form.maintPerFH}
                onChange={(e) => onChange("maintPerFH", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per FH</InputAdornment> }}
                fullWidth
                sx={{ maxWidth: 550 }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Other"
                type="number"
                value={form.maintPerFLGT}
                onChange={(e) => onChange("maintPerFLGT", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Crew cost
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                value={(form.crewValue ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                value={(form.crewPerASM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                value={(form.crewPerRPM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                value={(form.crewPerFH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                value={(form.crewPerBH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* Second row: Flight Crew + Cabin Crew */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}

            {/* Flight Crew count */}
            <Grid item xs={12} md={2}>
              <TextField
                label="Flight Crew"
                type="number"
                value={form.pilots}
                onChange={(e) => onChange("pilots", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">#Pilot</InputAdornment> }}
                fullWidth
              />
            </Grid>

            {/* Flight Crew rate */}
            <Grid item xs={12} md={2}>
              <TextField
                label="Rate (Flight Crew)"
                type="number"
                value={form.pilotRatePerBH}
                onChange={(e) => onChange("pilotRatePerBH", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per BH</InputAdornment> }}
                fullWidth
              />
            </Grid>

            {/* Cabin Crew count */}
            <Grid item xs={12} md={2}>
              <TextField
                label="Cabin Crew"
                type="number"
                value={form.cabin}
                onChange={(e) => onChange("cabin", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">#Cabin</InputAdornment> }}
                fullWidth
              />
            </Grid>

            {/* Cabin Crew rate */}
            <Grid item xs={12} md={2}>
              <TextField
                label="Rate (Cabin Crew)"
                type="number"
                value={form.cabinRatePerBH}
                onChange={(e) => onChange("cabinRatePerBH", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per BH</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Navigation
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                value={(form.navValue ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                value={(form.navPerASM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                value={(form.navPerRPM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                value={(form.navPerFH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                value={(form.navPerBH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* Second row inputs */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}

            <Grid item xs={12} md={2}>
              <TextField
                label="Enroute"
                type="number"
                value={form.navEnroutePerFLGT}
                onChange={(e) => onChange("navEnroutePerFLGT", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="Terminal"
                type="number"
                value={form.navTerminalPerArr}
                onChange={(e) => onChange("navTerminalPerArr", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>


        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Airport
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                value={(form.airportValue ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                value={(form.airportPerASM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                value={(form.airportPerRPM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                value={(form.airportPerFH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                value={(form.airportPerBH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* Second row inputs */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}

            <Grid item xs={12} md={2}>
              <TextField
                label="Landing"
                type="number"
                value={form.airportLandingPerArr}
                onChange={(e) => onChange("airportLandingPerArr", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="Parking"
                type="number"
                value={form.airportParkingPerArr}
                onChange={(e) => onChange("airportParkingPerArr", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>


        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Ground operations
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                value={(form.groundValue ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                value={(form.groundPerASM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                value={(form.groundPerRPM ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                value={(form.groundPerFH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                value={(form.groundPerBH ?? 0).toFixed(2)}
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* Second row inputs */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}

            <Grid item xs={12} md={2}>
              <TextField
                label="Handling"
                type="number"
                value={form.groundHandlingPerDep}
                onChange={(e) => onChange("groundHandlingPerDep", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per departure</InputAdornment> }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="GSE (BME/GPU+ACU+ASU)"
                type="number"
                value={form.groundGSEPerDep}
                onChange={(e) => onChange("groundGSEPerDep", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per departure</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>


        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Direct Operating cost
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>
          </Grid>
        </Box>


        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Aircraft Ownership cost allocation
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                defaultValue="9000"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* Second row: Rate input */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}

            <Grid item xs={12} md={2}>
              <TextField
                label="Rate"
                type="number"
                value={form.ownershipPerFLGT}
                onChange={(e) => onChange("ownershipPerFLGT", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>


        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Insurance
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* Second row inputs */}
            <Grid item xs={12} md={2} /> {/* spacer under label */}

            <Grid item xs={12} md={2}>
              <TextField
                label="Aircraft Hull insurance"
                type="number"
                value={form.hullPerBH}
                onChange={(e) => onChange("hullPerBH", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per BH</InputAdornment> }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="Passenger + Third party"
                type="number"
                value={form.liabilityPerFLGT}
                onChange={(e) => onChange("liabilityPerFLGT", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left-aligned label */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Operating cost
              </Typography>
            </Grid>

            {/* Value */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Value"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per ASM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per ASM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per RPM */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per RPM"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per FH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per FH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>

            {/* per BH */}
            <Grid item xs={12} md={2}>
              <TextField
                size="small"
                fullWidth
                label="per BH"
                defaultValue="#VALUE!"
                InputProps={{ readOnly: true, sx: inputSx }}
              />
            </Grid>
          </Grid>
        </Box>


        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Operating profit/loss
          </Typography>
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={`opl-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button variant="contained" size="large" onClick={handleCalculate}>
            Calculate
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
