const ICONS: Record<string, string> = {
  leads: "◇",
  visitors: "◎",
  sessions: "▣",
  started: "▸",
  completed: "✓",
  rate: "%",
  inactive: "◌",
  whatsapp: "✆",
  contact: "✉",
};

export function KpiCard({
  label,
  value,
  icon = "leads",
}: {
  label: string;
  value: string | number;
  icon?: keyof typeof ICONS | string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" aria-hidden>
          {ICONS[icon] || ICONS.leads}
        </span>
      </div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
