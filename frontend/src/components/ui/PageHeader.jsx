export default function PageHeader({ icon, title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-title">{icon} {title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}
