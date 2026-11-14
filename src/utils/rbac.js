import { roles } from '../data/users';

/**
 * Role-based access control utility.
 * Determines which sidebar items and routes a role can access.
 */

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
  { key: 'cadets', label: 'Cadet Records', path: '/cadets', icon: 'Users' },
  { key: 'queue', label: 'Sick Report / OPD', path: '/queue', icon: 'ListOrdered' },
  { key: 'consultation', label: 'Consultation (SMO)', path: '/consultation', icon: 'Stethoscope' },
  { key: 'compounder', label: 'Physician Portal', path: '/compounder', icon: 'ClipboardList' },
  { key: 'ward', label: 'Ward & Beds', path: '/ward', icon: 'Bed' },
  { key: 'pharmacy', label: 'Pharmacy & Stock', path: '/pharmacy', icon: 'Pill' },
  { key: 'lab', label: 'Lab & Radiology', path: '/lab', icon: 'FlaskConical' },
  { key: 'rest-duty', label: 'ExcuseDesk', path: '/rest-duty', icon: 'FileText' },
  { key: 'fitness', label: 'Annual Medical', path: '/fitness', icon: 'HeartPulse' },
  { key: 'reports', label: 'Reports & Analytics', path: '/reports', icon: 'BarChart3' },
  { key: 'settings', label: 'Settings', path: '/settings', icon: 'Settings' },
];

// Sections hidden from the Admin portal only (nav + route access).
const ADMIN_HIDDEN = ['queue', 'consultation', 'pharmacy'];

export function getNavForRole(roleId) {
  const role = roles[roleId];
  if (!role) return [];
  return NAV_ITEMS.filter(item =>
    role.permissions.includes(item.key) && !(roleId === 'admin' && ADMIN_HIDDEN.includes(item.key))
  );
}

export function canAccess(roleId, pageKey) {
  const role = roles[roleId];
  if (!role) return false;
  if (roleId === 'admin' && ADMIN_HIDDEN.includes(pageKey)) return false;
  return role.permissions.includes(pageKey);
}

export function getRoleById(roleId) {
  return roles[roleId] || null;
}

export function isLimitedRole(roleId) {
  return roleId === 'houseMaster';
}

export { NAV_ITEMS };
