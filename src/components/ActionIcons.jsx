export default function ActionIcons({ buttons, size = 14, className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 no-export ${className}`}>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          disabled={btn.disabled}
          title={btn.count > 0 ? `${btn.label} (${btn.count})` : btn.label}
          aria-label={btn.count > 0 ? `${btn.label} (${btn.count})` : btn.label}
          className={`btn-icon btn-action-${btn.color || "blue"}${btn.active ? " btn-icon-active" : ""}`}
        >
          <btn.icon size={size} strokeWidth={2} />
          {btn.count > 0 && <span className="btn-icon-badge">{btn.count}</span>}
        </button>
      ))}
    </div>
  );
}
