import { createContext, useContext, useState, useCallback } from 'react';
import { users, roles } from '../data/users';

const AuthContext = createContext(null);

const DISPLAY_DOCTOR = 'Dr. Shamoon';

function normalizeDisplayName(name) {
  if (!name) return name;
  if (/nurse/i.test(name)) return DISPLAY_DOCTOR;
  return name;
}

// Admin / House Master portals show plain role titles instead of person names.
function displayNameFor(user) {
  if (!user) return user;
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'houseMaster') return 'House Master';
  return normalizeDisplayName(user.name);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cchms-user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.name === 'string') {
          const canonical = users.find(u => u.id === parsed.id);
          const base = canonical ? canonical.name : parsed.name;
          const next = {
            ...parsed,
            name: displayNameFor({ ...parsed, name: base }),
            email: canonical?.email ?? parsed.email,
            houseId: canonical?.houseId ?? parsed.houseId,
            houseName: canonical?.houseName ?? parsed.houseName,
          };
          if (JSON.stringify(next) !== saved) {
            localStorage.setItem('cchms-user', JSON.stringify(next));
          }
          return next;
        }
        return parsed;
      } catch { /* ignore */ }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, role) => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(r => setTimeout(r, 600));
      let matched = users.find(u => u.email === email);
      if (!matched) {
        matched = users.find(u => u.role === role) || users[0];
        matched = { ...matched, email };
      }
      const roleData = roles[matched.role];
      const sessionUser = {
        ...matched,
        name: displayNameFor(matched),
        roleData,
      };
      setUser(sessionUser);
      localStorage.setItem('cchms-user', JSON.stringify(sessionUser));
      return sessionUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const switchRole = useCallback((roleId) => {
    setUser(prev => {
      if (!prev) return prev;
      const roleData = roles[roleId];
      // Adopt the canonical user's identity for the selected role so the header
      // always shows that portal's person (e.g. Admin portal never shows an SMO name),
      // and House Masters keep their assigned house.
      const target = users.find(u => u.role === roleId);
      const name = target
        ? displayNameFor(target)
        : displayNameFor({ ...prev, role: roleId });
      const updated = target
        ? { ...prev, id: target.id, email: target.email, houseId: target.houseId, houseName: target.houseName, name, role: roleId, roleData }
        : { ...prev, name, role: roleId, roleData };
      localStorage.setItem('cchms-user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cchms-user');
  }, []);

  const value = {
    user,
    role: user?.role || null,
    roleData: user?.roleData || null,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
