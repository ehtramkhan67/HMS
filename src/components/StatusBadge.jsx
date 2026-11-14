/**
 * Status badge color mapping for consistent semantic colors across the app.
 * Only green, amber, red, and blue for status/alerts as per design rules.
 */
export function StatusBadge({ status, className = '' }) {
  const map = {
    // Queue / OPD
    'Waiting': 'bg-blue-50 text-blue-700',
    'In Consultation': 'bg-amber-50 text-amber-700',
    'Done': 'bg-emerald-50 text-emerald-700',
    // Admission
    'Admitted': 'bg-red-50 text-red-700',
    'Discharged': 'bg-emerald-50 text-emerald-700',
    // Lab
    'Ordered': 'bg-slate-100 text-slate-600',
    'Sample Taken': 'bg-blue-50 text-blue-700',
    'Completed': 'bg-emerald-50 text-emerald-700',
    // Beds
    'available': 'bg-emerald-50 text-emerald-700',
    'occupied': 'bg-red-50 text-red-700',
    'reserved': 'bg-amber-50 text-amber-700',
    'maintenance': 'bg-slate-100 text-slate-500',
    // Slips
    'Active': 'bg-emerald-50 text-emerald-700',
    'Expired': 'bg-slate-100 text-slate-500',
    'Fit': 'bg-emerald-50 text-emerald-700',
    'Conditionally Fit': 'bg-amber-50 text-amber-700',
    'Temporarily Unfit': 'bg-red-50 text-red-700',
    'Fit with conditions': 'bg-amber-50 text-amber-700',
    // Notifications
    'Sent': 'bg-emerald-50 text-emerald-700',
    'Delivered': 'bg-blue-50 text-blue-700',
    'Failed': 'bg-red-50 text-red-700',
    // Users (Active already defined above under Slips)
    'Inactive': 'bg-slate-100 text-slate-500',
    // Priority
    'Urgent': 'bg-red-50 text-red-700',
    'Normal': 'bg-slate-100 text-slate-600',
    'Routine': 'bg-slate-100 text-slate-600',
    // Cadet
    'On Leave': 'bg-amber-50 text-amber-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${map[status] || 'bg-slate-100 text-slate-600'} ${className}`}>
      {status}
    </span>
  );
}
