// Pure goal calculations. perMonth = how much to save each month to hit the target date.
export function goalProgress(g, today = new Date()) {
  const target = Number(g.target_amount), saved = Number(g.saved_amount)
  const remaining = Math.max(0, Math.round((target - saved) * 100) / 100)
  const pct = target > 0 ? Math.min(100, Math.floor((saved / target) * 100)) : 0
  let perMonth = null
  if (g.target_date && remaining > 0) {
    const t = new Date(g.target_date + 'T00:00:00')
    const months = (t.getFullYear() - today.getFullYear()) * 12 + (t.getMonth() - today.getMonth())
    perMonth = months >= 1 ? Math.ceil(remaining / months) : null
  }
  return { target, saved, remaining, pct, done: saved >= target, perMonth }
}
