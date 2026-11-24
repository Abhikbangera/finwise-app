import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import ProgressBar from './ProgressBar'
import { addGoal, contribute, deleteGoal, listGoals } from '../lib/goals'
import { goalProgress } from '../lib/goalMath'
import { inr } from '../lib/format'

const blank = { name: '', target_amount: '', saved_amount: '', target_date: '' }

export default function GoalsPanel() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [adding, setAdding] = useState({})   // goal id -> amount typed
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setGoals(await listGoals()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn) => { setBusy(true); setError(''); try { await fn(); await load(); return true } catch (e) { setError(e.message); return false } finally { setBusy(false) } }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    const target = Number(form.target_amount), saved = Number(form.saved_amount || 0)
    if (!(target > 0)) return setError('The target must be more than zero.')
    if (saved < 0) return setError('Saved amount cannot be negative.')
    const g = { name: form.name.trim(), target_amount: target, saved_amount: saved, target_date: form.target_date || null, status: saved >= target ? 'completed' : 'active' }
    if (await run(() => addGoal(g))) setForm(null)
  }
  async function addMoney(goal) {
    const amt = Number(adding[goal.id])
    if (!(amt > 0)) return setError('Enter an amount above zero.')
    if (await run(() => contribute(goal, amt))) setAdding({ ...adding, [goal.id]: '' })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-3xl">Savings goals</h2>
        <button className="btn btn-blue flex items-center gap-2" onClick={() => setForm({ ...blank })}><Plus size={18} />New goal</button></div>
      {error && <p role="alert" className="card font-black text-coral">{error}</p>}

      {form && (
        <form onSubmit={submit} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-4"><h3 className="text-2xl">New goal</h3><button type="button" aria-label="Close" onClick={() => setForm(null)}><X /></button></div>
          <label className="font-black">Goal name<input className="input mt-1" required maxLength={80} value={form.name} onChange={set('name')} /></label>
          <label className="font-black">Target (₹)<input className="input mt-1" type="number" min="0.01" step="0.01" required value={form.target_amount} onChange={set('target_amount')} /></label>
          <label className="font-black">Saved so far (₹)<input className="input mt-1" type="number" min="0" step="0.01" value={form.saved_amount} onChange={set('saved_amount')} /></label>
          <label className="font-black">Target date (optional)<input className="input mt-1" type="date" value={form.target_date} onChange={set('target_date')} /></label>
          <div className="sm:col-span-2 lg:col-span-4"><button className="btn btn-blue" disabled={busy}>{busy ? 'Saving…' : 'Save goal'}</button></div>
        </form>
      )}

      {loading ? <p>Loading…</p> : goals.length === 0 ? <p className="card font-black">No goals yet. Add one, like an emergency fund or a trip.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => { const p = goalProgress(g); return (
            <div key={g.id} className="card space-y-3">
              <div className="flex items-center justify-between font-black"><span className="flex items-center gap-2">{g.name}{p.done && <CheckCircle2 size={18} className="text-emerald-600" aria-label="Completed" />}</span>
                <button aria-label={`Delete ${g.name}`} className="p-1 text-coral" onClick={() => confirm(`Delete ${g.name}?`) && run(() => deleteGoal(g.id))}><Trash2 size={18} /></button></div>
              <ProgressBar value={p.saved} max={p.target} color="#FFD84A" />
              <p className="text-slate-600">{inr(p.saved)} of {inr(p.target)} · {p.pct}%{g.target_date && ` · by ${g.target_date}`}</p>
              {p.perMonth && <p className="font-black">Save about {inr(p.perMonth)} a month to get there.</p>}
              {!p.done && (
                <div className="flex gap-2"><input aria-label={`Add money to ${g.name}`} className="input" type="number" min="0.01" step="0.01" placeholder="Add ₹" value={adding[g.id] ?? ''} onChange={(e) => setAdding({ ...adding, [g.id]: e.target.value })} />
                  <button className="btn btn-blue !px-4" disabled={busy} onClick={() => addMoney(g)}>Add</button></div>)}
            </div>) })}
        </div>)}
    </section>
  )
}
