import React, { useEffect, useMemo, useState } from "react";
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
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../apiConfig";
import { clearAdminToken, getAdminToken, setAdminToken } from "../auth/adminSession";

const statusStyles = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  provisioning: "bg-blue-50 text-blue-700 border-blue-200",
  dns_pending: "bg-amber-50 text-amber-800 border-amber-200",
  ssl_pending: "bg-violet-50 text-violet-700 border-violet-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  deactivated: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const statusIcon = {
  pending: PlayCircle,
  provisioning: Loader2,
  dns_pending: Globe2,
  ssl_pending: Shield,
  active: CheckCircle2,
  failed: XCircle,
  deactivated: AlertTriangle,
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

const StatusBadge = ({ status }) => {
  const Icon = statusIcon[status] || AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.pending}`}>
      <Icon size={14} className={status === "provisioning" ? "animate-spin" : ""} />
      {String(status || "pending").replace("_", " ")}
    </span>
  );
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
      toast.success("Admin login successful");
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
            <p className="text-sm text-slate-400">Tenant provisioning control plane</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <label className="block text-sm font-medium text-slate-200">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              placeholder="admin@airlineplan.com"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              placeholder="Admin password"
            />
          </label>
          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
};

const TenantForm = ({ token, onCreated }) => {
  const [form, setForm] = useState({
    tenantName: "",
    subdomain: "",
    adminEmail: "",
    instanceType: "t3.small",
    region: "ap-south-1",
  });
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: key === "subdomain" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest("/admin/tenants", {
        method: "POST",
        token,
        body: form,
      });
      toast.success(`${data.tenant.fullDomain} provisioning started`);
      setForm({ tenantName: "", subdomain: "", adminEmail: "", instanceType: "t3.small", region: "ap-south-1" });
      onCreated(data.tenant);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Plus size={18} className="text-cyan-700" />
        <h2 className="text-base font-bold text-slate-950">Create tenant</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" required placeholder="Airline name" value={form.tenantName} onChange={(e) => update("tenantName", e.target.value)} />
        <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" required type="email" placeholder="Tenant admin email" value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} />
        <div className="flex rounded-md border border-slate-300 focus-within:border-cyan-500">
          <input className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none" required placeholder="star" value={form.subdomain} onChange={(e) => update("subdomain", e.target.value)} />
          <span className="flex items-center border-l border-slate-300 bg-slate-50 px-3 text-xs text-slate-500">.airlineplan.com</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.instanceType} onChange={(e) => update("instanceType", e.target.value)}>
            <option value="t3.small">t3.small</option>
            <option value="t3.medium">t3.medium</option>
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.region} onChange={(e) => update("region", e.target.value)} />
        </div>
      </div>
      <button disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Cloud size={16} />}
        Provision tenant
      </button>
    </form>
  );
};

const TenantDetail = ({ tenant, token, onChanged }) => {
  const logs = tenant?.logs || [];
  if (!tenant) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Select a tenant to inspect provisioning details.
      </section>
    );
  }

  const action = async (path, message) => {
    try {
      const data = await apiRequest(path, { method: "POST", token });
      toast.success(message);
      onChanged(data.tenant);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{tenant.tenantName}</h2>
            <a className="text-sm font-medium text-cyan-700 hover:underline" href={`https://${tenant.fullDomain}`} target="_blank" rel="noreferrer">
              https://{tenant.fullDomain}
            </a>
          </div>
          <StatusBadge status={tenant.status} />
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <InfoTile icon={Server} label="EC2" value={tenant.aws?.instanceId || "Not launched"} detail={tenant.aws?.publicIp || tenant.aws?.instanceType} />
        <InfoTile icon={Database} label="Atlas" value={tenant.atlas?.clusterName || "Not created"} detail={tenant.atlas?.databaseName} />
        <InfoTile icon={Globe2} label="DNS" value={tenant.dns?.recordValue || "Pending"} detail={tenant.dns?.provider || "godaddy"} />
      </div>

      {tenant.failureReason && (
        <div className="mx-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {tenant.failureReason}
        </div>
      )}

      <div className="flex flex-wrap gap-2 px-4 py-3">
        <button
          onClick={() => action(`/admin/tenants/${tenant._id}/retry`, "Provisioning retry started")}
          disabled={!["failed", "pending"].includes(tenant.status)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={15} />
          Retry
        </button>
        <button
          onClick={() => action(`/admin/tenants/${tenant._id}/deactivate`, "Tenant marked deactivated")}
          className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          <XCircle size={15} />
          Deactivate
        </button>
      </div>

      <div className="border-t border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-950">Provisioning log</h3>
        <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
          {logs.length === 0 && <p className="text-sm text-slate-500">No logs yet.</p>}
          {logs.slice().reverse().map((log) => (
            <div key={log._id || `${log.createdAt}-${log.message}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase ${log.level === "error" ? "text-red-700" : log.level === "warning" ? "text-amber-700" : "text-slate-600"}`}>{log.level}</span>
                <span className="text-xs text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
              </div>
              <p className="mt-1 text-sm text-slate-800">{log.message}</p>
              {log.meta && <pre className="mt-2 overflow-auto rounded bg-white p-2 text-xs text-slate-600">{JSON.stringify(log.meta, null, 2)}</pre>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const InfoTile = ({ icon: Icon, label, value, detail }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
      <Icon size={15} />
      {label}
    </div>
    <p className="truncate text-sm font-semibold text-slate-950">{value || "Pending"}</p>
    {detail && <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>}
  </div>
);

export default function AdminPage() {
  const [token, setToken] = useState(getAdminToken());
  const [tenants, setTenants] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant._id === selectedId) || tenants[0], [tenants, selectedId]);

  const loadTenants = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest("/admin/tenants", { token });
      setTenants(data.tenants || []);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearAdminToken();
        setToken("");
      }
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
    const timer = setInterval(loadTenants, 15000);
    return () => clearInterval(timer);
  }, [token]);

  const mergeTenant = (tenant) => {
    setTenants((current) => {
      const exists = current.some((item) => item._id === tenant._id);
      if (!exists) return [tenant, ...current];
      return current.map((item) => (item._id === tenant._id ? tenant : item));
    });
    setSelectedId(tenant._id);
  };

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-cyan-300">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tenant Provisioning</h1>
              <p className="text-sm text-slate-500">EC2, Atlas, DNS, and SSL orchestration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadTenants} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => {
                clearAdminToken();
                setToken("");
              }}
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <TenantForm token={token} onCreated={mergeTenant} />
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-base font-bold">Tenants</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {tenants.length === 0 && <p className="p-4 text-sm text-slate-500">No tenants yet.</p>}
              {tenants.map((tenant) => (
                <button
                  key={tenant._id}
                  onClick={() => setSelectedId(tenant._id)}
                  className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedTenant?._id === tenant._id ? "bg-cyan-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{tenant.tenantName}</p>
                      <p className="truncate text-xs text-slate-500">{tenant.fullDomain}</p>
                    </div>
                    <StatusBadge status={tenant.status} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <TenantDetail tenant={selectedTenant} token={token} onChanged={mergeTenant} />
      </div>
    </main>
  );
}
