import { useCallback, useEffect, useState } from 'react'
import { Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import ProgressBar from '../components/ProgressBar'
import GoalsPanel from '../components/GoalsPanel'
import AlertsPanel from '../components/AlertsPanel'
import OverridePanel from '../components/OverridePanel'
import { listOverrides } from '../lib/overrides'
import { listAlerts, markAllRead, syncAlerts } from '../lib/alerts'
import { addCategory, deleteCategory, getBudget, getProfile, listCategories, saveBudget, updateCategory } from '../lib/budgets'
import { alertsFor, computeProgress } from '../lib/budgetMath'
import { BUCKETS, CATEGORIES, listTransactions } from '../lib/transactions'
import { inr } from '../lib/format'

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const COLORS = { needs: '#3D6BFF', wants: '#FF7A59', savings: '#FFD84A' }
const label = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) }

export default function Budgets() {
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`)
  const [profile, setProfile] = useState(null)
  const [budget, setBudget] = useState(null)
  const [cats, setCats] = useState([])
  const [txns, setTxns] = useState([])
  const [overrides, setOverrides] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bf, setBf] = useState(null)        // budget form
  const [cf, setCf] = useState(null)        // category form
  const [editCat, setEditCat] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [p, b] = await Promise.all([getProfile(), getBudget(month)])
      setProfile(p); setBudget(b)
      if (b) {
        const [c, t, ov] = await Promise.all([listCategories(b.id), listTransactions(month), listOverrides(b.id)])
        setCats(c); setTxns(t); setOverrides(ov)
        try { await syncAlerts(b.id, alertsFor(computeProgress(b, c, t, ov).cats)); setAlerts(await listAlerts(b.id)) } catch { /* alerts are non-critical */ }
      } else { setCats([]); setTxns([]); setOverrides([]); setAlerts([]) }
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [month])
  useEffect(() => { load() }, [load])

  const run = async (fn) => { setSaving(true); setError(''); try { await fn(); await load(); return true } catch (e) { setError(e.message); return false } finally { setSaving(false) } }

  const openBudgetForm = () => setBf({
    income: String(budget?.income ?? profile?.monthly_income ?? 0),
    needs_pct: String(budget?.needs_pct ?? profile?.needs_pct ?? 50),
    wants_pct: String(budget?.wants_pct ?? profile?.wants_pct ?? 30),
    savings_pct: String(budget?.savings_pct ?? profile?.savings_pct ?? 20),
  })
  async function submitBudget(e) {
    e.preventDefault()
    const v = { income: Number(bf.income), needs_pct: Number(bf.needs_pct), wants_pct: Number(bf.wants_pct), savings_pct: Number(bf.savings_pct) }
    if (!(v.income >= 0)) return setError('Income cannot be negative.')
    if (v.needs_pct + v.wants_pct + v.savings_pct !== 100) return setError('The three percentages must add up to 100.')
    if (await run(() => saveBudget(month, v, budget?.id))) setBf(null)
  }
  async function submitCat(e) {
    e.preventDefault()
    const c = { name: cf.name, bucket: cf.bucket, limit_amount: Number(cf.limit_amount) }
    if (!(c.limit_amount >= 0)) return setError('The limit cannot be negative.')
    if (await run(() => (editCat ? updateCategory(editCat, c) : addCategory(budget.id, c)))) { setCf(null); setEditCat(null) }
  }

  const p = budget ? computeProgress(budget, cats, txns, overrides) : null
  const freeNames = CATEGORIES.filter((n) => !cats.some((c) => c.name === n))
  const sf = (setter, f) => (k) => (e) => setter({ ...f, [k]: e.target.value })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Budgets</h1>
        <input aria-label="Month" type="month" className="input !w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      {error && <p role="alert" className="card font-black text-coral">{error}</p>}

      {bf && (
        <form onSubmit={submitBudget} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-4"><h2 className="text-2xl">{budget ? 'Edit' : 'Set up'} budget for {label(month)}</h2><button type="button" aria-label="Close" onClick={() => setBf(null)}><X /></button></div>
          {[['income', 'Monthly income (₹)'], ['needs_pct', 'Needs %'], ['wants_pct', 'Wants %'], ['savings_pct', 'Savings %']].map(([k, l]) => (
            <label key={k} className="font-black">{l}<input className="input mt-1" type="number" min="0" step={k === 'income' ? '0.01' : '1'} required value={bf[k]} onChange={sf(setBf, bf)(k)} /></label>))}
          <div className="sm:col-span-2 lg:col-span-4"><button className="btn btn-blue" disabled={saving}>{saving ? 'Saving…' : 'Save budget'}</button></div>
        </form>
      )}

      {loading ? <p>Loading…</p> : !budget ? (
        !bf && <div className="card max-w-xl space-y-3"><p className="font-black">No budget for {label(month)} yet.</p><p className="text-slate-600">Set your income and split it 50:30:20, or change the split to suit you.</p><button className="btn btn-blue" onClick={openBudgetForm}>Set up budget</button></div>
      ) : (
        <>
          <div className="flex items-center justify-between"><p className="font-black">Income {inr(budget.income)} · split {budget.needs_pct}:{budget.wants_pct}:{budget.savings_pct}</p><button className="btn btn-blue !px-4 !py-2" onClick={openBudgetForm}>Edit</button></div>
          <AlertsPanel alerts={alerts} onReadAll={() => run(() => markAllRead(budget.id))} />
          <div className="grid gap-4 md:grid-cols-3">
            {p.buckets.map((b) => (
              <div key={b.bucket} className="card space-y-2"><div className="flex justify-between font-black capitalize"><span>{b.bucket} {b.pct}%</span><span>{inr(b.spent)} / {inr(b.allocated)}</span></div>
                <ProgressBar value={b.spent} max={b.allocated || 1} color={COLORS[b.bucket]} />
                <p className={b.over ? 'font-black text-coral' : 'text-slate-500'}>{b.over ? `${inr(-b.left)} over` : `${inr(b.left)} left`}</p></div>))}
          </div>

          <div className="flex items-center justify-between"><h2 className="text-3xl">Categories</h2>
            {freeNames.length > 0 && <button className="btn btn-blue flex items-center gap-2" onClick={() => { setEditCat(null); setCf({ name: freeNames[0], bucket: 'needs', limit_amount: '' }) }}><Plus size={18} />Add category</button>}</div>

          {cf && (
            <form onSubmit={submitCat} className="card grid gap-4 sm:grid-cols-3">
              <label className="font-black">Category<select className="input mt-1" disabled={!!editCat} value={cf.name} onChange={sf(setCf, cf)('name')}>{(editCat ? [cf.name] : freeNames).map((n) => <option key={n}>{n}</option>)}</select></label>
              <label className="font-black">Bucket<select className="input mt-1" value={cf.bucket} onChange={sf(setCf, cf)('bucket')}>{BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
              <label className="font-black">Monthly limit (₹)<input className="input mt-1" type="number" min="0" step="0.01" required value={cf.limit_amount} onChange={sf(setCf, cf)('limit_amount')} /></label>
              <div className="flex gap-3 sm:col-span-3"><button className="btn btn-blue" disabled={saving}>{saving ? 'Saving…' : 'Save category'}</button><button type="button" className="btn btn-blue !bg-slate-200 !text-ink !shadow-[0_5px_0_#b9c4e6]" onClick={() => { setCf(null); setEditCat(null) }}>Cancel</button></div>
            </form>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {p.cats.length === 0 && <p className="card font-black md:col-span-2">No categories yet. Add one to set a spending limit.</p>}
            {p.cats.map((c) => (
              <div key={c.id} className="card space-y-2">
                <div className="flex items-center justify-between font-black"><span className="flex items-center gap-2">{c.name}{c.locked && <Lock size={16} className="text-coral" aria-label="Locked" />}<span className="text-sm font-normal capitalize text-slate-500">{c.bucket}</span></span>
                  <span className="flex items-center"><button aria-label={`Edit ${c.name}`} className="p-2" onClick={() => { setEditCat(c.id); setCf({ name: c.name, bucket: c.bucket, limit_amount: String(c.limit_amount) }) }}><Pencil size={18} /></button>
                    <button aria-label={`Delete ${c.name}`} className="p-2 text-coral" onClick={() => confirm(`Delete ${c.name}?`) && run(() => deleteCategory(c.id))}><Trash2 size={18} /></button></span></div>
                <ProgressBar value={c.spent} max={c.limit || 1} color={COLORS[c.bucket]} />
                <p className={c.locked ? 'font-black text-coral' : 'text-slate-500'}>{inr(c.spent)} of {inr(c.limit)}{c.extra > 0 && ` (includes ${inr(c.extra)} approved)`} · {c.locked ? 'Locked, limit reached' : `${inr(c.left)} left`}</p>
              </div>))}
          </div>
          <OverridePanel budgetId={budget.id} cats={p.cats} requests={overrides} onAction={run} />
          {p.unbudgeted > 0 && <p className="text-slate-600">{inr(p.unbudgeted)} of spending is in categories without a limit.</p>}
        </>
      )}

      <GoalsPanel />
    </div>
  )
}
