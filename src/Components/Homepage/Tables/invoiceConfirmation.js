const norm = value => String(value || "").trim().toUpperCase();
export function invoiceLineFromCandidate(candidate, settings) {
  const matches = settings.filter(row => (candidate.mrAccId
    ? norm(row.mrAccId) === norm(candidate.mrAccId)
    : norm(row.schMxEvent) === norm(candidate.schMxEvent)) && (!candidate.sn || norm(row.sn) === norm(candidate.sn)));
  const match = matches.length === 1 ? matches[0] : null;
  return { mrAccId: match?.mrAccId || "", schMxEvent: match?.schMxEvent || candidate.schMxEvent || "", sn: candidate.sn || match?.sn || "",
    rate: candidate.rate ?? "", utilisation: candidate.utilisation ?? "", contribution: candidate.amount ?? "", extracted: candidate };
}
export function invoiceReviewTotal(lines) {
  return Math.round((lines.reduce((sum, row) => sum + Number(row.contribution || 0), 0) + Number.EPSILON) * 100) / 100;
}
