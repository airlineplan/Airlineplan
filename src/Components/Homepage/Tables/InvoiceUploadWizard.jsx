import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../../apiConfig";
import MaintenancePlanningModal from "./MaintenancePlanningModal";
import { inputClass, buttonClass } from "./maintenanceFormStyles";
import PropTypes from "prop-types";
import { invoiceLineFromCandidate, invoiceReviewTotal } from "./invoiceConfirmation";
const blank = () => ({ mrAccId: "", schMxEvent: "", sn: "", rate: "", utilisation: "", contribution: "" });
const norm = value => String(value || "").trim().toUpperCase();
export default function InvoiceUploadWizard({ settings, onClose, onSaved }) {
  const [step, setStep] = useState(0), [draft, setDraft] = useState(null), [busy, setBusy] = useState(false), [fleet, setFleet] = useState([]);
  const [period, setPeriod] = useState(""), [regn, setRegn] = useState(""), [msn, setMsn] = useState("");
  const [line, setLine] = useState(blank), [lines, setLines] = useState([]), [result, setResult] = useState(null);
  useEffect(() => { api.get("/fleet").then(response => setFleet((response.data.data || []).filter(row => row.category === "Aircraft"))).catch(() => {}); }, []);
  const available = useMemo(() => settings.filter(row => norm(row.acftRegn) === norm(regn)), [settings, regn]);
  const matches = available.filter(row => (line.mrAccId ? norm(row.mrAccId) === norm(line.mrAccId) : norm(row.schMxEvent) === norm(line.schMxEvent)) && (!line.sn || norm(row.sn) === norm(line.sn)));
  const selected = matches.length === 1 ? matches[0] : null;
  const valid = selected && [line.rate, line.utilisation, line.contribution].every(value => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
  const upload = async file => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size > 10 * 1024 * 1024) return toast.error("Choose a PDF of at most 10 MB.");
    setBusy(true);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await api.post("/maintenance-reserve/invoices/extract", form);
      setDraft(response.data);
      const { months, aircraft } = response.data.candidates;
      if (months.length === 1) setPeriod(`${months[0].year}-${String(months[0].month).padStart(2, "0")}`);
      if (aircraft.length === 1) { setRegn(aircraft[0].regn || ""); setMsn(String(aircraft[0].msn || "")); }
      setStep(1);
    } catch (error) { toast.error(error.response?.data?.message || "Could not extract invoice."); }
    finally { setBusy(false); }
  };
  const addLine = nextStep => {
    if (!valid) return;
    if (lines.some(row => norm(row.mrAccId) === norm(selected.mrAccId))) return toast.error("This MR account is already in the review. Remove it there before changing it.");
    setLines([...lines, { ...line, mrAccId: selected.mrAccId, schMxEvent: selected.schMxEvent, sn: selected.sn, ccy: selected.ccy, driver: selected.driver }]);
    setLine(blank()); setStep(nextStep);
  };
  const apply = async () => {
    setBusy(true);
    try {
      const [year, month] = period.split("-").map(Number);
      const response = await api.post("/maintenance-reserve/invoices/apply", { draftId: draft.draftId, acftRegn: norm(regn), msn, month, year, lines });
      setResult(response.data); onSaved(response.data.schedule); setStep(5);
      if (response.data.warning) toast.warning(response.data.warning); else toast.success("Invoice applied and reconciled.");
    } catch (error) { toast.error(error.response?.data?.message || "Could not apply invoice."); }
    finally { setBusy(false); }
  };
  const suggestion = candidate => setLine(invoiceLineFromCandidate(candidate, available));
  return <MaintenancePlanningModal title="Maintenance Reserve invoice" onClose={onClose} footer={<>
    {step > 0 && step < 5 && <button className={buttonClass} onClick={() => setStep(step - 1)}>Back</button>}
    <button className={buttonClass} onClick={onClose}>{step === 5 ? "Close" : "Cancel"}</button>
    {step === 1 && <button className={buttonClass} disabled={!/^\d{4}-\d{2}$/.test(period)} onClick={() => setStep(2)}>Confirm month</button>}
    {step === 2 && <button className={buttonClass} disabled={!regn.trim() || !msn.trim()} onClick={() => setStep(3)}>Confirm aircraft</button>}
    {step === 3 && <><button className={buttonClass} disabled={!valid} onClick={() => addLine(3)}>Add another event</button><button className={buttonClass} disabled={!valid && !lines.length} onClick={() => valid ? addLine(4) : setStep(4)}>Review</button></>}
    {step === 4 && <button className={`${buttonClass} bg-emerald-600 text-white`} disabled={busy || !lines.length} onClick={apply}>{busy ? "Applying…" : "Apply invoice"}</button>}
  </>}>
    <ol className="mb-6 flex flex-wrap gap-3 text-sm text-slate-500">{["Upload PDF", "Utilisation month", "Aircraft", "Maintenance events", "Review", "Reconciliation"].map((label, index) => <li key={label} className={index === step ? "font-bold text-indigo-600 dark:text-indigo-300" : ""}>{index + 1}. {label}</li>)}</ol>
    {step === 0 && <div className="max-w-xl space-y-4 rounded-xl border border-dashed border-slate-300 p-8"><h3 className="font-semibold">Upload an MR invoice</h3><p className="text-sm text-slate-500">PDF, up to 10 MB. Confirm every value before applying. Scanned PDFs can be entered manually.</p><input aria-label="Invoice PDF" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={event => upload(event.target.files[0])} />{busy && <p>Reading invoice…</p>}</div>}
    {step === 1 && <div className="max-w-xl space-y-5"><h3 className="text-lg font-semibold">Confirm the month and year of utilisation</h3><div className="flex flex-wrap gap-2">{draft.candidates.months.map(candidate => <button className={buttonClass} key={`${candidate.year}-${candidate.month}`} onClick={() => setPeriod(`${candidate.year}-${String(candidate.month).padStart(2, "0")}`)}>{candidate.month}/{candidate.year}</button>)}</div><label className="block">Utilisation month<input className={inputClass} type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>{!draft.textPreview.trim() && <p className="text-sm text-amber-700">No text suggestions were found. Enter the confirmed values manually.</p>}</div>}
    {step === 2 && <div className="max-w-xl space-y-4"><h3 className="text-lg font-semibold">Confirm the leased aircraft</h3><div className="flex flex-wrap gap-2">{draft.candidates.aircraft.map((candidate, index) => <button className={buttonClass} key={index} onClick={() => { setRegn(candidate.regn || ""); setMsn(String(candidate.msn || "")); }}>{candidate.regn} · MSN {candidate.msn}</button>)}</div><select className={inputClass} aria-label="Select Fleet aircraft" value={regn} onChange={event => { const row = fleet.find(item => item.regn === event.target.value); setRegn(event.target.value); setMsn(row?.sn || ""); }}><option value="">Select from Fleet or type below</option>{fleet.map(row => <option key={row._id} value={row.regn}>{row.regn} · MSN {row.sn}</option>)}</select><label className="block">ACFT Regn<input className={inputClass} value={regn} onChange={event => setRegn(event.target.value)} /></label><label className="block">MSN<input className={inputClass} value={msn} onChange={event => setMsn(event.target.value)} /></label></div>}
    {step === 3 && <div className="space-y-5"><h3 className="text-lg font-semibold">Confirm a maintenance event for {regn}</h3><div className="flex flex-wrap gap-2">{draft.candidates.lines.map((candidate, index) => <button className={`${buttonClass} max-w-sm text-left`} title={candidate.description} key={index} onClick={() => suggestion(candidate)}><span className="block font-medium">{candidate.description}</span>{candidate.rate != null && <span className="block text-xs">Rate {candidate.rate} {candidate.currency} · {candidate.utilisation} {candidate.utilisationMetric} · Amount {candidate.amount} {candidate.currency}</span>}</button>)}</div><div className="grid max-w-4xl gap-4 md:grid-cols-2">
      <label>MR setting<select className={inputClass} value={line.mrAccId} onChange={event => { const row = available.find(item => item.mrAccId === event.target.value); setLine({ ...line, mrAccId: event.target.value, schMxEvent: row?.schMxEvent || "", sn: row?.sn || "" }); }}><option value="">Select an event/account</option>{available.map(row => <option key={row.mrAccId} value={row.mrAccId}>{row.schMxEvent} · {row.sn} · {row.mrAccId}</option>)}</select></label>
      <label>Maintenance event<input className={inputClass} value={line.schMxEvent} onChange={event => setLine({ ...line, mrAccId: "", schMxEvent: event.target.value })} /></label>
      <label>Serial number<input className={inputClass} value={line.sn} onChange={event => setLine({ ...line, mrAccId: "", sn: event.target.value })} /></label>
      <label>MR rate ({selected?.ccy || "setting currency"})<input className={inputClass} type="number" min="0" step="any" value={line.rate} onChange={event => setLine({ ...line, rate: event.target.value })} /></label>
      <label>Utilisation ({selected?.driver || "setting driver"})<input className={inputClass} type="number" min="0" step="any" value={line.utilisation} onChange={event => setLine({ ...line, utilisation: event.target.value })} /></label>
      <label>Confirmed contribution ({selected?.ccy || "setting currency"})<input className={inputClass} type="number" min="0" step="0.01" value={line.contribution} onChange={event => setLine({ ...line, contribution: event.target.value })} /></label>
    </div>{!selected && <p role="alert" className="text-sm text-rose-600">Select an MR setting matching this aircraft, event and SN. Ambiguous matches cannot be applied.</p>}{valid && <p className="text-sm text-slate-500">Confirmed contribution controls. Difference from rate × utilisation: {(Number(line.contribution) - Number(line.rate) * Number(line.utilisation)).toFixed(2)} {selected.ccy}.</p>}<p className="text-sm">{lines.length} event(s) added to review.</p></div>}
    {step === 4 && <><h3 className="mb-4 text-lg font-semibold">Review {regn} · MSN {msn} · {period}</h3><div className="overflow-auto"><table className="w-full text-sm"><thead><tr>{["MR Account", "Event", "SN", "Rate", "Utilisation", "Contribution", "Difference", ""].map(label => <th className="border-b p-3 text-left" key={label}>{label}</th>)}</tr></thead><tbody>{lines.map((row, index) => <tr key={row.mrAccId}>{[row.mrAccId, row.schMxEvent, row.sn, `${row.rate} ${row.ccy}`, `${row.utilisation} ${row.driver}`, `${row.contribution} ${row.ccy}`, (Number(row.contribution) - Number(row.rate) * Number(row.utilisation)).toFixed(2)].map((value, col) => <td className="border-b p-3" key={col}>{value}</td>)}<td><button className={buttonClass} onClick={() => setLines(lines.filter((_, i) => i !== index))}>Remove</button></td></tr>)}</tbody></table></div>{draft.candidates.total && <p className="mt-4 text-sm">PDF total: {draft.candidates.total.amount.toFixed(2)} {draft.candidates.total.currency}. Confirmed lines in that currency: {invoiceReviewTotal(lines.filter(row => norm(row.ccy) === norm(draft.candidates.total.currency))).toFixed(2)}. Difference: {(draft.candidates.total.amount - invoiceReviewTotal(lines.filter(row => norm(row.ccy) === norm(draft.candidates.total.currency)))).toFixed(2)}.</p>}<button className={`${buttonClass} mt-4 self-start`} onClick={() => setStep(3)}>Add another event</button></>}
    {step === 5 && <div className="space-y-4"><h3 className={`text-xl font-semibold ${result.status === "Reconciled" ? "text-emerald-600" : "text-amber-600"}`}>{result.status}</h3>{result.warning && <p role="alert" className="text-amber-700">{result.warning}</p>}<table className="w-full text-sm"><thead><tr>{["Check", "CCY", "Schedule total", "Invoiced flights", "Difference", "Result"].map(label => <th className="border-b p-3 text-left" key={label}>{label}</th>)}</tr></thead><tbody>{result.checks.map((check, index) => <tr key={index}>{[check.type, check.currency, check.scheduleTotal, check.masterTotal, check.diff, check.ok ? "Reconciled" : "Unreconciled"].map((value, col) => <td className="border-b p-3" key={col}>{value}</td>)}</tr>)}</tbody></table><p className="text-sm text-slate-500">Planned and Actual MR values are unchanged. Schedule rows are locked until an invoice for the same aircraft/month is applied again.</p></div>}
  </MaintenancePlanningModal>;
}
InvoiceUploadWizard.propTypes = { settings: PropTypes.arrayOf(PropTypes.shape({ mrAccId: PropTypes.string, schMxEvent: PropTypes.string, acftRegn: PropTypes.string, sn: PropTypes.string })).isRequired,
  onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired };
