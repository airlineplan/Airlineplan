export const TIMEZONES = [
  'UTC-12:00', 'UTC-11:45', 'UTC-11:30', 'UTC-11:15', 'UTC-11:00', 'UTC-10:45', 'UTC-10:30', 'UTC-10:15', 'UTC-10:00', 'UTC-9:45', 'UTC-9:30', 'UTC-9:15', 'UTC-9:00', 'UTC-8:45', 'UTC-8:30', 'UTC-8:15', 'UTC-8:00', 'UTC-7:45', 'UTC-7:30', 'UTC-7:15', 'UTC-7:00', 'UTC-6:45', 'UTC-6:30', 'UTC-6:15', 'UTC-6:00', 'UTC-5:45', 'UTC-5:30', 'UTC-5:15', 'UTC-5:00', 'UTC-4:45', 'UTC-4:30', 'UTC-4:15', 'UTC-4:00', 'UTC-3:45', 'UTC-3:30', 'UTC-3:15', 'UTC-3:00', 'UTC-2:45', 'UTC-2:30', 'UTC-2:15', 'UTC-2:00', 'UTC-1:45', 'UTC-1:30', 'UTC-1:15', 'UTC-1:00', 'UTC-0:45', 'UTC-0:30', 'UTC-0:15', 'UTC+0:00', 'UTC+0:15', 'UTC+0:30', 'UTC+0:45', 'UTC+1:00', 'UTC+1:15', 'UTC+1:30', 'UTC+1:45', 'UTC+2:00', 'UTC+2:15', 'UTC+2:30', 'UTC+2:45', 'UTC+3:00', 'UTC+3:15', 'UTC+3:30', 'UTC+3:45', 'UTC+4:00', 'UTC+4:15', 'UTC+4:30', 'UTC+4:45', 'UTC+5:00', 'UTC+5:15', 'UTC+5:30', 'UTC+5:45', 'UTC+6:00', 'UTC+6:15', 'UTC+6:30', 'UTC+6:45', 'UTC+7:00', 'UTC+7:15', 'UTC+7:30', 'UTC+7:45', 'UTC+8:00', 'UTC+8:15', 'UTC+8:30', 'UTC+8:45', 'UTC+9:00', 'UTC+9:15', 'UTC+9:30', 'UTC+9:45', 'UTC+10:00', 'UTC+10:15', 'UTC+10:30', 'UTC+10:45', 'UTC+11:00', 'UTC+11:15', 'UTC+11:30', 'UTC+11:45', 'UTC+12:00'
];

export function normalizeTimezoneKey(tz) {
  if (!tz) return "";
  return String(tz).trim().replace(/^UTC([+-])0(\d:\d\d)$/i, "UTC$1$2").toUpperCase();
}

export function resolveHomeTimezone(rawHomeTz, supported = TIMEZONES, fallback = "UTC+5:30") {
  const normalizedRaw = normalizeTimezoneKey(rawHomeTz);
  if (!normalizedRaw) return fallback;

  const match = supported.find((tz) => normalizeTimezoneKey(tz) === normalizedRaw);
  return match || (supported.includes(fallback) ? fallback : supported[0]);
}
