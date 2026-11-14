// Shared utility helpers

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function isNearExpiry(expiryDate, days = 60) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86400000);
  const exp = new Date(expiryDate);
  return exp <= cutoff;
}

export function isExpired(expiryDate) {
  return new Date(expiryDate) < new Date();
}

export function daysUntil(expiryDate) {
  const now = new Date();
  const exp = new Date(expiryDate);
  return Math.ceil((exp - now) / 86400000);
}

export function clsx(...args) {
  return args.flat().filter(Boolean).join(' ');
}

export function validateRequired(value) {
  return value && String(value).trim().length > 0;
}

export function validateEmail(email) {
  // Allows spaces inside the local part (e.g. "Noor ul Wahab.hm@cch.edu.pk"),
  // but never around the @ or inside the domain.
  return /^[^@\s]+(?: [^@\s]+)*@[^@\s]+\.[^@\s]+$/.test(email);
}

export function validatePhone(phone) {
  return /^03\d{9}$/.test(phone.replace(/\s/g, ''));
}

export function validateForm(rules, values) {
  const errors = {};
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = values[field];
    fieldRules.forEach(rule => {
      if (rule.type === 'required' && !validateRequired(value)) {
        errors[field] = rule.message || 'This field is required';
      }
      if (rule.type === 'email' && value && !validateEmail(value)) {
        errors[field] = rule.message || 'Invalid email address';
      }
      if (rule.type === 'phone' && value && !validatePhone(value)) {
        errors[field] = rule.message || 'Invalid phone number (03XXXXXXXXX)';
      }
      if (rule.type === 'min' && value && String(value).length < rule.value) {
        errors[field] = rule.message || `Minimum ${rule.value} characters`;
      }
      if (rule.type === 'numeric' && value && isNaN(Number(value))) {
        errors[field] = rule.message || 'Must be a number';
      }
      if (rule.type === 'positive' && value && Number(value) <= 0) {
        errors[field] = rule.message || 'Must be greater than 0';
      }
      if (rule.type === 'custom' && rule.validator) {
        const msg = rule.validator(value, values);
        if (msg) errors[field] = msg;
      }
    });
  });
  return errors;
}

export function downloadMockFile(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}
