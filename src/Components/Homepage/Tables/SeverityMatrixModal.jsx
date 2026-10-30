import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../../apiConfig";
import MaintenancePlanningModal from "./MaintenancePlanningModal";
import { inputClass, buttonClass } from "./maintenanceFormStyles";
import PropTypes from "prop-types";
import { CTD_DEFAULTS, matrixErrors } from "./maintenanceValidation";
export default function SeverityMatrixModal({ setting, onClose, onSaved, beforeSave }) {
  const [matrix, setMatrix] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api.get(`/cost-config/severity-matrix/${encodeURIComponent(setting.mrAccId)}`).then(response => { if (active) setMatrix(response.data.data); }).catch(error => toast.error(error.response?.data?.message || "Could not load matrix."));
    return () => { active = false; };
  }, [setting.mrAccId]);
  const errors = matrix ? matrixErrors(matrix) : [];
  const column = (index, metric, value) => setMatrix({ ...matrix, columns: matrix.columns.map((item, i) => i === index ? { ...item, [metric]: value } : item) });
  const cell = (index, key, value, col) => setMatrix({ ...matrix, rows: matrix.rows.map((row, i) => i !== index ? row : key === "hc" ? { ...row, hc: value } : { ...row, rates: row.rates.map((rate, j) => j === col ? value : rate) }) });
  const save = async () => {
    setBusy(true);
    try { if (beforeSave && !await beforeSave()) return; const response = await api.put(`/cost-config/severity-matrix/${encodeURIComponent(setting.mrAccId)}`, matrix); onSaved(response.data.schedule); toast.success("Severity Matrix saved; schedule recalculated."); onClose(); }
    catch (error) { toast.error(error.response?.data?.message || "Could not save matrix."); }
    finally { setBusy(false); }
  };
  return <MaintenancePlanningModal title="Severity Matrix" onClose={onClose} footer={<><button className={buttonClass} onClick={onClose}>Cancel</button><button className={`${buttonClass} bg-indigo-600 text-white`} disabled={!matrix || busy || errors.length > 0} onClick={save}>{busy ? "Saving…" : "Save"}</button></>}>
    <div className="mb-5 flex flex-wrap gap-6 rounded bg-slate-100 p-4 text-sm dark:bg-slate-800">{[["MR Acc ID", setting.mrAccId], ["Sch. Mx. Event", setting.schMxEvent], ["ACFT Regn", setting.acftRegn], ["SN", setting.sn]].map(([label, value]) => <div key={label}><div className="text-slate-500">{label}</div><strong>{value || "—"}</strong></div>)}</div>
    {matrix ? <><div className="mb-4 flex gap-3"><button className={buttonClass} onClick={() => setMatrix({ ...matrix, columns: [...matrix.columns, { ...CTD_DEFAULTS }], rows: matrix.rows.map(row => ({ ...row, rates: [...row.rates, 0] })) })}>Add column</button><button className={buttonClass} onClick={() => setMatrix({ ...matrix, rows: [...matrix.rows, { hc: "", rates: matrix.columns.map(() => 0) }] })}>Add H:C row</button></div>
      <div className="overflow-auto"><table className="border-collapse text-sm"><thead>{["condition", "thrust", "derate"].map(metric => <tr key={metric}><th className="border p-3 text-left capitalize dark:border-slate-700">{metric}</th>{matrix.columns.map((item, index) => <th key={index} className="min-w-[160px] border p-2 dark:border-slate-700"><div className="flex items-center gap-1"><input aria-label={`Column ${index + 1} ${metric}`} className={inputClass} type={metric === "condition" ? "text" : "number"} value={item[metric]} onChange={event => column(index, metric, event.target.value)} />{metric === "derate" && "%"}{metric === "condition" && <button aria-label={`Remove column ${index + 1}`} className={buttonClass} disabled={matrix.columns.length === 1} onClick={() => setMatrix({ ...matrix, columns: matrix.columns.filter((_, i) => i !== index), rows: matrix.rows.map(row => ({ ...row, rates: row.rates.filter((_, i) => i !== index) })) })}>×</button>}</div></th>)}</tr>)}<tr><th className="border p-3 dark:border-slate-700">H:C</th>{matrix.columns.map((_, index) => <th className="border p-3 dark:border-slate-700" key={index}>Rate</th>)}</tr></thead>
        <tbody>{matrix.rows.map((row, index) => <tr key={index}><td className="min-w-[180px] border p-2 dark:border-slate-700"><div className="flex gap-2"><input aria-label={`H:C row ${index + 1}`} className={inputClass} type="number" min="0.01" step="0.01" value={row.hc} onBlur={() => { if (row.hc !== "" && Number.isFinite(Number(row.hc))) cell(index, "hc", Number(row.hc).toFixed(2)); }} onChange={event => cell(index, "hc", event.target.value)} /><button aria-label={`Remove H:C row ${index + 1}`} className={buttonClass} disabled={matrix.rows.length <= 2} onClick={() => setMatrix({ ...matrix, rows: matrix.rows.filter((_, i) => i !== index) })}>×</button></div></td>{row.rates.map((rate, col) => <td className="border p-2 dark:border-slate-700" key={col}><input aria-label={`Rate row ${index + 1} column ${col + 1}`} className={inputClass} type="number" min="0" step="0.01" value={rate} onBlur={() => { if (rate !== "" && Number.isFinite(Number(rate))) cell(index, "rates", Number(rate).toFixed(2), col); }} onChange={event => cell(index, "rates", event.target.value, col)} /></td>)}</tr>)}</tbody></table></div>
      {errors.length > 0 && <ul role="alert" className="mt-4 list-inside list-disc text-sm text-rose-600">{[...new Set(errors)].map(error => <li key={error}>{error}</li>)}</ul>}
    </> : <p>Loading matrix…</p>}
  </MaintenancePlanningModal>;
}
SeverityMatrixModal.propTypes = { setting: PropTypes.shape({ mrAccId: PropTypes.string.isRequired, schMxEvent: PropTypes.string, acftRegn: PropTypes.string, sn: PropTypes.string }).isRequired,
  onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired, beforeSave: PropTypes.func };
