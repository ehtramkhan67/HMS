import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, ChevronDown, LogOut, Bell, Activity as ActivityIcon, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, getRoleById } from '../utils/rbac';
import { roles } from '../data/users';
import { api } from '../utils/api';
import { timeAgo } from '../utils/helpers';
import BackgroundLogo from '../components/BackgroundLogo';
import logoImg from '../assets/logo.png';

// Map nav icon names to lucide components (imported lazily via object)
import {
  LayoutDashboard, Users, ListOrdered, Stethoscope, BedDouble, Pill,
  FlaskConical, FileText, HeartPulse as HeartPulseIcon, MessageSquare,
  BarChart3, Settings, ClipboardList,
} from 'lucide-react';

const iconMap = {
  LayoutDashboard, Users, ListOrdered, Stethoscope, Bed: BedDouble, Pill,
  FlaskConical, FileText, HeartPulse: HeartPulseIcon, MessageSquare, BarChart3, Settings,
  ClipboardList,
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoaded, setNotifsLoaded] = useState(false);
  const location = useLocation();
  const { user, role, logout, switchRole } = useAuth();
  const navItems = getNavForRole(role);
  const currentRole = getRoleById(role);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileOpen && !e.target.closest('[data-profile-menu]')) {
        setProfileOpen(false);
      }
      if (notifOpen && !e.target.closest('[data-notif-menu]')) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen, notifOpen]);

  // Load the real activity feed the first time the bell is opened, then keep
  // it fresh while open so newly synced events show up.
  useEffect(() => {
    if (!notifOpen) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await api.getActivities(12);
        if (!cancelled) setNotifs(rows);
      } catch { /* keep whatever we already have */ }
    };
    load();
    setNotifsLoaded(true);
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [notifOpen]);

  return (
    <div className="min-h-screen bg-surface-light flex flex-col">
      <BackgroundLogo />
      {/* Top Header */}
      <header className="bg-primary-900 text-white h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30 border-b border-primary-800 no-print">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-primary-800 text-white transition-colors focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
            aria-label="Toggle sidebar menu"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Cadet College Kohat crest"
              className="w-9 h-9 object-contain shrink-0 drop-shadow-sm"
            />
            <div className="hidden sm:block">
              <h1 className="font-semibold text-base leading-tight text-white">Cadet College Kohat</h1>
              <p className="text-[11px] text-secondary-400 font-medium leading-tight">Hospital Management System</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Notifications — real activity feed */}
          <div className="relative" data-notif-menu>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="p-2 rounded-lg hover:bg-primary-800 text-white transition-colors relative focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
              aria-label="Notifications"
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <Bell size={20} className="text-slate-300" />
              {notifs.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-secondary-500 rounded-full ring-2 ring-primary-900" />
              )}
            </button>
            {notifOpen && (
              <div
                role="menu"
                aria-label="Recent activity"
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <span className="text-sm font-semibold text-slate-800">Recent Activity</span>
                  <ActivityIcon size={15} className="text-slate-400" />
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {!notifsLoaded && (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">Loading…</div>
                  )}
                  {notifsLoaded && notifs.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                      <Inbox size={20} className="text-slate-300" />
                      Nothing yet — actions across the system appear here.
                    </div>
                  )}
                  {notifs.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50">
                      <span className="mt-0.5 w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                        <ActivityIcon size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700 leading-snug">{a.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{a.user} · {timeAgo(a.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setNotifOpen(false)}
                  className="block px-4 py-2.5 text-center text-xs font-medium text-primary-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  View full activity on Dashboard
                </Link>
              </div>
            )}
          </div>

          {/* Role switcher for demo purposes */}
          <div className="hidden md:flex items-center gap-1 bg-primary-950/70 border border-primary-800 rounded-lg p-0.5 mr-1">
            {Object.values(roles).map(r => (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-secondary-500 ${
                  role === r.id ? 'bg-secondary-500 text-primary-900 font-bold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-primary-800'
                }`}
                title={r.description}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Profile dropdown */}
          <div className="relative" data-profile-menu>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary-800 transition-colors focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <div className="w-8 h-8 rounded-full bg-secondary-500 text-primary-900 flex items-center justify-center text-sm font-bold shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-tight text-white">{user?.name || 'User'}</p>
                <p className="text-[11px] text-secondary-400 font-medium leading-tight">{currentRole?.name || ''}</p>
              </div>
              <ChevronDown size={16} className="text-slate-300 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-xl border border-primary-100 overflow-hidden animate-scale-in z-50">
                <div className="p-4 bg-primary-50/60 border-b border-primary-100">
                  <p className="font-semibold text-sm text-primary-900">{user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                  <p className="text-xs text-secondary-700 font-semibold mt-1">{currentRole?.name}</p>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-primary-900 mb-2 uppercase tracking-wide">Switch Role (Demo)</p>
                  <div className="space-y-1">
                    {Object.values(roles).map(r => (
                      <button
                        key={r.id}
                        onClick={() => { switchRole(r.id); setProfileOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                          role === r.id ? 'bg-secondary-500 text-primary-900 font-bold' : 'hover:bg-primary-50 text-slate-700'
                        }`}
                      >
                        <User size={14} />
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-primary-100 p-3">
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-primary-900 text-white border-r border-primary-800 shrink-0 overflow-y-auto no-print relative z-10">
          <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
            {navItems.map(item => {
              const Icon = iconMap[item.icon];
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-none font-display text-xs font-bold uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-1 ${
                    isActive
                      ? 'bg-secondary-500 text-primary-900 font-bold shadow-md'
                      : 'text-slate-200 hover:bg-primary-800 hover:text-secondary-400'
                  }`}
                >
                  {Icon && <Icon size={18} className={isActive ? 'text-primary-900' : 'text-slate-400'} />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-primary-800">
            <div className="bg-primary-950/70 border border-primary-800 rounded-lg p-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-secondary-400">{currentRole?.name}</span>
                {' — '}
                {currentRole?.description}
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden no-print"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="fixed inset-y-0 left-0 w-72 bg-primary-900 text-white z-50 lg:hidden overflow-y-auto animate-slide-in no-print shadow-2xl border-r border-primary-800">
              <div className="h-16 flex items-center justify-between px-4 border-b border-primary-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src={logoImg}
                    alt="Cadet College Kohat crest"
                    className="w-8 h-8 object-contain shrink-0 drop-shadow-sm"
                  />
                  <span className="font-semibold text-white text-sm">Cadet College Kohat</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-primary-800 text-white focus-visible:ring-2 focus-visible:ring-secondary-500"
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="p-4 space-y-1" aria-label="Mobile navigation">
                {navItems.map(item => {
                  const Icon = iconMap[item.icon];
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-none font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive ? 'bg-secondary-500 text-primary-900 font-bold shadow-md' : 'text-slate-200 hover:bg-primary-800 hover:text-secondary-400'
                  }`}
                >
                      {Icon && <Icon size={18} className={isActive ? 'text-primary-900' : 'text-slate-400'} />}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-primary-800 mt-auto">
                {/* Mobile role switcher */}
                <p className="text-xs font-semibold text-secondary-400 mb-2 uppercase tracking-wide">Switch Role (Demo)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(roles).map(r => (
                    <button
                      key={r.id}
                      onClick={() => switchRole(r.id)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        role === r.id ? 'bg-secondary-500 text-primary-900 font-bold' : 'bg-primary-800 text-slate-200 hover:bg-primary-700 hover:text-white'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 lg:p-6 xl:p-8 relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
