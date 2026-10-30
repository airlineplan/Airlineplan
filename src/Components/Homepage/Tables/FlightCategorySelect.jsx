import PropTypes from "prop-types";
export default function FlightCategorySelect({ value = "Planned", onChange }) {
  return <label className="flex items-center gap-2 text-sm font-medium">Category<select aria-label="Category" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={value} onChange={event => onChange(event.target.value)}>{["Planned", "Actual", "Invoiced"].map(category => <option key={category} value={category}>{category}</option>)}</select></label>;
}
FlightCategorySelect.propTypes = { value: PropTypes.string, onChange: PropTypes.func.isRequired };
