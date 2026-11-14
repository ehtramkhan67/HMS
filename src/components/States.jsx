import { Loader2 } from 'lucide-react';
import { Inbox, AlertTriangle, Search } from 'lucide-react';

export function Loading({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" role="status" aria-live="polite">
      <Loader2 size={32} className="animate-spin text-primary-900" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function LoadingCard({ message = 'Loading…' }) {
  return (
    <div className="card">
      <div className="flex flex-col items-center justify-center py-12 gap-3" role="status">
        <Loader2 size={28} className="animate-spin text-primary-900" />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title = 'No data found', message = 'There are no records to display.', icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center border border-primary-100">
        <Icon size={24} className="text-primary-400" />
      </div>
      <h3 className="font-semibold text-primary-900">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center" role="alert">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle size={24} className="text-red-500" />
      </div>
      <h3 className="font-medium text-red-700">Error</h3>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary btn-sm mt-1">Retry</button>
      )}
    </div>
  );
}

export function SearchEmpty({ query }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      message={`No records match "${query}". Try adjusting your search or filters.`}
    />
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse-soft bg-slate-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
