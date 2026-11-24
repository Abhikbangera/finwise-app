import { Bell } from 'lucide-react'
const TONE = { warning_80: 'bg-sun/40', limit_reached: 'bg-coral/20', over_budget: 'bg-coral/40' }
export default function AlertsPanel({ alerts, onReadAll }) {
  const unread = alerts.filter((a) => !a.is_read)
  if (!unread.length) return null
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-2xl"><Bell size={22} />Spending alerts</h2>
        <button className="font-black text-rain" onClick={onReadAll}>Mark all read</button></div>
      <ul className="space-y-2">{unread.map((a) => <li key={a.id} className={`rounded-2xl px-4 py-2 font-black ${TONE[a.alert_type]}`}>{a.message}</li>)}</ul>
    </div>
  )
}
