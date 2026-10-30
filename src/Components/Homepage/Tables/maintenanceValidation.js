export const CTD_DEFAULTS = Object.freeze({ condition: "Normal", thrust: 0, derate: 0 });
export function ctdError(metric, value) {
  if (metric === "condition") return typeof value === "string" && /^[a-z0-9 %.-]{1,40}$/i.test(value.trim()) && value.trim() ? "" : "Enter a Condition (up to 40 characters).";
  const number = Number(value);
  if (value === "" || value == null || !Number.isFinite(number)) return "A value is required.";
  if (metric === "thrust") return Number.isInteger(number) && number >= 0 && number <= 500 ? "" : "Thrust must be an integer from 0 to 500.";
  return number >= 0 && number <= 100 ? "" : "Derate must be from 0 to 100%.";
}
export function ctdChanges(points, pending, esn, metric) {
  const changes = new Map(points.filter(point => point.metric === metric).map(point => [point.effectiveDate.slice(0, 10), point.value]));
  pending.filter(point => point.esn === esn && point.metric === metric).forEach(point => {
    for (const day of changes.keys()) if (day >= point.date) changes.delete(day);
    changes.set(point.date, point.value);
  });
  return changes;
}
export function ctdOnDate(points, pending, esn, metric, date) {
  const changes = ctdChanges(points, pending, esn, metric);
  return [...changes.entries()].filter(([day]) => day <= date).sort(([a], [b]) => a.localeCompare(b)).at(-1)?.[1] ?? CTD_DEFAULTS[metric];
}
export function matrixErrors(matrix) {
  const errors = [], identities = new Set(), hcs = new Set();
  if (matrix.columns.length < 1 || matrix.rows.length < 2) errors.push("Keep at least one column and two rows.");
  matrix.columns.forEach((column, index) => {
    Object.keys(CTD_DEFAULTS).forEach(metric => { const error = ctdError(metric, column[metric]); if (error) errors.push(`Column ${index + 1}: ${error}`); });
    const identity = `${column.condition.trim().toUpperCase()}|${Number(column.thrust)}|${Number(column.derate)}`;
    if (identities.has(identity)) errors.push("Duplicate CTD columns."); identities.add(identity);
  });
  const valid = value => value !== "" && value != null && Number.isFinite(Number(value)) && Number(value) >= 0 && Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 1e-7;
  matrix.rows.forEach((row, index) => {
    if (!valid(row.hc) || Number(row.hc) <= 0 || hcs.has(Number(row.hc))) errors.push(`Row ${index + 1}: H:C must be positive, unique and have at most two decimals.`);
    hcs.add(Number(row.hc));
    if (row.rates.length !== matrix.columns.length || row.rates.some(rate => !valid(rate))) errors.push(`Row ${index + 1}: enter every rate with at most two decimals.`);
  });
  return errors;
}
