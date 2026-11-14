import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roles, users } from '../../data/users';
import logoImg from '../../assets/logo.png';
import { validateForm } from '../../utils/helpers';
import { Alert } from '../Toast';

const houseMasters = users.filter(u => u.role === 'houseMaster');

export default function LoginModal({ open, onClose }) {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const modalRef = useRef(null);

  const [form, setForm] = useState({
    email: 'ahmed.raza@cch.edu.pk',
    password: 'demo',
    role: 'doctor',
  });
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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'role') {
        if (value === 'houseMaster') {
          const keepsHm = houseMasters.some(u => u.email === prev.email);
          if (!keepsHm && houseMasters[0]) next.email = houseMasters[0].email;
        } else {
          const canonical = users.find(u => u.role === value);
          if (canonical) next.email = canonical.email;
        }
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
      if (user) {
        onClose();
        navigate('/dashboard');
      }
    } catch (err) {
      setFormError(err.message || 'Login failed. Please try again.');
    }
  };

  const quickLogin = async (roleId) => {
    const canonical = users.find(u => u.role === roleId);
    const email = canonical?.email || `${roleId}@cch.edu.pk`;
    setForm({ email, password: 'demo', role: roleId });
    try {
      const user = await login(email, roleId);
      if (user) {
        onClose();
        navigate('/dashboard');
      }
    } catch (err) {
      setFormError(err.message || 'Login failed.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Open HMS Account Login"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden z-10 animate-scale-in outline-none border border-primary-100"
      >
        {/* Header with close button */}
        <div className="relative bg-gradient-to-r from-primary-900 to-[#033242] px-6 py-6 text-white text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>

          <img
            src={logoImg}
            alt="Cadet College Kohat crest"
            className="w-16 h-16 object-contain mx-auto mb-2 drop-shadow-md"
          />
          <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
            Cadet College Kohat
          </h2>
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-secondary-300 mt-0.5">
            Hospital Management System
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-primary-900">Sign in to your account</h3>
            <p className="text-sm text-slate-500 mt-1">
              Select your role or enter credentials to open your dashboard
            </p>
          </div>

          {formError && (
            <div className="mb-4">
              <Alert type="error">{formError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="modal-role" className="block text-xs font-display font-bold uppercase tracking-wider text-primary-900 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="input"
              >
                {Object.values(roles).map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-red-600 mt-1" role="alert">{errors.role}</p>}
            </div>

            {form.role === 'houseMaster' ? (
              <div>
                <label htmlFor="modal-hm" className="block text-xs font-display font-bold uppercase tracking-wider text-primary-900 mb-1.5">
                  House Master account <span className="text-red-500">*</span>
                </label>
                <select
                  id="modal-hm"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input"
                >
                  {houseMasters.map(u => (
                    <option key={u.id} value={u.email}>{u.houseName} — {u.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="modal-email" className="block text-xs font-display font-bold uppercase tracking-wider text-primary-900 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your.name@cch.edu.pk"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1" role="alert">{errors.email}</p>}
              </div>
            )}

            <div>
              <label htmlFor="modal-password" className="block text-xs font-display font-bold uppercase tracking-wider text-primary-900 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="modal-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-900 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1" role="alert">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold uppercase tracking-wider cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Quick 1-click role selection */}
          <div className="mt-6 pt-5 border-t border-primary-100">
            <p className="text-xs font-semibold text-slate-600 mb-2.5 text-center">
              Quick 1-Click Demo Login:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(roles).map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => quickLogin(r.id)}
                  disabled={loading}
                  className="rounded-lg border border-primary-100 bg-primary-50/50 hover:bg-secondary-500 hover:text-primary-950 hover:border-secondary-500 p-2 text-xs font-bold text-primary-900 transition-colors text-center disabled:opacity-50 cursor-pointer"
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
