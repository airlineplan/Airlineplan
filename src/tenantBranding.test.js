import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BRAND_NAME,
  getPublicBrandName,
  isRootWebsiteHost,
} from "./tenantBranding.js";

test("uses Airlineplan branding on the main website", () => {
  assert.equal(
    getPublicBrandName({
      hostname: "airlineplan.com",
      tenantCompanyName: "Demo Airlines",
    }),
    DEFAULT_BRAND_NAME
  );
  assert.equal(
    getPublicBrandName({
      hostname: "www.airlineplan.com",
      tenantCompanyName: "Demo Airlines",
    }),
    DEFAULT_BRAND_NAME
  );
});

test("preserves tenant branding on tenant subdomains", () => {
  assert.equal(
    getPublicBrandName({
      hostname: "demo.airlineplan.com",
      tenantCompanyName: "Demo Airlines",
    }),
    "Demo Airlines"
  );
});

test("supports a configured root domain and a safe fallback", () => {
  assert.equal(isRootWebsiteHost("www.example.com", "example.com"), true);
  assert.equal(
    getPublicBrandName({
      hostname: "tenant.example.com",
      rootDomain: "example.com",
      tenantCompanyName: "   ",
    }),
    DEFAULT_BRAND_NAME
  );
});
