export function FormField({ label, error, required, hint, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-primary-900 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
          <span className="inline-block w-1 h-1 rounded-full bg-red-600" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ id, error, className = '', ...props }) {
  return (
    <input
      id={id}
      className={`input ${error ? 'input-error' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
}

export function Select({ id, error, children, className = '', ...props }) {
  return (
    <select
      id={id}
      className={`input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_12px_center] pr-9 ${error ? 'input-error' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ id, error, rows = 4, className = '', ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      className={`input resize-y ${error ? 'input-error' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9"
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
    </div>
  );
}

export function FormActions({ children, className = '' }) {
  return <div className={`flex items-center gap-3 pt-4 ${className}`}>{children}</div>;
}
