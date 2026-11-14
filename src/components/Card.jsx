export function Card({ children, className = '', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden ${onClick ? 'w-full text-left hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 py-4 border-b border-primary-100 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`px-5 py-4 border-t border-primary-100 bg-primary-50/40 ${className}`}>{children}</div>;
}
