import { useState } from 'react'
import { decideOverride, requestOverride } from '../lib/overrides'
import { inr } from '../lib/format'

export default function OverridePanel({ budgetId, cats, requests, onAction }) {
  const locked = cats.filter((c) => c.locked)
  const [f, setF] = useState({ category_name: '', amount: '', reason: '' })
  const pending = requests.filter((r) => r.status === 'pending')
  const decided = requests.filter((r) => r.status !== 'pending').slice(0, 5)
  if (!locked.length && !requests.length) return null
  const name = f.category_name || locked[0]?.name
  const send = async (e) => {
    e.preventDefault()
    if (!(Number(f.amount) > 0)) return
    if (await onAction(() => requestOverride(budgetId, { category_name: name, amount: Number(f.amount), reason: f.reason.trim() }))) setF({ category_name: '', amount: '', reason: '' })
  }
  const decide = (r, status) => {
    if (status === 'approved' && !confirm(`Approve ${inr(r.amount)} extra for ${r.category_name}? This raises its limit.`)) return
    onAction(() => decideOverride(r.id, status))
  }
  return (
    <section className="card space-y-4">
      <h2 className="text-2xl">Exceptions</h2>
      {locked.length > 0 && (
        <form onSubmit={send} className="grid gap-3 sm:grid-cols-4">
          <label className="font-black">Locked category<select className="input mt-1" value={name} onChange={(e) => setF({ ...f, category_name: e.target.value })}>{locked.map((c) => <option key={c.id}>{c.name}</option>)}</select></label>
          <label className="font-black">Extra room (₹)<input className="input mt-1" type="number" min="0.01" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
          <label className="font-black sm:col-span-2">Why do you need it?<input className="input mt-1" maxLength={500} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
          <div className="sm:col-span-4"><button className="btn btn-blue">Request exception</button></div>
        </form>)}
      {pending.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cloud p-3">
          <p><b>{r.category_name}</b>: {inr(r.amount)} extra{r.reason && <span className="text-slate-600"> · {r.reason}</span>}</p>
          <div className="flex gap-2"><button className="btn btn-blue !px-4 !py-2" onClick={() => decide(r, 'approved')}>Approve</button>
            <button className="btn !bg-slate-200 !px-4 !py-2 !shadow-[0_5px_0_#b9c4e6]" onClick={() => decide(r, 'rejected')}>Reject</button></div>
        </div>))}
      {decided.length > 0 && <ul className="text-slate-600">{decided.map((r) => <li key={r.id}>{r.category_name}: {inr(r.amount)} · {r.status}</li>)}</ul>}
    </section>
  )
}
