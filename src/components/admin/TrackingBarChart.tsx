type BarRow = { label: string; value: number; valueLabel?: string; detail?: string };
export function TrackingBarChart({ title, description, rows, tone = "blue", hasData }: { title: string; description: string; rows: BarRow[]; tone?: "blue" | "purple" | "orange"; hasData?: boolean }) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  return <section className="panel tracking-chart" aria-label={title}>
    <div className="panel-head"><h2 className="panel-title">{title}</h2></div>
    <p className="muted">{description}</p>
    {!(hasData ?? max > 0) ? <p className="muted tracking-chart-empty">Ainda não há dados registados para este gráfico.</p> :
      <div className="tracking-chart-rows">{rows.map((row, index) => <div className="tracking-chart-row" key={`${index}-${row.label}`}>
        <div className="tracking-chart-label"><span>{row.label}</span><strong>{row.valueLabel ?? row.value}</strong></div>
        <div className="tracking-chart-track" aria-hidden="true"><div className={`tracking-chart-fill ${tone}`} style={{ width: `${max ? row.value / max * 100 : 0}%` }} /></div>
        {row.detail && <small className="muted">{row.detail}</small>}
      </div>)}</div>}
  </section>;
}

