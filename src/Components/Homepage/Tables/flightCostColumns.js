const components = [
  ["otherMaintenance1", "Other maintenance 1"], ["otherMaintenance2", "Other maintenance 2"], ["otherMaintenance3", "Other maintenance 3"],
  ["navEnr", "Nav ENR"], ["navTrml", "Nav Trml"], ["aptLandingCost", "APT-Landing cost"], ["aptHandlingCost", "APT-Handling cost"],
  ["aptOtherCost", "APT-Other cost"], ["otherDoc1", "Other DOC 1"], ["otherDoc2", "Other DOC 2"], ["otherDoc3", "Other DOC 3"],
  ["otherMxExpenses1", "Other Mx expenses 1"], ["otherMxExpenses2", "Other Mx expenses 2"], ["otherMxExpenses3", "Other Mx expenses 3"],
];
export const FLIGHT_COST_COLUMNS = components.flatMap(([field, label]) => ["", "CCY", "RCCY"].map(suffix => ({ id: field + suffix, key: field + suffix, label: `${label}${suffix ? ` ${suffix}` : ""}`, minWidth: "165px", masterOnly: true, isFloat: suffix !== "CCY", filterable: false })));
