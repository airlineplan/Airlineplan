const parseUtcOffset = (tzString) => {
  if (!tzString || !tzString.startsWith("UTC")) return null;
  if (tzString === "UTC") return 0;

  const sign = tzString.includes("-") ? -1 : 1;
  const timePart = tzString.replace(/UTC[+-]/, "");
  if (!timePart) return 0;

  const [hours, minutes] = timePart.split(":").map(Number);
  if (Number.isNaN(hours)) return null;

  return sign * ((hours * 60) + (minutes || 0));
};

const findStationConfig = (stationsData, stationName) => (
  stationsData.find((station) =>
    station.stationName?.trim().toUpperCase() === stationName?.trim().toUpperCase()
  )
);

export const calculateAutoSta = ({ std, bt, depStn, arrStn, stationsData = [], effFromDt }) => {
  if (!std || !bt) return "";

  const [stdH, stdM] = std.split(":").map(Number);
  const [btH, btM] = bt.split(":").map(Number);

  if (Number.isNaN(stdH) || Number.isNaN(btH)) return "";

  let depTzMins = 0;
  let arrTzMins = 0;

  if (depStn && arrStn && stationsData.length > 0) {
    const depConfig = findStationConfig(stationsData, depStn);
    const arrConfig = findStationConfig(stationsData, arrStn);

    const resolveTzMinutes = (config, flightDateStr) => {
      if (!config) return 0;

      let tz = config.stdtz;

      if (flightDateStr && config.nextDSTStart && config.nextDSTEnd) {
        const flightDate = new Date(flightDateStr);
        const dstStart = new Date(config.nextDSTStart);
        const dstEnd = new Date(config.nextDSTEnd);

        if (!Number.isNaN(flightDate.getTime()) && !Number.isNaN(dstStart.getTime()) && !Number.isNaN(dstEnd.getTime())) {
          if (flightDate >= dstStart && flightDate <= dstEnd) {
            tz = config.dsttz || config.stdtz;
          }
        }
      }

      const tzMins = parseUtcOffset(tz);
      return tzMins ?? 0;
    };

    depTzMins = resolveTzMinutes(depConfig, effFromDt);
    arrTzMins = resolveTzMinutes(arrConfig, effFromDt);
  }

  let totalMins = (stdH * 60 + (stdM || 0)) + (btH * 60 + (btM || 0)) + (arrTzMins - depTzMins);
  totalMins = ((totalMins % 1440) + 1440) % 1440;

  const staH = Math.floor(totalMins / 60);
  const staM = totalMins % 60;
  return `${String(staH).padStart(2, "0")}:${String(staM).padStart(2, "0")}`;
};
