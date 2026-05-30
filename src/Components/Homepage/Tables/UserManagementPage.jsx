import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserMinus,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../apiConfig";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "user",
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");

  const tenantAdmins = useMemo(
    () => users.filter((user) => user.role === "tenant_admin" && user.isActive !== false),
    [users]
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/tenant/users");
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.post("/tenant/users", form);
      setUsers((current) => [response.data.user, ...current]);
      setForm(emptyForm);
      toast.success("User created");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not create user");
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (user, role) => {
    if (user.role === role) return;
    setBusyUserId(user.id);
    try {
      const response = await api.patch(`/tenant/users/${user.id}/role`, { role });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data.user : item)));
      toast.success("Role updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update role");
    } finally {
      setBusyUserId("");
    }
  };

  const setAccess = async (user, isActive) => {
    setBusyUserId(user.id);
    try {
      const response = await api.patch(`/tenant/users/${user.id}/access`, { isActive });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data.user : item)));
      toast.success(isActive ? "Access restored" : "Access revoked");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update access");
    } finally {
      setBusyUserId("");
    }
  };

  const deleteUser = async (user) => {
    const ok = window.confirm(`Delete ${user.email}? This cannot be undone.`);
    if (!ok) return;

    setBusyUserId(user.id);
    try {
      await api.delete(`/tenant/users/${user.id}`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      toast.success("User deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not delete user");
    } finally {
      setBusyUserId("");
    }
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <UserCog size={20} className="text-indigo-600 dark:text-indigo-400" />
              Users
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create users, assign tenant admins, and control access.
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold">Create user</h3>
          </div>
          <form onSubmit={createUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="min-w-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => updateForm("firstName", event.target.value)}
              />
              <input
                className="min-w-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => updateForm("lastName", event.target.value)}
              />
            </div>
            <input
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Email address"
              type="email"
              required
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
            />
            <input
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Temporary password"
              type="password"
              required
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
            />
            <select
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={form.role}
              onChange={(event) => updateForm("role", event.target.value)}
            >
              <option value="user">User</option>
              <option value="tenant_admin">Tenant admin</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <UserCheck size={17} />}
              Create user
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 dark:border-slate-800 p-4 sm:grid-cols-3">
            <Metric label="Total users" value={users.length} icon={UserCog} />
            <Metric label="Tenant admins" value={tenantAdmins.length} icon={ShieldCheck} />
            <Metric label="Active users" value={users.filter((user) => user.isActive !== false).length} icon={CheckCircle2} />
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={28} />
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-left text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3">Last login</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                        No users yet.
                      </td>
                    </tr>
                  )}
                  {users.map((user) => {
                    const busy = busyUserId === user.id;
                    return (
                      <tr key={user.id} className={user.isActive === false ? "bg-slate-50 text-slate-500 dark:bg-slate-950/40" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user"}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            disabled={busy}
                            onChange={(event) => updateRole(user, event.target.value)}
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                          >
                            <option value="user">User</option>
                            <option value="tenant_admin">Tenant admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive === false ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
                            {user.isActive === false ? "Revoked" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setAccess(user, user.isActive === false)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
                            >
                              {busy ? <Loader2 size={14} className="animate-spin" /> : user.isActive === false ? <UserCheck size={14} /> : <UserMinus size={14} />}
                              {user.isActive === false ? "Restore" : "Revoke"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const Metric = ({ label, value, icon: Icon }) => (
  <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
      <Icon size={15} />
      {label}
    </div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
  </div>
);

export default UserManagementPage;
