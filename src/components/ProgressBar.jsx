export default function ProgressBar({ value, max, color = '#3D6BFF' }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: pct >= 100 ? '#FF7A59' : color }} />
    </div>
  )
}
