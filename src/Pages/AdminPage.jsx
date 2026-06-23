import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  Globe2,
  Loader2,
  LogOut,
  PlayCircle,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../apiConfig";
import {
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "../auth/adminSession";

const STATUS_STYLES = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  PROVISIONING: "bg-blue-50 text-blue-700 border-blue-200",
  MIGRATING_DB: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SEEDING_ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
  HEALTH_CHECKING: "bg-amber-50 text-amber-800 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  ROLLING_BACK: "bg-orange-50 text-orange-700 border-orange-200",
  SUSPENDED: "bg-zinc-100 text-zinc-700 border-zinc-200",
  DELETING: "bg-red-50 text-red-800 border-red-200",
  DELETED: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

const RUNNING_STATUSES = new Set([
  "PROVISIONING",
  "MIGRATING_DB",
  "SEEDING_ADMIN",
  "HEALTH_CHECKING",
  "ROLLING_BACK",
  "DELETING",
]);

const isRootAdminHost = () => {
  if (typeof window === "undefined") return true;
  const hostname = window.location.hostname.toLowerCase();
  const rootDomain = (
    import.meta.env.VITE_ROOT_DOMAIN || "airlineplan.com"
  ).toLowerCase();
  return ["localhost", "127.0.0.1"].includes(hostname) || hostname === rootDomain;
};

const apiRequest = async (path, { method = "GET", body, token } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
      STATUS_STYLES[status] || STATUS_STYLES.PENDING
    }`}
  >
    {RUNNING_STATUSES.has(status) ? (
      <Loader2 size={14} className="animate-spin" />
    ) : status === "ACTIVE" ? (
      <CheckCircle2 size={14} />
    ) : status === "FAILED" ? (
      <XCircle size={14} />
    ) : (
      <PlayCircle size={14} />
    )}
    {String(status || "PENDING").replaceAll("_", " ")}
  </span>
);

StatusBadge.propTypes = {
  status: PropTypes.string,
};

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest("/admin/login", {
        method: "POST",
        body: { email, password },
      });
      setAdminToken(data.token);
      onLogin(data.token);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500 text-slate-950">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Airlineplan Admin</h1>
            <p className="text-sm text-slate-400">Isolated tenant control plane</p>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl"
        >
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
            placeholder="admin@airlineplan.com"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
            placeholder="Admin password"
          />
          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
};

AdminLogin.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

const FeatureGrid = ({ catalog, features, onChange, disabled = false }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {catalog.map((feature) => (
      <label
        key={feature.id}
        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
      >
        <input
          type="checkbox"
          checked={features[feature.id] !== false}
          disabled={disabled}
          onChange={(event) => onChange(feature.id, event.target.checked)}
        />
        {feature.label}
      </label>
    ))}
  </div>
);

FeatureGrid.propTypes = {
  catalog: PropTypes.arrayOf(PropTypes.object).isRequired,
  features: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const CreateTenantForm = ({
  token,
  catalog,
  defaultAppVersion,
  onCreated,
}) => {
  const createInitialForm = () => ({
    companyName: "",
    slug: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
    plan: "enterprise-dedicated",
    appVersion: defaultAppVersion,
    imageTag: `airlineplan-tenant:${defaultAppVersion}`,
    branding: {
      companyName: "",
      logoUrl: "",
      primaryColor: "#0B3B75",
    },
    features: Object.fromEntries(catalog.map((feature) => [feature.id, true])),
  });

  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      appVersion: current.appVersion || defaultAppVersion,
      imageTag:
        current.imageTag || `airlineplan-tenant:${defaultAppVersion}`,
      features: {
        ...Object.fromEntries(catalog.map((feature) => [feature.id, true])),
        ...current.features,
      },
    }));
  }, [catalog, defaultAppVersion]);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]:
        key === "slug"
          ? value.toLowerCase().replace(/[^a-z0-9-]/g, "")
          : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        branding: {
          ...form.branding,
          companyName: form.branding.companyName || form.companyName,
        },
      };
      const data = await apiRequest("/admin/tenants", {
        method: "POST",
        token,
        body: payload,
      });
      toast.success(`${data.tenant.domain} provisioning started`);
      setForm(createInitialForm());
      onCreated(data.tenant);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Plus size={18} className="text-cyan-700" />
        <h2 className="font-bold">Create isolated tenant</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          required
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Company name"
          value={form.companyName}
          onChange={(event) => update("companyName", event.target.value)}
        />
        <div className="flex rounded-md border">
          <input
            required
            className="min-w-0 flex-1 px-3 py-2 text-sm"
            placeholder="demo"
            value={form.slug}
            onChange={(event) => update("slug", event.target.value)}
          />
          <span className="border-l bg-slate-50 px-2 py-2 text-xs text-slate-500">
            .airlineplan.com
          </span>
        </div>
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Admin first name"
          value={form.adminFirstName}
          onChange={(event) => update("adminFirstName", event.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Admin last name"
          value={form.adminLastName}
          onChange={(event) => update("adminLastName", event.target.value)}
        />
        <input
          required
          type="email"
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Admin email"
          value={form.adminEmail}
          onChange={(event) => update("adminEmail", event.target.value)}
        />
        <input
          required
          minLength={12}
          type="password"
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Temporary password (12+ characters)"
          value={form.adminPassword}
          onChange={(event) => update("adminPassword", event.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Plan"
          value={form.plan}
          onChange={(event) => update("plan", event.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="App version"
          value={form.appVersion}
          onChange={(event) => update("appVersion", event.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2 text-sm md:col-span-2"
          placeholder="Container image tag"
          value={form.imageTag}
          onChange={(event) => update("imageTag", event.target.value)}
        />
        <input
          type="url"
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Logo URL"
          value={form.branding.logoUrl}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              branding: { ...current.branding, logoUrl: event.target.value },
            }))
          }
        />
        <input
          type="color"
          className="h-10 w-full rounded-md border px-1"
          value={form.branding.primaryColor}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              branding: { ...current.branding, primaryColor: event.target.value },
            }))
          }
        />
      </div>
      <FeatureGrid
        catalog={catalog}
        features={form.features}
        onChange={(featureId, enabled) =>
          setForm((current) => ({
            ...current,
            features: { ...current.features, [featureId]: enabled },
          }))
        }
      />
      <button
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Cloud size={16} />}
        Provision tenant
      </button>
    </form>
  );
};

CreateTenantForm.propTypes = {
  token: PropTypes.string.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.object).isRequired,
  defaultAppVersion: PropTypes.string.isRequired,
  onCreated: PropTypes.func.isRequired,
};

const InfoTile = ({ icon: Icon, label, value, detail }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
      <Icon size={15} />
      {label}
    </div>
    <p className="break-all text-sm font-semibold">{value || "Pending"}</p>
    {detail && <p className="mt-1 break-all text-xs text-slate-500">{detail}</p>}
  </div>
);

InfoTile.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  detail: PropTypes.string,
};

const TenantDetail = ({ tenant, token, catalog, onChanged }) => {
  const [features, setFeatures] = useState({});
  const [branding, setBranding] = useState({});
  const [deployment, setDeployment] = useState({ appVersion: "", imageTag: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setFeatures(tenant?.features || {});
    setBranding(tenant?.branding || {});
    setDeployment({
      appVersion: tenant?.deployment?.desiredAppVersion || "",
      imageTag: tenant?.deployment?.desiredImageTag || "",
    });
  }, [tenant]);

  if (!tenant) {
    return (
      <section className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-slate-500">
        Select a tenant to inspect its isolated platform resources.
      </section>
    );
  }

  const request = async (name, path, options = {}) => {
    setBusy(name);
    try {
      const data = await apiRequest(path, { token, ...options });
      onChanged(data.tenant);
      toast.success(`${name} requested`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const destroy = async () => {
    const confirmSlug = window.prompt(
      `Type ${tenant.slug} to confirm infrastructure deletion`
    );
    if (confirmSlug !== tenant.slug) return;
    const retainBackups = window.confirm(
      "Keep tenant backups after infrastructure deletion?"
    );
    await request("Delete", `/admin/tenants/${tenant._id}`, {
      method: "DELETE",
      body: { confirmSlug, retainBackups },
    });
  };

  const resource = tenant.resources || {};
  const events = [...(tenant.auditEvents || [])].reverse();

  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-lg font-bold">{tenant.companyName}</h2>
            <a
              href={`https://${tenant.domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-cyan-700 hover:underline"
            >
              https://{tenant.domain}
            </a>
            <p className="mt-1 text-xs text-slate-500">
              {tenant.tenantId} · {tenant.currentStep}
            </p>
          </div>
          <StatusBadge status={tenant.status} />
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <InfoTile
            icon={Server}
            label="ECS"
            value={resource.ecsServiceName}
            detail={resource.taskDefinitionArn}
          />
          <InfoTile
            icon={Database}
            label="Atlas"
            value={resource.atlasClusterName}
            detail={resource.atlasProjectName}
          />
          <InfoTile
            icon={Globe2}
            label="Routing"
            value={resource.route53Record || tenant.domain}
            detail={resource.targetGroupArn}
          />
          <InfoTile
            icon={Database}
            label="Valkey"
            value={resource.redisReplicationGroupId}
            detail={resource.redisEndpoint}
          />
          <InfoTile
            icon={Shield}
            label="Secret"
            value={resource.secretArn}
          />
          <InfoTile
            icon={Cloud}
            label="Logs"
            value={resource.logGroupName}
            detail={resource.terraformStateKey}
          />
        </div>
        {tenant.failure?.message && (
          <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <strong>{tenant.failure.step || "Provisioning failed"}:</strong>{" "}
            {tenant.failure.message}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t p-4">
          {["retry", "rollback", "suspend", "resume", "restart", "export"].map(
            (action) => (
              <button
                key={action}
                disabled={
                  Boolean(busy) ||
                  (action === "retry" && tenant.status !== "FAILED") ||
                  (action === "resume" && tenant.status !== "SUSPENDED") ||
                  (action === "suspend" && tenant.status !== "ACTIVE")
                }
                onClick={() =>
                  request(
                    action,
                    `/admin/tenants/${tenant._id}/actions/${action}`,
                    { method: "POST" }
                  )
                }
                className="rounded-md border px-3 py-2 text-sm font-semibold capitalize disabled:opacity-40"
              >
                {busy === action ? "Working…" : action}
              </button>
            )
          )}
          <button
            disabled={Boolean(busy) || tenant.status === "DELETED"}
            onClick={destroy}
            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            request("Configuration update", `/admin/tenants/${tenant._id}/config`, {
              method: "PATCH",
              body: { features, branding },
            });
          }}
          className="space-y-3 rounded-lg border bg-white p-4"
        >
          <h3 className="font-bold">Features and branding</h3>
          <FeatureGrid
            catalog={catalog}
            features={features}
            onChange={(featureId, enabled) =>
              setFeatures((current) => ({ ...current, [featureId]: enabled }))
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-md border px-3 py-2 text-sm"
              value={branding.logoUrl || ""}
              placeholder="Logo URL"
              onChange={(event) =>
                setBranding((current) => ({
                  ...current,
                  logoUrl: event.target.value,
                }))
              }
            />
            <input
              type="color"
              className="h-10 w-full rounded-md border"
              value={branding.primaryColor || "#0B3B75"}
              onChange={(event) =>
                setBranding((current) => ({
                  ...current,
                  primaryColor: event.target.value,
                }))
              }
            />
          </div>
          <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
            Apply configuration
          </button>
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            request("Deployment", `/admin/tenants/${tenant._id}/deployments`, {
              method: "POST",
              body: deployment,
            });
          }}
          className="space-y-3 rounded-lg border bg-white p-4"
        >
          <h3 className="font-bold">Application deployment</h3>
          <input
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={deployment.appVersion}
            placeholder="App version"
            onChange={(event) =>
              setDeployment((current) => ({
                ...current,
                appVersion: event.target.value,
              }))
            }
          />
          <input
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={deployment.imageTag}
            placeholder="Image tag"
            onChange={(event) =>
              setDeployment((current) => ({
                ...current,
                imageTag: event.target.value,
              }))
            }
          />
          <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
            Deploy version
          </button>
          <p className="text-xs text-slate-500">
            Current: {tenant.deployment?.deployedImageTag || "Not deployed"}
          </p>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-bold">Audit and workflow events</h3>
        <div className="max-h-96 space-y-2 overflow-auto">
          {events.length === 0 && (
            <p className="text-sm text-slate-500">No events recorded.</p>
          )}
          {events.map((event) => (
            <div key={event._id || `${event.createdAt}-${event.type}`} className="rounded-md border bg-slate-50 p-3">
              <div className="flex justify-between gap-3 text-xs">
                <strong>{event.type}</strong>
                <span className="text-slate-500">
                  {event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}
                </span>
              </div>
              <p className="mt-1 text-sm">{event.message}</p>
              {event.actor && <p className="mt-1 text-xs text-slate-500">{event.actor}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

TenantDetail.propTypes = {
  tenant: PropTypes.object,
  token: PropTypes.string.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default function AdminPage() {
  const [token, setToken] = useState(getAdminToken());
  const [tenants, setTenants] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [defaultAppVersion, setDefaultAppVersion] = useState(
    "standard-2026.06.19"
  );
  const [loading, setLoading] = useState(false);
  const rootHost = isRootAdminHost();

  const loadData = useCallback(async () => {
    if (!token || !rootHost) return;
    setLoading(true);
    try {
      const [tenantData, featureData] = await Promise.all([
        apiRequest("/admin/tenants", { token }),
        apiRequest("/admin/features", { token }),
      ]);
      setTenants(tenantData.tenants || []);
      setCatalog(featureData.features || []);
      setDefaultAppVersion(
        featureData.defaultAppVersion || "standard-2026.06.19"
      );
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearAdminToken();
        setToken("");
      }
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [rootHost, token]);

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 15000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant._id === selectedId) || tenants[0],
    [selectedId, tenants]
  );

  const mergeTenant = (tenant) => {
    setTenants((current) => {
      const exists = current.some((item) => item._id === tenant._id);
      return exists
        ? current.map((item) => (item._id === tenant._id ? tenant : item))
        : [tenant, ...current];
    });
    setSelectedId(tenant._id);
  };

  if (!rootHost) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 text-cyan-300" />
          <h1 className="text-2xl font-bold">Not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            The control plane is available only on the Airlineplan root domain.
          </p>
        </div>
      </main>
    );
  }

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Isolated Tenant Platform</h1>
            <p className="text-sm text-slate-500">
              Fargate, Atlas, Valkey, Route 53, and workflow orchestration
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => {
                clearAdminToken();
                setToken("");
              }}
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-5 xl:grid-cols-[470px_1fr]">
        <div className="space-y-4">
          <CreateTenantForm
            token={token}
            catalog={catalog}
            defaultAppVersion={defaultAppVersion}
            onCreated={mergeTenant}
          />
          <section className="rounded-lg border bg-white shadow-sm">
            <h2 className="border-b p-4 font-bold">Tenants</h2>
            <div className="divide-y">
              {tenants.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No tenants yet.</p>
              )}
              {tenants.map((tenant) => (
                <button
                  key={tenant._id}
                  onClick={() => setSelectedId(tenant._id)}
                  className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                    selectedTenant?._id === tenant._id ? "bg-cyan-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{tenant.companyName}</p>
                      <p className="truncate text-xs text-slate-500">{tenant.domain}</p>
                    </div>
                    <StatusBadge status={tenant.status} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <TenantDetail
          tenant={selectedTenant}
          token={token}
          catalog={catalog}
          onChanged={mergeTenant}
        />
      </div>
    </main>
  );
}
