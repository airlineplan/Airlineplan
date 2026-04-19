import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Plus, Edit2, Check, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import api from "../../../apiConfig";
import { toast } from "react-toastify";

// --- Helper Components ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Input({ value, onChange, placeholder, type = "text", className }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500",
        "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200",
        className
      )}
    />
  );
}

// A simple editable table component
function EditableTable({ title, columns, data, setData }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editRow, setEditRow] = useState({});

  const handleEdit = (index, row) => {
    setEditingIndex(index);
    setEditRow({ ...row });
  };

  const handleSave = (index) => {
    const newData = [...data];
    newData[index] = editRow;
    setData(newData);
    setEditingIndex(null);
  };

  const handleAdd = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {});
    setData([...data, newRow]);
    setEditingIndex(data.length);
    setEditRow(newRow);
  };

  const handleDelete = (index) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-xs font-medium text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-slate-400 text-xs italic">
                  No data. Click "Add Row" to start.
                </td>
              </tr>
            )}
            {data.map((row, index) => {
              const isEditing = editingIndex === index;
              return (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editRow[col.key]}
                          onChange={(e) => setEditRow({ ...editRow, [col.key]: e.target.value })}
                          type={col.type || "text"}
                        />
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">
                          {row[col.key] || <span className="text-slate-400">-</span>}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <button onClick={() => handleSave(index)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Check size={16} />
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(index, row)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(index)} className="p-1 text-rose-500 hover:bg-rose-50 rounded dark:hover:bg-rose-900/30">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Main Modal Component ---

export default function CostInputModal({ isOpen, onClose }) {
  // === FUEL STATE ===
  const [fuelConsum, setFuelConsum] = useState([]);
  const [apuUsage, setApuUsage] = useState([]);
  const [plfEffect, setPlfEffect] = useState([]);
  const [ccyFuel, setCcyFuel] = useState([]);

  // === MAINTENANCE STATE ===
  const [leasedReserve, setLeasedReserve] = useState([]);
  const [schMxEvents, setSchMxEvents] = useState([]);
  const [transitMx, setTransitMx] = useState([]);
  const [otherMx, setOtherMx] = useState([]);
  const [rotableChanges, setRotableChanges] = useState([]);

  // === NAVIGATION & AIRPORT STATE ===
  const [navEnr, setNavEnr] = useState([]);
  const [navTerm, setNavTerm] = useState([]);
  const [airportLanding, setAirportLanding] = useState([]);
  const [airportDom, setAirportDom] = useState([]);
  const [airportIntl, setAirportIntl] = useState([]);
  const [airportAvsec, setAirportAvsec] = useState([]);

  // === OTHER DOC STATE ===
  const [otherDoc, setOtherDoc] = useState([]);

  useEffect(() => {
    if (isOpen) {
      api.get("/cost-config")
        .then(response => {
           if (response.data && response.data.data) {
             const d = response.data.data;
             setFuelConsum(d.fuelConsum || []);
             setApuUsage(d.apuUsage || []);
             setPlfEffect(d.plfEffect || []);
             setCcyFuel(d.ccyFuel || []);

             setLeasedReserve(d.leasedReserve || []);
             setSchMxEvents(d.schMxEvents || []);
             setTransitMx(d.transitMx || []);
             setOtherMx(d.otherMx || []);
             setRotableChanges(d.rotableChanges || []);

             setNavEnr(d.navEnr || []);
             setNavTerm(d.navTerm || []);
             setAirportLanding(d.airportLanding || []);
             setAirportDom(d.airportDom || []);
             setAirportIntl(d.airportIntl || []);
             setAirportAvsec(d.airportAvsec || []);

             setOtherDoc(d.otherDoc || []);
           }
        })
        .catch(err => console.error("Error fetching cost config", err));
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      const payload = {
        fuelConsum, apuUsage, plfEffect, ccyFuel,
        leasedReserve, schMxEvents, transitMx, otherMx, rotableChanges,
        navEnr, navTerm, airportLanding, airportDom, airportIntl, airportAvsec,
        otherDoc
      };

      await api.post("/cost-config", payload);
      toast.success("Cost logic configurations saved successfully!");
      onClose();
    } catch (err) {
      console.error("Error saving cost config", err);
      toast.error("Failed to save cost configurations");
    }
  };

  // Default basis of allocation (read-only presentation)
  const basisOfAllocation = [
    { cost: "APU fuel cost", basis: "The month, each month" },
    { cost: "Maintenance reserve cont", basis: "The specific SN in the month, each month" },
    { cost: "Remaining in Schedule Mx", basis: "The specific SN in the period of time from start date of Master table..." },
    { cost: "Other maintenance expen", basis: "The specific SN in the month, each month" },
    { cost: "Cost of rotables changes", basis: "The specific ACFT Regn in the month, each month" },
  ];

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-7xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cost Inputs</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure and manage cost allocation tables.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 font-medium"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-12">

              {/* === SECTION: FUEL === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Fuel</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Fuel Consumption"
                    data={fuelConsum}
                    setData={setFuelConsum}
                    columns={[
                      { label: "Sector / GCD", key: "sectorOrGcd" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "Month", key: "month" },
                      { label: "Fuel Cons Kg", key: "fuelConsumptionKg", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="APU Usage"
                    data={apuUsage}
                    setData={setApuUsage}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "From date", key: "fromDate", type: "date" },
                      { label: "To date", key: "toDate", type: "date" },
                      { label: "Variant", key: "variant" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "APU Hr", key: "apuHours", type: "number" },
                      { label: "Cons / APU Hr", key: "consumptionPerApuHour", type: "number" },
                      { label: "Basis", key: "basis" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="PLF Effect"
                    data={plfEffect}
                    setData={setPlfEffect}
                    columns={[
                      { label: "Sector / GCD", key: "sectorOrGcd" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "80%", key: "p80", type: "number" },
                      { label: "90%", key: "p90", type: "number" },
                      { label: "95%", key: "p95", type: "number" },
                      { label: "98%", key: "p98", type: "number" },
                      { label: "100%", key: "p100", type: "number" },
                    ]}
                  />
                  <EditableTable
                    title="Fuel Price"
                    data={ccyFuel}
                    setData={setCcyFuel}
                    columns={[
                      { label: "Station", key: "station" },
                      { label: "Month", key: "month" },
                      { label: "CCY", key: "ccy" },
                      { label: "Kg/Ltr", key: "kgPerLtr", type: "number" },
                      { label: "Into plane rate", key: "intoPlaneRate", type: "number" },
                    ]}
                  />
                </div>
              </section>

              {/* === SECTION: MAINTENANCE === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Maintenance</h2>
                <EditableTable
                  title="Leased aircraft Maintenance reserve settings"
                  data={leasedReserve}
                  setData={setLeasedReserve}
                  columns={[
                    { label: "MR Acc ID", key: "mrAccId" },
                    { label: "ACFT Regn.", key: "acftRegn" },
                    { label: "PN", key: "pn" },
                    { label: "SN", key: "sn" },
                    { label: "Driver", key: "driver" },
                    { label: "Set balance", key: "setBalance", type: "number" },
                    { label: "Set rate", key: "setRate", type: "number" },
                    { label: "CCY", key: "ccy" },
                    { label: "End date", key: "endDate", type: "date" },
                  ]}
                />
                <EditableTable
                  title="Schedule Maintenance Events calendar table"
                  data={schMxEvents}
                  setData={setSchMxEvents}
                  columns={[
                    { label: "Date", key: "date", type: "date" },
                    { label: "MSN/ESN/APUN", key: "msnEsnApun" },
                    { label: "Sch.Mx.Event", key: "event" },
                    { label: "PN", key: "pn" },
                    { label: "SN/BN", key: "snBn" },
                    { label: "Event total cost", key: "cost", type: "number" },
                    { label: "Opening bal", key: "openingBal", type: "number" },
                    { label: "Capitalisation", key: "capitalisation" },
                    { label: "CCY", key: "ccy" },
                  ]}
                />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Transit maintenance"
                    data={transitMx}
                    setData={setTransitMx}
                    columns={[
                      { label: "Dep Stn", key: "depStn" },
                      { label: "Variant", key: "variant" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "PN", key: "pn" },
                      { label: "SN", key: "sn" },
                      { label: "From date", key: "fromDate", type: "date" },
                      { label: "To date", key: "toDate", type: "date" },
                      { label: "Cost / departure", key: "costPerDeparture", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Other maintenance expenses"
                    data={otherMx}
                    setData={setOtherMx}
                    columns={[
                      { label: "Dep Stn", key: "depStn" },
                      { label: "Variant", key: "variant" },
                      { label: "ACFT Regn", key: "acftRegn" },
                      { label: "PN", key: "pn" },
                      { label: "SN", key: "sn" },
                      { label: "From date", key: "fromDate", type: "date" },
                      { label: "To date", key: "toDate", type: "date" },
                      { label: "Cost / BH", key: "costPerBh", type: "number" },
                      { label: "Cost / departure", key: "costPerDeparture", type: "number" },
                      { label: "Cost / month", key: "costPerMonth", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                </div>
                <EditableTable
                  title="Cost of rotables changes"
                  data={rotableChanges}
                  setData={setRotableChanges}
                  columns={[
                    { label: "Label", key: "label" },
                    { label: "Date", key: "date", type: "date" },
                    { label: "PN", key: "pn" },
                    { label: "MSN", key: "msn" },
                    { label: "ACFT Regn", key: "acftRegn" },
                    { label: "Cost", key: "cost", type: "number" },
                    { label: "CCY", key: "ccy" },
                  ]}
                />
              </section>

              {/* === SECTION: NAVIGATION === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Navigation</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Enroute (ENR)"
                    data={navEnr}
                    setData={setNavEnr}
                    columns={[
                      { label: "Sector", key: "sector" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Terminal"
                    data={navTerm}
                    setData={setNavTerm}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                </div>
              </section>

              {/* === SECTION: AIRPORT === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Airport</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EditableTable
                    title="Landing"
                    data={airportLanding}
                    setData={setAirportLanding}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="AvSec"
                    data={airportAvsec}
                    setData={setAirportAvsec}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Dom flight handling"
                    data={airportDom}
                    setData={setAirportDom}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                  <EditableTable
                    title="Intl flight handling"
                    data={airportIntl}
                    setData={setAirportIntl}
                    columns={[
                      { label: "Arr Stn", key: "arrStn" },
                      { label: "Variant", key: "variant" },
                      { label: "Month", key: "month" },
                      { label: "Cost", key: "cost", type: "number" },
                      { label: "CCY", key: "ccy" },
                    ]}
                  />
                </div>
              </section>

              {/* === SECTION: OTHER DOC & BASIS OF ALLOCATION === */}
              <section>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Other DOC</h2>
                <EditableTable
                  title="Other DOC"
                  data={otherDoc}
                  setData={setOtherDoc}
                  columns={[
                    { label: "Label", key: "label" },
                    { label: "Sector", key: "sector" },
                    { label: "Dep Stn", key: "depStn" },
                    { label: "Arr Stn", key: "arrStn" },
                    { label: "Variant", key: "variant" },
                    { label: "ACFT Regn", key: "acftRegn" },
                    { label: "PN", key: "pn" },
                    { label: "SN", key: "sn" },
                    { label: "Per", key: "per" },
                    { label: "Cost", key: "cost", type: "number" },
                    { label: "CCY", key: "ccy" },
                    { label: "From date", key: "fromDate", type: "date" },
                    { label: "To date", key: "toDate", type: "date" },
                  ]}
                />

                {/* <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Basis of cost allocation</h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Cost</th>
                          <th className="px-4 py-2 font-semibold">Basis of allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-600 dark:text-slate-300">
                        {basisOfAllocation.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-2 font-medium">{item.cost}</td>
                            <td className="px-4 py-2">{item.basis}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div> */}
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
