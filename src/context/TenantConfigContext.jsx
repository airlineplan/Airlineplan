import { createContext, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { API_BASE_URL } from "../apiConfig";

const TenantConfigContext = createContext(null);

const DEFAULT_CONFIG = {
  tenant: "",
  slug: "",
  companyName: "Airlineplan",
  domain: "",
  appVersion: "development",
  features: {},
  branding: {
    companyName: "Airlineplan",
    logoUrl: "",
    primaryColor: "#0B3B75",
  },
};

export const TenantConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/api/public-config`)
      .then((response) => {
        if (!response.ok) throw new Error("Tenant config is unavailable");
        return response.json();
      })
      .then((data) => {
        if (active) setConfig({ ...DEFAULT_CONFIG, ...data });
      })
      .catch(() => {
        // The control-plane admin route intentionally has no tenant config.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--tenant-primary",
      config.branding?.primaryColor || "#0B3B75"
    );
  }, [config.branding?.primaryColor]);

  const value = useMemo(
    () => ({
      config,
      loading,
      isFeatureEnabled(featureId) {
        const canonicalId =
          featureId === "view" || featureId === "list" ? "network" : featureId;
        return config.features?.[canonicalId] !== false;
      },
    }),
    [config, loading]
  );

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
};

TenantConfigProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTenantConfig = () => {
  const context = useContext(TenantConfigContext);
  if (!context) {
    throw new Error("useTenantConfig must be used inside TenantConfigProvider");
  }
  return context;
};
