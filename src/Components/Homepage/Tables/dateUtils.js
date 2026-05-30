export const DISPLAY_DATE_FORMAT = "dd-mmm-yy";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_INDEX = MONTHS.reduce((acc, month, index) => {
  acc[month.toLowerCase()] = index;
  return acc;
}, {});

const pad2 = (value) => String(value).padStart(2, "0");

export function toIsoDate(value) {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  const text = String(value).trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day)
    ) {
      return `${year}-${month}-${day}`;
    }
    return "";
  }

  const displayMatch = text.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{2}|\d{4})$/);
  if (!displayMatch) return "";

  const day = Number(displayMatch[1]);
  const month = MONTH_INDEX[displayMatch[2].toLowerCase()];
  const yearPart = displayMatch[3];
  const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);

  if (month === undefined) return "";

  const parsed = new Date(Date.UTC(year, month, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month ||
    parsed.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function formatDateForDisplay(value) {
  const isoDate = toIsoDate(value);
  if (!isoDate) return value || "";

  const [, month, day] = isoDate.split("-");
  return `${day}-${MONTHS[Number(month) - 1]}-${isoDate.slice(2, 4)}`;
}
