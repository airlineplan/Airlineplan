export const PAGE_ACCESS_LEVELS = ["none", "read", "edit"];

export const PAGE_ACCESS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "read", label: "Read" },
  { value: "edit", label: "Edit" },
];

export const ASSIGNABLE_PAGE_FEATURES = [
  { id: "network", label: "Network" },
  { id: "sectors", label: "Sectors" },
  { id: "stations", label: "Stations" },
  { id: "rotations", label: "Rotations" },
  { id: "flgts", label: "FLGTs" },
  { id: "view", label: "View" },
  { id: "dashboard", label: "Dashboard" },
  { id: "list", label: "List" },
  { id: "connections", label: "Connections" },
  { id: "assignment", label: "Assignment" },
  { id: "fleet", label: "Fleet" },
  { id: "maintenance", label: "Maintenance" },
  { id: "poo", label: "POO" },
  { id: "revenue", label: "Revenue" },
  { id: "cost", label: "Cost" },
  { id: "crew", label: "Crew" },
  { id: "routeEconomics", label: "Route Economics" },
];

const ACCESS_RANK = {
  none: 0,
  read: 1,
  edit: 2,
};

export const createPageAccess = (level = "edit", features = ASSIGNABLE_PAGE_FEATURES) => (
  Object.fromEntries(features.map((feature) => [feature.id, level]))
);

export const normalizePageAccess = (pageAccess = {}, features = ASSIGNABLE_PAGE_FEATURES) => {
  const normalized = createPageAccess("edit", features);
  features.forEach((feature) => {
    if (PAGE_ACCESS_LEVELS.includes(pageAccess?.[feature.id])) {
      normalized[feature.id] = pageAccess[feature.id];
    }
  });
  return normalized;
};

export const hasPageAccess = (pageAccess, featureId, requiredLevel = "read") => {
  const level = pageAccess?.[featureId] || "edit";
  return ACCESS_RANK[level] >= ACCESS_RANK[requiredLevel];
};
