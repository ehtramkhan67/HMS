import { useState, useEffect, useMemo } from 'react';
import {
  Users, Shield, Search, ChevronLeft, ChevronRight,
  Mail, Phone, Building, UserCog,
} from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody, Badge, Avatar, StatCard } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, SearchEmpty } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Select, Input } from '../components/FormFields';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { roles } from '../data/users';
import { formatDateTime } from '../utils/helpers';

// Admin can assign only these roles (Admin & House Master are not selectable).
const ASSIGNABLE_ROLES = ['doctor', 'compounder', 'pharmacist', 'lab'];
const assignableRoleList = ASSIGNABLE_ROLES.map(id => roles[id]).filter(Boolean);

// Admin & House Master accounts are hidden from this section's user list.
const HIDDEN_USER_ROLES = ['admin', 'houseMaster'];

export default function SettingsPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newName, setNewName] = useState('');
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getUsers();
      setUsers(d.filter(u => !HIDDEN_USER_ROLES.includes(u.role)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
    return result;
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(ASSIGNABLE_ROLES.includes(u.role) ? u.role : ASSIGNABLE_ROLES[0]);
    setNewName(u.name);
    setShowRoleModal(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || !ASSIGNABLE_ROLES.includes(newRole)) {
      toast.error('Select a valid role');
      return;
    }
    const trimmedName = newName.trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }
    try {
      await api.updateUserRole(selectedUser.id, { role: newRole, name: trimmedName });
      setUsers(prev => prev.map(u => u.id === selectedUser.id
        ? { ...u, role: newRole, name: trimmedName }
        : u));
      setShowRoleModal(false);
      toast.success(`${trimmedName} saved as ${roles[newRole] ? roles[newRole].name : newRole}`);
    } catch {
      toast.error('Failed to update user');
    }
  };

  if (loading) return <Loading message="Loading settings…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="User management, roles, and system configuration" />

      <div className="border-b border-primary-100 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" role="tablist">
          <button role="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')}
            className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (tab === 'users' ? 'border-secondary-500 text-primary-900 font-bold' : 'border-transparent text-slate-500 hover:text-primary-900')}>
            <Users size={16} /> Users
          </button>
          <button role="tab" aria-selected={tab === 'roles'} onClick={() => setTab('roles')}
            className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (tab === 'roles' ? 'border-secondary-500 text-primary-900 font-bold' : 'border-transparent text-slate-500 hover:text-primary-900')}>
            <Shield size={16} /> Roles & Permissions
          </button>
          <button role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}
            className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (tab === 'profile' ? 'border-secondary-500 text-primary-900 font-bold' : 'border-transparent text-slate-500 hover:text-primary-900')}>
            <UserCog size={16} /> My Profile
          </button>
        </nav>
      </div>

      {tab === 'users' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Users} iconBg="bg-blue-50 text-blue-600" value={users.length} label="Total Users" />
            <StatCard icon={Shield} iconBg="bg-emerald-50 text-emerald-600" value={users.filter(u => u.status === 'Active').length} label="Active" />
            <StatCard icon={Users} iconBg="bg-slate-100 text-slate-600" value={users.filter(u => u.status === 'Inactive').length} label="Inactive" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-md">
              <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search users…" className="input pl-9" aria-label="Search users" />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="input w-auto" aria-label="Filter by role">
              <option value="all">All Roles</option>
              {assignableRoleList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {filtered.length === 0 && <SearchEmpty query={search || roleFilter} />}

          {filtered.length > 0 && (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Last Login</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(u => (
                        <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.name} size="sm" />
                              <div>
                                <p className="font-medium text-slate-800">{u.name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1"><Mail size={10} /> {u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge variant="primary">{roles[u.role] ? roles[u.role].name : u.role}</Badge></td>
                          <td className="px-4 py-3 text-slate-600 flex items-center gap-1"><Building size={12} className="text-slate-400" /> {u.department}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openRoleModal(u)} className="btn-secondary btn-sm">
                              Change Role
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                <p>Page {page} of {totalPages} — {filtered.length} users</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="btn-secondary btn-sm disabled:opacity-40" aria-label="Previous"><ChevronLeft size={14} /></button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="btn-secondary btn-sm disabled:opacity-40" aria-label="Next"><ChevronRight size={14} /></button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assignableRoleList.map(r => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-dark-900">{r.name}</h3>
                  <Badge variant="primary">{users.filter(u => u.role === r.id).length} users</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{r.description}</p>
              </CardHeader>
              <CardBody>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.map(p => (
                    <span key={p} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                      {p}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'profile' && currentUser && (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar name={currentUser.name} size="lg" />
              <div>
                <h3 className="font-semibold text-dark-900 text-lg">{currentUser.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1"><Mail size={14} /> {currentUser.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 py-2">
                <Shield size={16} className="text-slate-400 mt-0.5" />
                <div><p className="text-xs text-slate-500">Role</p><p className="text-sm font-medium">{roles[currentUser.role] ? roles[currentUser.role].name : currentUser.role}</p></div>
              </div>
              <div className="flex items-start gap-3 py-2">
                <Building size={16} className="text-slate-400 mt-0.5" />
                <div><p className="text-xs text-slate-500">Department</p><p className="text-sm font-medium">{currentUser.department || '—'}</p></div>
              </div>
              <div className="flex items-start gap-3 py-2">
                <Phone size={16} className="text-slate-400 mt-0.5" />
                <div><p className="text-xs text-slate-500">Phone</p><p className="text-sm font-medium">{currentUser.phone || '—'}</p></div>
              </div>
              <div className="flex items-start gap-3 py-2">
                <Users size={16} className="text-slate-400 mt-0.5" />
                <div><p className="text-xs text-slate-500">Status</p><StatusBadge status={currentUser.status || 'Active'} /></div>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Your Access</p>
              <div className="flex flex-wrap gap-1.5">
                {(roles[currentUser.role] ? roles[currentUser.role].permissions : []).map(p => (
                  <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium">{p}</span>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Role change modal */}
      <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)} title="Change Role & Name"
        size="sm"
        footer={<>
          <button onClick={() => setShowRoleModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleRoleChange} className="btn-primary">Save Changes</button>
        </>}>
        <div className="space-y-4">
          {selectedUser && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Avatar name={newName || selectedUser.name} size="sm" />
              <div>
                <p className="font-medium text-slate-800 text-sm">{selectedUser.name}</p>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
              </div>
            </div>
          )}
          <FormField label="Person Name" id="role-name" required hint="e.g. new SMO joining this year">
            <Input id="role-name" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter full name" autoFocus />
          </FormField>
          <FormField label="Role" id="role-select">
            <Select id="role-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {assignableRoleList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
