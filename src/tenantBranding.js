export const DEFAULT_BRAND_NAME = "Airlineplan";

const normalizeHostname = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

export const isRootWebsiteHost = (
  hostname,
  rootDomain = "airlineplan.com"
) => {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedRootDomain = normalizeHostname(rootDomain).replace(
    /^www\./,
    ""
  );

  return (
    normalizedHostname === normalizedRootDomain ||
    normalizedHostname === `www.${normalizedRootDomain}`
  );
};

export const getPublicBrandName = ({
  hostname,
  rootDomain = "airlineplan.com",
  tenantCompanyName,
} = {}) => {
  if (isRootWebsiteHost(hostname, rootDomain)) {
    return DEFAULT_BRAND_NAME;
  }

  return String(tenantCompanyName || "").trim() || DEFAULT_BRAND_NAME;
};
