import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import moment from "moment";
import { toast } from "react-toastify";
import api from "../../../apiConfig";
import MaintenancePlanningModal from "./MaintenancePlanningModal";
import { inputClass, buttonClass } from "./maintenanceFormStyles";
import PropTypes from "prop-types";
import { ctdChanges, ctdError, ctdOnDate } from "./maintenanceValidation";
const LEFT = 590, WIDTH = 120, HEIGHT = 42;
const metrics = ["condition", "thrust", "derate"];
const leftStyle = { gridTemplateColumns: "120px 120px 110px 130px 110px", width: LEFT, minWidth: LEFT };
export default function EngineOperatingSettingModal({ onClose }) {
  const [data, setData] = useState({ rows: [], dateRange: {}, conditions: [] });
  const [filters, setFilters] = useState({ engineType: "", engineVariant: "", esn: "", titled: "" });
  const [page, setPage] = useState(1), [pending, setPending] = useState([]), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const viewport = useRef(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await api.get("/fleet/engine-operating-settings", { params: { ...filters, page, limit: 20 } }); setData(response.data); }
    catch (error) { toast.error(error.response?.data?.message || "Could not load engine operating settings."); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const dates = useMemo(() => {
    const result = [];
    if (data.dateRange.min && data.dateRange.max) for (let date = moment.utc(data.dateRange.min); date.isSameOrBefore(moment.utc(data.dateRange.max)); date.add(1, "day")) result.push(date.format("YYYY-MM-DD"));
    return result;
  }, [data.dateRange]);
  const virtualizer = useVirtualizer({ horizontal: true, count: dates.length, getScrollElement: () => viewport.current, estimateSize: () => WIDTH, overscan: 3 });
  const edit = (esn, metric, date, value) => setPending(current => [...current.filter(point => !(point.esn === esn && point.metric === metric && point.date >= date)), { esn, metric, date, value }]);
  const errors = pending.map(point => ctdError(point.metric, point.value)).filter(Boolean);
  const save = async () => {
    setBusy(true);
    try { await api.put("/fleet/engine-operating-settings", { changes: pending }); setPending([]); await load(); toast.success("Engine settings saved; MR schedule recalculated."); }
    catch (error) { toast.error(error.response?.data?.message || "Could not save settings."); }
    finally { setBusy(false); }
  };
  return <MaintenancePlanningModal title="Engine operating setting" onClose={onClose} footer={<><span className="mr-auto text-sm text-slate-500">{pending.length} changed entries</span><button className={buttonClass} onClick={onClose}>Close</button><button className={`${buttonClass} bg-emerald-600 text-white`} disabled={busy || !pending.length || errors.length > 0} onClick={save}>{busy ? "Saving…" : "Save"}</button></>}>
    <div className="mb-4 flex flex-wrap items-end gap-3">{[["engineType", "Engine Type"], ["engineVariant", "Engine Variant"], ["esn", "ESN"], ["titled", "Titled/Spare"]].map(([field, label]) => <label key={field} className="w-40 text-sm">{label}<input aria-label={`Filter ${label}`} className={inputClass} value={filters[field]} onChange={event => { setFilters({ ...filters, [field]: event.target.value }); setPage(1); }} /></label>)}
      <label className="text-sm">Goto date<input type="date" min={data.dateRange.min} max={data.dateRange.max} className={inputClass} onChange={event => { const index = dates.indexOf(event.target.value); if (index >= 0) virtualizer.scrollToOffset(index * WIDTH); }} /></label>
    </div>
    <p className="mb-3 text-sm text-slate-500">Each edit fills forward and overwrites later changes for that engine and metric, like FX rates. Bold cells mark changes. Grey cells are outside Fleet dates.</p>
    {errors.length > 0 && <p role="alert" className="mb-3 text-sm text-rose-600">{[...new Set(errors)].join(" ")}</p>}
    <datalist id="ctd-conditions">{data.conditions.map(condition => <option key={condition} value={condition} />)}</datalist>
    <div ref={viewport} className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 dark:border-slate-700" aria-busy={loading}>
      <div style={{ width: LEFT + virtualizer.getTotalSize(), minWidth: "100%" }}>
        <div className="sticky top-0 z-30 flex h-12 border-b border-slate-300 bg-slate-100 dark:bg-slate-800">
          <div className="sticky left-0 z-30 grid bg-slate-100 text-sm font-semibold dark:bg-slate-800" style={leftStyle}>{["Engine Type", "Engine Variant", "ESN", "Titled/Spare", "Metric"].map(label => <span className="p-2" key={label}>{label}</span>)}</div>
          {virtualizer.getVirtualItems().map(item => <div key={item.key} className="absolute flex h-full items-center justify-center border-l text-sm dark:border-slate-700" style={{ left: LEFT + item.start, width: WIDTH }}>{moment.utc(dates[item.index]).format("DD-MMM-YY")}</div>)}
        </div>
        {data.rows.map(engine => <div key={engine.esn} className="relative border-b border-slate-300 dark:border-slate-700" style={{ height: HEIGHT * 3 }}>
          <div className="sticky left-0 z-20 grid h-full bg-white text-sm dark:bg-slate-900" style={leftStyle}>{[engine.type, engine.variant, engine.esn, engine.titled].map((value, index) => <div key={index} className="flex items-center border-r px-2 dark:border-slate-700">{value || "—"}</div>)}<div>{metrics.map(metric => <div key={metric} className="border-b px-2 py-3 capitalize dark:border-slate-700" style={{ height: HEIGHT }}>{metric}</div>)}</div></div>
          {virtualizer.getVirtualItems().map(item => {
            const date = dates[item.index];
            const disabled = (engine.entry && date < engine.entry.slice(0, 10)) || (engine.exit && date > engine.exit.slice(0, 10));
            return <div key={item.key} className="absolute top-0" style={{ left: LEFT + item.start, width: WIDTH }}>{metrics.map(metric => {
              const value = ctdOnDate(engine.changePoints, pending, engine.esn, metric, date);
              const changed = ctdChanges(engine.changePoints, pending, engine.esn, metric).has(date);
              return <div key={metric} className={`flex items-center border-b border-l p-1 dark:border-slate-700 ${disabled ? "bg-slate-100 dark:bg-slate-800" : ""}`} style={{ height: HEIGHT }}><input aria-label={`${engine.esn} ${metric} ${date}`} list={metric === "condition" ? "ctd-conditions" : undefined} disabled={disabled} type={metric === "condition" ? "text" : "number"} step={metric === "thrust" ? 1 : "any"} className={`${inputClass} ${changed ? "font-bold" : ""} ${ctdError(metric, value) ? "border-rose-500" : ""}`} value={disabled ? "" : value} onChange={event => edit(engine.esn, metric, date, event.target.value)} />{metric === "derate" && !disabled && <span>%</span>}</div>;
            })}</div>;
          })}
        </div>)}
        {!data.rows.length && <p className="p-8 text-slate-500">{loading ? "Loading engines…" : "No engines match these filters."}</p>}
      </div>
    </div>
    <div className="mt-3 flex items-center justify-end gap-3 text-sm"><span>{data.total || 0} engines</span><button className={buttonClass} disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className={buttonClass} disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
  </MaintenancePlanningModal>;
}
EngineOperatingSettingModal.propTypes = { onClose: PropTypes.func.isRequired };
