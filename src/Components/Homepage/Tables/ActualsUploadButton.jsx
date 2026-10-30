import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import api from "../../../apiConfig";
import { invalidateFleetMetricsCache } from "./fleetMetricsCache";
const HEADERS = ["Date", "Flight #.", "Dep Stn", "ATD(LT).", "BT", "FT", "ATA(LT)", "Arr Stn.", "ACFT", "Dom / INTL", "Rotation #", "Seats.", "Cargo Cap", "Pax", "Cargo T"];
function download(rows, name) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Flights");
  XLSX.writeFile(workbook, name);
}
ActualsUploadButton.propTypes = { onComplete: PropTypes.func };
export default function ActualsUploadButton({ onComplete }) {
  const picker = useRef(null), controller = useRef(null);
  const [busy, setBusy] = useState(false), [summary, setSummary] = useState(null);
  useEffect(() => () => controller.current?.abort(), []);
  const upload = async file => {
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name) || file.size > 10 * 1024 * 1024) return toast.error("Choose an XLSX or XLS workbook of at most 10 MB.");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setBusy(true); setSummary(null);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await api.post("/flights/upload-actuals", form, { signal });
      let result = response.data;
      if (response.status === 202) {
        for (;;) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (signal.aborted) return;
          const job = (await api.get(`/flights/actuals-imports/${result.jobId}`, { signal })).data;
          if (job.status === "failed") throw new Error(job.error || "Actuals import failed.");
          if (job.status === "completed") { result = job.result; break; }
        }
      }
      setSummary(result);
      invalidateFleetMetricsCache(); window.dispatchEvent(new Event("assignments:updated")); onComplete?.(result);
      const message = `${result.inserted} Actual/Invoiced rows created; ${result.rejected?.length || 0} rows rejected.`;
      if (result.rejected?.length) toast.warning(message); else toast.success(message);
    } catch (error) { if (!signal.aborted) toast.error(error.response?.data?.message || error.message || "Actuals import failed."); }
    finally { if (!signal.aborted) setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-3 text-sm"><input ref={picker} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => { upload(event.target.files[0]); event.target.value = ""; }} /><button disabled={busy} onClick={() => picker.current?.click()} className="rounded-lg border border-emerald-600 px-4 py-2 font-medium text-emerald-700 disabled:opacity-50 dark:text-emerald-300">{busy ? "Importing actuals…" : "Upload Actuals"}</button><button className="text-sm text-indigo-600 underline dark:text-indigo-300" onClick={() => download([HEADERS, ["16-Apr-26", "A103", "CCU", "07:30", "02:50", "02:35", "10:20", "BOM", "VT-ABC", "Dom", 122, 180, 1.6, 171, 0.64]], "Actuals_template.xlsx")}>Download template</button>{summary && <span role="status">{summary.inserted} created · {summary.rejected?.length || 0} rejected {summary.rejected?.length > 0 && <button className="text-indigo-600 underline" onClick={() => download([["Row", "Reasons"], ...summary.rejected.map(row => [row.rowNumber, row.reasons.join("; ")])], "Actuals_rejected.xlsx")}>Download rejected list</button>}</span>}</div>;
}
