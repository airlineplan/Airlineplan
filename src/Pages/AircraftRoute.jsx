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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Stack,
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

function ValueBox({ value = "#VALUE!" }) {
  // Make placeholder cells editable using an uncontrolled TextField
  return (
    <TextField
      size="small"
      fullWidth
      defaultValue={value}
      InputProps={{
        sx: {
          fontFamily: "monospace",
          '& input': {
            bgcolor: (t) => (t.palette.mode === 'light' ? '#fffdf6' : '#2b2b22'),
          },
        },
      }}
    />
  );
}
    

export default function AircraftRoute() {
  const [form, setForm] = React.useState({
    dep: "",
    arr: "",
    blockHours: "",
    taxiTime: "",
    tripDistance: "",
    econSeats: "",
    bizSeats: "",
    cargoCap: "",
    lfEcon: 0.1,
    lfBiz: 0.8,
    econFare: "",
    bizFare: "",
    cargoRate: "",
    fuelConsKgPerFH: 12000,
    fuelPricePerL: 80,
    maintPerFH: 12000,
    maintPerFLGT: 12000,
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

  const onChange = () => setForm((f) => ({ ...f, [key]: value }));

  // For now, we only mock outputs; calculations can be wired later.
  const value = "#VALUE!";

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          Route
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Departure station/city"
              fullWidth
              value={form.dep}
              onChange={(e) => onChange("dep", e.target.value)}
              helperText="3 or 4 alphanumeric"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Arrival station/city"
              fullWidth
              value={form.arr}
              onChange={(e) => onChange("arr", e.target.value)}
              helperText="3 or 4 alphanumeric"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Block hours (BH)"
              fullWidth
              value={form.blockHours}
              onChange={(e) => onChange("blockHours", e.target.value)}
              placeholder="hh:mm"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Total taxi time"
              fullWidth
              value={form.taxiTime}
              onChange={(e) => onChange("taxiTime", e.target.value)}
              placeholder="hh:mm"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Flight hours (FH)"
              fullWidth
              value={value}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Trip air distance"
              type="number"
              fullWidth
              value={form.tripDistance}
              onChange={(e) => onChange("tripDistance", e.target.value)}
              helperText="Int min 0 max 20k"
            />
          </Grid>
        </Grid>

        <SectionTitle title="Capacity" />
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              label="Economy class Seats"
              type="number"
              fullWidth
              value={form.econSeats}
              onChange={(e) => onChange("econSeats", e.target.value)}
              helperText="Int min 0 max 600"
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Typography sx={{ fontWeight: 600 }}>10%</Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Economy class passengers"
              fullWidth
              value={value}
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
              helperText="Int min 0 max 999k"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Economy class revenue" fullWidth value={value} InputProps={{ readOnly: true }} />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Business class Seats"
              type="number"
              fullWidth
              value={form.bizSeats}
              onChange={(e) => onChange("bizSeats", e.target.value)}
              helperText="Int min 0 max 600"
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <TextField
              label="Load factor"
              type="number"
              value={Math.round(form.lfBiz * 100)}
              onChange={(e) => onChange("lfBiz", Number(e.target.value) / 100)}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Business class passengers" fullWidth value={value} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Fares & Rates: Business"
              type="number"
              fullWidth
              value={form.bizFare}
              onChange={(e) => onChange("bizFare", e.target.value)}
              helperText="Int min 0 max 999k"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Business class revenue" fullWidth value={value} InputProps={{ readOnly: true }} />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Cargo capacity (Kg)"
              type="number"
              fullWidth
              value={form.cargoCap}
              onChange={(e) => onChange("cargoCap", e.target.value)}
              helperText="Int min 0 max 150k"
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Typography>No decimal</Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Cargo carried (Kg)" fullWidth value={value} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Cargo rate"
              type="number"
              fullWidth
              value={form.cargoRate}
              onChange={(e) => onChange("cargoRate", e.target.value)}
              helperText="Int min 0 max 999k"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Cargo revenue" fullWidth value={value} InputProps={{ readOnly: true }} />
          </Grid>
        </Grid>

        <SectionTitle title="Revenue" />
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right">per ASM</TableCell>
              <TableCell align="right">per RPM</TableCell>
              <TableCell align="right">per FH</TableCell>
              <TableCell align="right">per BH</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              { label: "Pax revenue" },
              { label: "Cargo revenue" },
              { label: "Total revenue" },
            ].map((r) => (
              <TableRow key={r.label}>
                <TableCell sx={{ fontWeight: 600 }}>{r.label}</TableCell>
                <TableCell align="right"><ValueBox /></TableCell>
                <TableCell align="right"><ValueBox /></TableCell>
                <TableCell align="right"><ValueBox /></TableCell>
                <TableCell align="right"><ValueBox /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <SectionTitle title="Costs" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Fuel</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}><ValueBox /></Grid>
          <Grid item xs={12} md={2}><ValueBox /></Grid>
          <Grid item xs={12} md={2}><ValueBox /></Grid>
          <Grid item xs={12} md={2}><ValueBox /></Grid>
          <Grid item xs={12} md={2}><ValueBox /></Grid>
          <Grid item xs={12} md={2} />
          <Grid item xs={12} md={2}>
            <TextField
              label="Consumption (Kg)"
              type="number"
              value={form.fuelConsKgPerFH}
              onChange={(e) => onChange("fuelConsKgPerFH", Number(e.target.value))}
              InputProps={{ endAdornment: <InputAdornment position="end">per FH</InputAdornment> }}
              fullWidth
            />
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Maintenance cost</Typography>
          <Grid container spacing={2} alignItems="center">
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={i}>
                <ValueBox />
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Crew cost</Typography>
          <Grid container spacing={2} alignItems="center">
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={6} md={2}>
              <TextField label="#Pilots" type="number" value={form.pilots} onChange={(e)=>onChange("pilots", Number(e.target.value))} fullWidth />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="#Cabin" type="number" value={form.cabin} onChange={(e)=>onChange("cabin", Number(e.target.value))} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Rate"
                type="number"
                value={form.crewPerBH}
                onChange={(e)=>onChange("crewPerBH", Number(e.target.value))}
                InputProps={{ endAdornment: <InputAdornment position="end">per BH</InputAdornment> }}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Navigation</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}><ValueBox value={"24000"} /></Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField label="Enroute" type="number" value={form.navEnroutePerFLGT} onChange={(e)=>onChange("navEnroutePerFLGT", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Terminal" type="number" value={form.navTerminalPerArr} onChange={(e)=>onChange("navTerminalPerArr", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }} fullWidth />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Airport</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}><ValueBox value={"24000"} /></Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField label="Landing" type="number" value={form.airportLandingPerArr} onChange={(e)=>onChange("airportLandingPerArr", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Parking" type="number" value={form.airportParkingPerArr} onChange={(e)=>onChange("airportParkingPerArr", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per arrival</InputAdornment> }} fullWidth />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Ground operations</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}><ValueBox value={"24000"} /></Grid>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField label="Handling" type="number" value={form.groundHandlingPerDep} onChange={(e)=>onChange("groundHandlingPerDep", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per departure</InputAdornment> }} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="GSE (BME/GPU+ACU+ASU)" type="number" value={form.groundGSEPerDep} onChange={(e)=>onChange("groundGSEPerDep", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per departure</InputAdornment> }} fullWidth />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Direct Operating cost</Typography>
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Aircraft Ownership cost allocation</Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Rate" type="number" value={form.ownershipPerFLGT} onChange={(e)=>onChange("ownershipPerFLGT", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <ValueBox value={"9000"} />
            </Grid>
            {[0,1,2,3].map((i)=> (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Insurance</Typography>
          <Grid container spacing={2} alignItems="center">
            {[0,1,2,3,4].map((i)=> (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
            <Grid item xs={12} md={2} />
            <Grid item xs={12} md={2}>
              <TextField label="Aircraft Hull insurance" type="number" value={form.hullPerBH} onChange={(e)=>onChange("hullPerBH", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per BH</InputAdornment> }} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Passenger + Third party" type="number" value={form.liabilityPerFLGT} onChange={(e)=>onChange("liabilityPerFLGT", Number(e.target.value))} InputProps={{ endAdornment: <InputAdornment position="end">per FLGT</InputAdornment> }} fullWidth />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Operating cost</Typography>
          <Grid container spacing={2}>
            {[0,1,2,3,4].map((i)=> (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Operating profit/loss</Typography>
          <Grid container spacing={2}>
            {[0,1,2,3,4].map((i)=> (
              <Grid item xs={12} md={2} key={i}><ValueBox /></Grid>
            ))}
          </Grid>
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button variant="contained" size="large">Calculate</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
