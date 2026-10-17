import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Briefcase,
  Users,
  Building2,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';
import { UserProfile } from '../types';

import { api } from '../services/api';

interface LoginPageProps {
  users: UserProfile[];
  onLogin: (userId: number) => void;
  onUserRegistered?: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, onUserRegistered }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [selectedRole, setSelectedRole] = useState<'employee' | 'manager' | 'director_ceo'>('employee');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [password, setPassword] = useState<string>('••••••••');

  // Registration Fields (to add user's own details)
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'employee' | 'manager' | 'director_ceo'>('employee');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => u.role === selectedRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId) {
      onLogin(Number(selectedUserId));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    try {
      setRegLoading(true);
      setRegError(null);
      const generatedUsername = regUsername.trim() || regName.toLowerCase().replace(/\s+/g, '_');
      const newUser = await api.registerUser({
        name: regName.trim(),
        username: generatedUsername,
        email: regEmail.trim(),
        role: regRole,
        department: regDepartment.trim(),
      });

      if (onUserRegistered) {
        onUserRegistered(newUser);
      } else {
        onLogin(newUser.id);
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header with User's Uploaded VELO Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl shadow-xl shadow-indigo-500/10 mb-2 bg-slate-950 border border-slate-800">
            <img
              src="/velo_logo.png"
              alt="VELO Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome to <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">VELO</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            AI Workspace Intelligence: Employee task summarization, Manager command & Director overview
          </p>
        </div>

        {/* Login vs Register Switcher */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In Existing Profile
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Register Your Details
          </button>
        </div>

        {/* Mode 1: Register New Account */}
        {mode === 'register' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Register Your Custom Account
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add your own name and role to test how VELO isolates your tasks and intelligence reports.
              </p>
            </div>

            {regError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Sri Dakshayani"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. sridakshayani"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    placeholder="Engineering / Product"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email (Gmail / Outlook)
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role in VELO
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('employee')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition ${
                      regRole === 'employee'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Employee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('manager')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition ${
                      regRole === 'manager'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Manager</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('director_ceo')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition ${
                      regRole === 'director_ceo'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Director</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading || !regName.trim() || !regEmail.trim()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition"
              >
                <span>{regLoading ? 'Creating Account in SQLite...' : 'Create Account & Enter VELO'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Mode 2: Sign In with Existing Profiles */
          <div className="space-y-4">
            {/* Role Selector Tabs */}
            <div className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-3 gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('employee');
                  setSelectedUserId('');
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  selectedRole === 'employee'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Employee</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('manager');
                  setSelectedUserId('');
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  selectedRole === 'manager'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manager</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('director_ceo');
                  setSelectedUserId('');
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  selectedRole === 'director_ceo'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Director</span>
              </button>
            </div>

            {/* Login Form Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 capitalize">
                  {selectedRole === 'director_ceo' ? 'Director / CEO Portal' : `${selectedRole} Sign In`}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedRole === 'employee'
                    ? 'Access your private isolated tasks, summaries, and manager feedback.'
                    : selectedRole === 'manager'
                    ? 'Supervise team member tasks, monitor progress summaries, and clear blockers.'
                    : 'Company-wide intelligence overview, manager audits, and global metrics.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Your Account ({filteredUsers.length} available)
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose User Profile --</option>
                    {filteredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username}) — {u.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Access Password / Token
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Single Sign-On pre-authenticated for enterprise demo.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!selectedUserId}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition"
                >
                  <span>Authenticate & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Demo Credentials Guide */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-700 block">Available Demo Roles:</span>
                <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <strong className="text-slate-800 block">Employee:</strong>
                    <span>Asha / Carlos</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <strong className="text-slate-800 block">Manager:</strong>
                    <span>Marcus / Priya</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <strong className="text-slate-800 block">Director:</strong>
                    <span>Elena Vance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
