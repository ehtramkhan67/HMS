import { Card, CardHeader, CardBody, CardFooter } from './Card';

export { Card, CardHeader, CardBody, CardFooter };

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, iconBg = 'bg-primary-50 text-primary-900 border border-primary-100', value, label, trend, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-primary-900">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{label}</p>
          {trend && (
            <p className={`text-xs font-medium mt-2 ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-50 text-primary-900 border border-primary-200',
    secondary: 'bg-secondary-100 text-primary-900 border border-secondary-300 font-semibold',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className={`${sizes[size]} rounded-full bg-secondary-500 text-primary-900 flex items-center justify-center font-bold shrink-0 shadow-sm ${className}`}>
      {initials}
    </div>
  );
}
