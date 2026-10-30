import { useEffect } from "react";
import { X } from "lucide-react";
import PropTypes from "prop-types";
import { buttonClass } from "./maintenanceFormStyles";
export default function MaintenancePlanningModal({ title, children, onClose, footer }) {
  useEffect(() => {
    const listener = event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[10050] flex flex-col bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
    <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700"><h2 className="text-xl font-semibold">{title}</h2><button aria-label="Close" onClick={onClose} className={buttonClass}><X size={20} /></button></header>
    <main className="flex min-h-0 flex-1 flex-col overflow-auto p-5">{children}</main>
    {footer && <footer className="flex items-center justify-end gap-3 border-t border-slate-200 p-4 dark:border-slate-700">{footer}</footer>}
  </div>;
}
MaintenancePlanningModal.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, onClose: PropTypes.func.isRequired, footer: PropTypes.node };
