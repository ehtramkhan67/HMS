import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roles, users } from '../data/users';
import logoImg from '../assets/logo.png';

const houseMasters = users.filter(u => u.role === 'houseMaster');
import { validateForm } from '../utils/helpers';
import { Alert } from '../components/Toast';

export default function Login() {
  const navigate = useNavigate();
  const { user, login, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'doctor' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const rules = {
    email: [
      { type: 'required', message: 'Email is required' },
      { type: 'email', message: 'Enter a valid email address' },
    ],
    password: [
      { type: 'required', message: 'Password is required' },
      { type: 'min', value: 4, message: 'Password must be at least 4 characters' },
    ],
    role: [{ type: 'required', message: 'Select a role' }],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // Picking the House Master role must always point at a House Master ID.
      if (name === 'role' && value === 'houseMaster') {
        const keepsHm = houseMasters.some(u => u.email === prev.email);
        if (!keepsHm && houseMasters[0]) next.email = houseMasters[0].email;
      }
      return next;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm(rules, form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const user = await login(form.email, form.role);
      if (user) navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Login failed. Please try again.');
    }
  };

  const quickLogin = async (roleId) => {
    const canonical = users.find(u => u.role === roleId);
    const email = canonical?.email || `${roleId}@cch.edu.pk`;
    setForm({ email, password: 'demo1234', role: roleId });
    try {
      const user = await login(email, roleId);
      if (user) navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & title */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group focus-visible:outline-none">
            <img
              src={logoImg}
              alt="Cadet College Kohat crest"
              className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <h1 className="text-2xl font-bold text-primary-900">Cadet College Kohat</h1>
          <p className="text-secondary-700 font-semibold mt-1 text-sm">Hospital Management System</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 sm:p-8">
          {user && (
            <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-900">Active Session</p>
                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                <p className="text-xs text-secondary-600 font-semibold">{user.roleData?.name || user.role}</p>
              </div>
              <Link
                to="/dashboard"
                className="btn-primary btn-sm text-xs font-bold whitespace-nowrap self-start sm:self-center"
              >
                Go to Dashboard →
              </Link>
            </div>
          )}

          <h2 className="text-lg font-bold text-primary-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the system</p>

          {formError && (
            <div className="mb-4">
              <Alert type="error">{formError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-900 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your.name@cch.edu.pk"
                className={`input ${errors.email ? 'input-error' : ''}`}
                aria-invalid={errors.email ? 'true' : undefined}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1" role="alert">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-900 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  aria-invalid={errors.password ? 'true' : undefined}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-900"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1" role="alert">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-primary-900 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className={`input ${errors.role ? 'input-error' : ''}`}
              >
                {Object.values(roles).map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-red-600 mt-1" role="alert">{errors.role}</p>}
            </div>

            {form.role === 'houseMaster' && (
              <div>
                <label htmlFor="hm-account" className="block text-sm font-medium text-primary-900 mb-1.5">
                  House Master account <span className="text-red-500">*</span>
                </label>
                <select
                  id="hm-account"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  aria-label="Choose House Master account"
                >
                  {houseMasters.map(u => (
                    <option key={u.id} value={u.email}>{u.houseName} — {u.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Each House Master signs in with their own ID and sees only their house.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          {/* Quick-login demo buttons */}
          <div className="mt-6 pt-6 border-t border-primary-100">
            <p className="text-xs text-slate-500 mb-3 text-center">Quick demo login — pick a role:</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(roles).map(r => (
                <button
                  key={r.id}
                  onClick={() => quickLogin(r.id)}
                  disabled={loading}
                  className="btn-secondary btn-sm text-xs justify-center disabled:opacity-50"
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Frontend demo — no real authentication. Data is mock only.
        </p>

        <p className="mt-5 text-center">
          <Link
            to="/"
            className="font-display text-xs font-bold uppercase tracking-wider text-primary-800 hover:text-secondary-600 transition-colors"
          >
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
