import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Trash2, 
  Lock, 
  Mail, 
  User, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UserManagementView: React.FC = () => {
  const { user: currentUser, users, fetchUsers, createUser, deleteUser } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [email, setEmail] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password || !name.trim()) {
      setErrorMsg('Username, password, and full name are required.');
      return;
    }

    setSubmitting(true);
    const res = await createUser({
      username: username.trim(),
      password,
      name: name.trim(),
      role,
      email: email.trim() || undefined
    });
    setSubmitting(false);

    if (res.success) {
      setSuccessMsg(`User account "${username}" successfully created as ${role === 'admin' ? 'Administrator' : 'Regular User / Viewer'}.`);
      setUsername('');
      setPassword('');
      setName('');
      setEmail('');
      setRole('viewer');
    } else {
      setErrorMsg(res.error || 'Failed to create user.');
    }
  };

  const handleDeleteUser = async (id: string, uname: string) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user account "${uname}"?`)) return;

    const res = await deleteUser(id);
    if (res.success) {
      setSuccessMsg(`User account "${uname}" has been deleted.`);
    } else {
      setErrorMsg(res.error || 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">User Accounts & Role Permissions</h2>
            <p className="text-xs text-slate-400">
              Manage system users with segregated access levels between Operations Administrators and Regular Viewers.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Create User Form (Left) & User Accounts Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create User Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Create New User Account</h3>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Username *</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe_engineer"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Full Name / Operator Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe (Dispatcher)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Password *</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Email Address (Optional)</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="e.g. lineman@neeco2area1.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Access Level Role *</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`p-2.5 rounded-lg border cursor-pointer transition ${
                  role === 'viewer' ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="viewer"
                    checked={role === 'viewer'}
                    onChange={() => setRole('viewer')}
                    className="sr-only"
                  />
                  <span className="font-bold block text-white">Regular Viewer</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Read analytics & export only</span>
                </label>

                <label className={`p-2.5 rounded-lg border cursor-pointer transition ${
                  role === 'admin' ? 'bg-amber-600/20 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="sr-only"
                  />
                  <span className="font-bold block text-white flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" /> Administrator
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Full CRUD & system control</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition shadow-sm cursor-pointer"
            >
              {submitting ? 'Creating User...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Existing Users Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Active System Accounts ({users.length})</h3>
              <span className="text-xs text-slate-400 font-mono">Backend Database Synced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 uppercase text-[11px] border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{u.name || u.username}</span>
                          <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                        </td>
                        <td className="py-3 px-3">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Shield className="w-2.5 h-2.5 mr-1 text-amber-400" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Viewer
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {u.email || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isSelf ? (
                            <span className="text-[10px] text-slate-500 italic">Current User</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                              title="Delete user account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-xs">
            <h4 className="font-semibold text-slate-300 mb-2">Role Permissions Matrix:</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-amber-300 font-bold block mb-1">Administrator:</span>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Add, edit & delete interruption records</li>
                  <li>One-click mark incidents as Restored</li>
                  <li>Import and sync Excel workbooks</li>
                  <li>Manage users & access permissions</li>
                  <li>Update reference tables</li>
                </ul>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-300 font-bold block mb-1">Regular User / Viewer:</span>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>View live analytics dashboard & charts</li>
                  <li>Search and filter interruption records</li>
                  <li>View real-time running outage timers</li>
                  <li>Export filtered data to Excel (.xlsx) / CSV</li>
                  <li>Lookup 7 reference tables</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
