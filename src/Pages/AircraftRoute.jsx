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
    pilotRatePerBH: 12000,   // 👈 new: rate for flight crew
  cabinRatePerBH: 12000,
    bizRevenue: 0,
    cargoRevenue: 0,
    taxiTime: "",
    tripDistance: "",
    tripDistanceUnit: "NM",
    cargoRate: "",
    fuelConsUnit: "per FH",
    fuelConsKgPerFH: "",
    fuelPricePerL: "",
    maintPerFH: "",
    maintPerFLGT: "",
    pilots: 2,
    cabin: 4,
    crewPerBH: 12000,
    navEnroutePerFLGT: 12000,
    navTerminalPerArr: 12000,
    airportLandingPerArr: 12000,
    airportParkingPerArr: 12000,
    groundHandlingPerDep: 12000,
    groundGSEPerDep: 12000,
    ownershipPerFLGT: 9000,
    hullPerBH: 1500,
    liabilityPerFLGT: 200,
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

    // Calculate Flight Hours
    const flightTime = addTimes(form.blockHours, form.taxiTime);

     const econPassengers =
      Number(form.econSeats) * (Number(form.lfEcon) / 100);
    const bizPassengers =
      Number(form.bizSeats) * (Number(form.lfBiz) / 100);
    const cargoCarried =
      Number(form.cargoCap) * (Number(form.lfCargo) / 100);

    const econRevenue = econPassengers * Number(form.econFare || 0);
    const bizRevenue = bizPassengers * Number(form.bizFare || 0);
    const cargoRevenue = cargoCarried * Number(form.cargoRate || 0);

    setForm((f) => ({ ...f, flightHours: flightTime,
      econPassengers,
      bizPassengers,
      cargoCarried,
      econRevenue,
      bizRevenue,
      cargoRevenue,
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

// convenient locals
const dist = Number(form.tripDistance || 0);
const seatsTotal = Number(form.econSeats || 0) + Number(form.bizSeats || 0);
const paxPassengersTotal =
  Number(form.econPassengers || 0) + Number(form.bizPassengers || 0);
const fhDec = hhmmToDec(form.flightHours || "0:00");
const bhDec = hhmmToDec(form.blockHours || "0:00");

// revenues
const paxRevenue = (Number(form.econRevenue) || 0) + (Number(form.bizRevenue) || 0);
const cargoRevenue = Number(form.cargoRevenue || 0);
const totalRevenue = paxRevenue + cargoRevenue;

// denominators (as per your formulas)
const paxASM = seatsTotal * dist;
const paxRPM = paxPassengersTotal * dist;

const cargoASM = Number(form.cargoCap || 0) * dist;
const cargoRPM = Number(form.cargoCarried || 0) * dist;

const totalASM = seatsTotal * dist;                 // (9) same as pax ASM
const totalRPM = paxPassengersTotal * dist;   

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
          {Math.round(paxRevenue)}
        </Box>
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(paxRevenue, paxASM))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(paxRevenue, paxRPM))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(paxRevenue, fhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(paxRevenue, bhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
    </TableRow>

    {/* Cargo revenue */}
    <TableRow>
      <TableCell sx={{ fontWeight: 600 }}>Cargo revenue</TableCell>
      <TableCell align="right">
        <Box sx={{ fontFamily: "monospace", bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"), px: 1, py: 0.5, borderRadius: 1, textAlign: "right" }}>
          {Math.round(cargoRevenue)}
        </Box>
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(cargoRevenue, cargoASM))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(cargoRevenue, cargoRPM))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(cargoRevenue, fhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(cargoRevenue, bhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
    </TableRow>

    {/* Total revenue */}
    <TableRow>
      <TableCell sx={{ fontWeight: 600 }}>Total revenue</TableCell>
      <TableCell align="right">
        <Box sx={{ fontFamily: "monospace", bgcolor: (t) => (t.palette.mode === "light" ? "#fffdf6" : "#2b2b22"), px: 1, py: 0.5, borderRadius: 1, textAlign: "right" }}>
          {Math.round(totalRevenue)}
        </Box>
      </TableCell>  
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(totalRevenue, totalASM))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(totalRevenue, totalRPM))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(totalRevenue, fhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
      <TableCell align="right">
        <TextField size="small" fullWidth value={fmt(div0(totalRevenue, bhDec))} InputProps={{ readOnly: true, sx: inputSx }} />
      </TableCell>
    </TableRow>
  </TableBody>
</Table>

        <SectionTitle title="Costs" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Fuel
        </Typography>
        <Grid container spacing={2} alignItems="center">
          {[0, 1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={2} key={`fuel-${i}`}>
              <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
            </Grid>
          ))}
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Maintenance cost
          </Typography>
          <Grid container spacing={2} alignItems="center">
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={`maint-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField
                label="Maintenance reserve"
                type="number"
                value={form.maintPerFH}
                onChange={(e) => onChange("maintPerFH", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per FH</InputAdornment> }}
                fullWidth
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Crew cost
          </Typography>
          <Grid>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
    <Grid item xs={12} md={3}>
      <TextField size="small" fullWidth label="per ASM" defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField size="small" fullWidth label="per RPM" defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField size="small" fullWidth label="per FH" defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField size="small" fullWidth label="per BH" defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
    </Grid>
    
  </Grid>
            <Grid container spacing={2} alignItems="center">
    {/* Flight Crew row */}
    <Grid item xs={12} md={3}>
      <TextField
        label="Flight Crew"
        type="number"
        value={form.pilots}
        onChange={(e) => onChange("pilots", Number(e.target.value))}
        InputProps={{ endAdornment: <InputAdornment position="end">#Pilot</InputAdornment> }}
        fullWidth
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField
        label="Rate (Flight Crew)"
        type="number"
        value={form.pilotRatePerBH}
        onChange={(e) => onChange("pilotRatePerBH", Number(e.target.value))}
        InputProps={{ endAdornment: <InputAdornment position="end">per BH</InputAdornment> }}
        fullWidth
      />
    </Grid>

    {/* Cabin Crew row */}
    <Grid item xs={12} md={3}>
      <TextField
        label="Cabin Crew"
        type="number"
        value={form.cabin}
        onChange={(e) => onChange("cabin", Number(e.target.value))}
        InputProps={{ endAdornment: <InputAdornment position="end">#Cabin</InputAdornment> }}
        fullWidth
      />
    </Grid>
    <Grid item xs={12} md={3}>
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
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Navigation
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth defaultValue="24000" InputProps={{ sx: inputSx }} />
            </Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={`nav-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField
                label="Enroute"
                type="number"
                value={form.navEnroutePerFLGT}
                onChange={(e) =>
                  onChange("navEnroutePerFLGT", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Terminal"
                type="number"
                value={form.navTerminalPerArr}
                onChange={(e) =>
                  onChange("navTerminalPerArr", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Airport
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth defaultValue="24000" InputProps={{ sx: inputSx }} />
            </Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={`apt-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField
                label="Landing"
                type="number"
                value={form.airportLandingPerArr}
                onChange={(e) =>
                  onChange("airportLandingPerArr", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Parking"
                type="number"
                value={form.airportParkingPerArr}
                onChange={(e) =>
                  onChange("airportParkingPerArr", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Ground operations
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth defaultValue="24000" InputProps={{ sx: inputSx }} />
            </Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={`gnd-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField
                label="Handling"
                type="number"
                value={form.groundHandlingPerDep}
                onChange={(e) =>
                  onChange("groundHandlingPerDep", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per departure</InputAdornment> }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="GSE (BME/GPU+ACU+ASU)"
                type="number"
                value={form.groundGSEPerDep}
                onChange={(e) =>
                  onChange("groundGSEPerDep", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per departure</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Direct Operating cost
          </Typography>
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={`doc-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Aircraft Ownership cost allocation
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Rate"
                type="number"
                value={form.ownershipPerFLGT}
                onChange={(e) =>
                  onChange("ownershipPerFLGT", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth defaultValue="9000" InputProps={{ sx: inputSx }} />
            </Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={`own-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Insurance
          </Typography>
          <Grid container spacing={2} alignItems="center">
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={`ins-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
            <Grid item xs={12} md={2} />
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
                onChange={(e) =>
                  onChange("liabilityPerFLGT", Number(e.target.value))
                }
                InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Operating cost
          </Typography>
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={`opc-${i}`}>
                <TextField size="small" fullWidth defaultValue="#VALUE!" InputProps={{ sx: inputSx }} />
              </Grid>
            ))}
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
