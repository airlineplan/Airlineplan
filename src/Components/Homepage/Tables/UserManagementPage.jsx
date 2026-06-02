import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserMinus,
  Settings2,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../apiConfig";
import {
  ASSIGNABLE_PAGE_FEATURES,
  PAGE_ACCESS_OPTIONS,
  createPageAccess,
  normalizePageAccess,
} from "../../../permissions/pageAccess";

const createEmptyForm = (features = ASSIGNABLE_PAGE_FEATURES) => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "user",
  pageAccess: createPageAccess("edit", features),
});

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [pageAccessFeatures, setPageAccessFeatures] = useState(ASSIGNABLE_PAGE_FEATURES);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccessUser, setEditingAccessUser] = useState(null);

  const tenantAdmins = useMemo(
    () => users.filter((user) => user.role === "tenant_admin" && user.isActive !== false),
    [users]
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName?.toLowerCase().includes(query) ||
        u.lastName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/tenant/users");
      const features = response.data.pageAccessFeatures?.length
        ? response.data.pageAccessFeatures
        : ASSIGNABLE_PAGE_FEATURES;
      setPageAccessFeatures(features);
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

  const handleUserCreated = (newUser) => {
    setUsers((current) => [newUser, ...current]);
    setIsCreateModalOpen(false);
    toast.success("User created successfully");
  };

  const updateRole = async (user, role) => {
    if (user.role === role) return;
    setBusyUserId(user.id);
    try {
      const response = await api.patch(`/tenant/users/${user.id}/role`, { role });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data.user : item)));
      
      // Update local modal state if they are currently being edited
      if (editingAccessUser?.id === user.id) {
        setEditingAccessUser(response.data.user);
      }
      toast.success("Role updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update role");
    } finally {
      setBusyUserId("");
    }
  };

  const updatePageAccess = async (user, featureId, access) => {
    const nextPageAccess = normalizePageAccess({
      ...user.pageAccess,
      [featureId]: access,
    }, pageAccessFeatures);

    if (nextPageAccess[featureId] === user.pageAccess?.[featureId]) {
      return;
    }

    setBusyUserId(user.id);
    try {
      const response = await api.patch(`/tenant/users/${user.id}/page-access`, {
        pageAccess: nextPageAccess,
      });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data.user : item)));
      
      // Update local modal state
      if (editingAccessUser?.id === user.id) {
        setEditingAccessUser(response.data.user);
      }
      toast.success("Page access updated");
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || "Could not update page access";
      if (error.response?.status !== 403) {
        toast.error(message);
      }
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
      if (editingAccessUser?.id === user.id) setEditingAccessUser(null);
      toast.success("User deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not delete user");
    } finally {
      setBusyUserId("");
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100">
      {/* Top Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <UserCog size={24} className="text-indigo-600 dark:text-indigo-400" />
              Access Management
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage user roles, permissions, and platform access.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus size={16} />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Metrics Bar */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Total Users" value={users.length} icon={UserCog} />
          <Metric label="Tenant Admins" value={tenantAdmins.length} icon={ShieldCheck} />
          <Metric label="Active Accounts" value={users.filter((user) => user.isActive !== false).length} icon={CheckCircle2} />
        </div>

        {/* Controls Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={28} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Login</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-500" colSpan={5}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors ${user.isActive === false ? "opacity-60" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed User"}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${user.role === 'tenant_admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {user.role === 'tenant_admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${user.isActive === false ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
                            {user.isActive === false ? "Revoked" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setEditingAccessUser(user)}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm flex items-center gap-1"
                            >
                              <Settings2 size={16} /> Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <CreateUserModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={handleUserCreated}
          pageAccessFeatures={pageAccessFeatures}
        />
      )}

      {/* Manage Access Modal */}
      {editingAccessUser && (
        <ManageAccessModal
          user={editingAccessUser}
          onClose={() => setEditingAccessUser(null)}
          pageAccessFeatures={pageAccessFeatures}
          updateRole={updateRole}
          updatePageAccess={updatePageAccess}
          setAccess={setAccess}
          deleteUser={deleteUser}
          busyUserId={busyUserId}
        />
      )}
    </div>
  );
};

// --- Sub-components ---

const Metric = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
      <Icon size={18} className="text-slate-400" />
      {label}
    </div>
    <div className="mt-3 text-3xl font-bold">{value}</div>
  </div>
);

const ModalPortal = ({ children }) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm">
      <div className="absolute left-1/2 top-1/2 flex w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 justify-center">
        {children}
      </div>
    </div>,
    document.body
  );
};

const CreateUserModal = ({ onClose, onSuccess, pageAccessFeatures }) => {
  const [form, setForm] = useState(() => createEmptyForm(pageAccessFeatures));
  const [saving, setSaving] = useState(false);

  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.post("/tenant/users", form);
      onSuccess(response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h3 className="text-lg font-bold">Create New User</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
        </div>
        <form onSubmit={createUser} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <input
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Email address"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Temporary password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="user">Standard User</option>
            <option value="tenant_admin">Tenant Admin</option>
          </select>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

const ManageAccessModal = ({ user, onClose, pageAccessFeatures, updateRole, updatePageAccess, setAccess, deleteUser, busyUserId }) => {
  const isBusy = busyUserId === user.id;

  return (
    <ModalPortal>
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 bg-white dark:bg-slate-900 rounded-t-xl z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Access</h3>
            <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 dark:bg-slate-950/30">
          
          {/* Role Selection */}
          <section className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Account Role</h4>
            <select
              value={user.role}
              disabled={isBusy}
              onChange={(e) => updateRole(user, e.target.value)}
              className="w-full sm:w-72 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="user">Standard User</option>
              <option value="tenant_admin">Tenant Admin</option>
            </select>
          </section>

          {/* Permissions List */}
          <section>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Feature Permissions</h4>
            {user.role === "tenant_admin" ? (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:text-indigo-300 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                Tenant admins automatically inherit full access to all features.
              </div>
            ) : (
              <PageAccessMatrix
                features={pageAccessFeatures}
                pageAccess={user.pageAccess}
                disabled={isBusy}
                onChange={(featureId, access) => updatePageAccess(user, featureId, access)}
              />
            )}
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shrink-0 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3">
            <button
              onClick={() => deleteUser(user)}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10 transition"
            >
              <Trash2 size={16} /> Delete Account
            </button>
            <button
              onClick={() => setAccess(user, user.isActive === false)}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition"
            >
              {user.isActive === false ? <UserCheck size={16} /> : <UserMinus size={16} />}
              {user.isActive === false ? "Restore Login" : "Revoke Login"}
            </button>
          </div>
          <button 
            onClick={onClose} 
            className="px-6 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 rounded-md transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

const PageAccessMatrix = ({ disabled = false, features, pageAccess, onChange }) => {
  const normalizedAccess = normalizePageAccess(pageAccess, features);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {features.map((feature) => (
          <div 
            key={feature.id} 
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {feature.label}
            </span>
            
            {/* Connected Segmented Control */}
            <div className="inline-flex rounded-md shadow-sm">
              {PAGE_ACCESS_OPTIONS.map((option, index) => {
                const selected = normalizedAccess[feature.id] === option.value;
                const isFirst = index === 0;
                const isLast = index === PAGE_ACCESS_OPTIONS.length - 1;

                return (
                  <button
                    key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!selected) onChange(feature.id, option.value);
                  }}
                    className={`
                      relative inline-flex items-center justify-center min-w-[70px] px-3 py-1.5 text-xs font-semibold
                      ${isFirst ? 'rounded-l-md' : ''} 
                      ${isLast ? 'rounded-r-md' : ''}
                      ${!isFirst ? '-ml-px' : ''} /* Overlaps borders cleanly */
                      border
                      ${selected 
                        ? 'bg-indigo-600 border-indigo-600 text-white z-10' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }
                      disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:z-20
                    `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagementPage;
