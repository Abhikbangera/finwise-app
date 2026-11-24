import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lock } from 'lucide-react'
import ProgressBar from '../components/ProgressBar'
import { loadDashboard } from '../lib/dashboard'
import { inr } from '../lib/format'

const COLORS = { needs: '#3D6BFF', wants: '#FF7A59', savings: '#FFD84A' }
const monthName = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) }

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { loadDashboard().then(setD).catch((e) => setError(e.message)) }, [])

  if (error) return <p role="alert" className="card font-black text-coral">{error}</p>
  if (!d) return <p>Loading…</p>
  if (d.isEmpty) return (
    <div className="space-y-4"><h1 className="text-4xl sm:text-5xl">Dashboard</h1>
      <div className="card max-w-xl space-y-3"><p className="text-2xl font-black">Welcome to FinWise</p>
        <p className="text-slate-600">Your numbers will show up here. Start by setting a budget, or log your first transaction.</p>
        <div className="flex flex-wrap gap-3"><Link to="/budgets" className="btn btn-blue">Set up a budget</Link><Link to="/transactions" className="btn">Add a transaction</Link></div></div></div>)

  const stats = [['Income this month', d.income], ['Spent this month', d.expense], ['Net', d.net]]
  const split = d.buckets.map((b) => ({ name: b.bucket, value: b.allocated }))
  return (
    <div className="space-y-6">
      <div><h1 className="text-4xl sm:text-5xl">Dashboard</h1><p className="text-slate-600">{monthName(d.month)}</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([l, v]) => <div key={l} className="card"><p className="text-slate-500">{l}</p><p className={`text-3xl font-black tracking-tight ${l === 'Net' && v < 0 ? 'text-coral' : ''}`}>{inr(v)}</p></div>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2"><h2 className="text-2xl">Last 6 months</h2>
          <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.trend}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3D6BFF" stopOpacity=".5" /><stop offset="100%" stopColor="#3D6BFF" stopOpacity="0" /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#e8ecf7" /><XAxis dataKey="m" axisLine={false} tickLine={false} /><YAxis width={56} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? v / 1000 + 'k' : v)} />
              <Tooltip formatter={(v) => inr(v)} /><Area name="Income" dataKey="income" stroke="#e3ae15" strokeWidth={3} fill="none" /><Area name="Spent" dataKey="spent" stroke="#3D6BFF" strokeWidth={3} fill="url(#g)" /></AreaChart>
          </ResponsiveContainer></div>
          <p className="mt-2 text-sm text-slate-500"><span className="font-black text-rain">Blue</span> is spending, <span className="font-black text-[#c99a0a]">gold</span> is income.</p></div>
        <div className="card"><h2 className="text-2xl">Your split</h2>
          {d.hasBudget && d.plannedIncome > 0 ? (
            <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={split} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>{split.map((s) => <Cell key={s.name} fill={COLORS[s.name]} />)}</Pie><Tooltip formatter={(v) => inr(v)} /></PieChart></ResponsiveContainer></div>
          ) : <p className="mt-3 text-slate-600">Set a budget with your monthly income to see your split. <Link className="font-black text-rain" to="/budgets">Open Budgets</Link></p>}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card space-y-5"><h2 className="text-2xl">Budget progress</h2>
          {!d.hasBudget ? <p className="text-slate-600">No budget for this month yet. <Link className="font-black text-rain" to="/budgets">Set one up</Link></p> : (<>
            {d.buckets.map((b) => (
              <div key={b.bucket}><div className="mb-1 flex justify-between font-black"><span className="capitalize">{b.bucket} {b.pct}%</span><span>{inr(b.spent)} / {inr(b.allocated)}</span></div>
                <ProgressBar value={b.spent} max={b.allocated || 1} color={COLORS[b.bucket]} /></div>))}
            {d.cats.length > 0 && <div className="space-y-3 border-t border-slate-100 pt-4">{d.cats.map((c) => (
              <div key={c.id}><div className="mb-1 flex justify-between"><span className="flex items-center gap-2 font-black">{c.name}{c.locked && <Lock size={15} className="text-coral" aria-label="Locked" />}</span><span>{inr(c.spent)} / {inr(c.limit)}</span></div>
                <ProgressBar value={c.spent} max={c.limit || 1} color={COLORS[c.bucket]} /></div>))}</div>}
          </>)}</div>

        <div className="space-y-4">
          <div className="card"><h2 className="text-2xl">Recent transactions</h2>
            {d.recent.length === 0 ? <p className="mt-3 text-slate-600">Nothing logged this month yet. <Link className="font-black text-rain" to="/transactions">Add one</Link></p> : (
              <div className="mt-3 overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-500"><th className="py-2">Date</th><th>Name</th><th>Category</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{d.recent.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="py-3">{t.txn_date}</td><td className="font-black">{t.description || '-'}</td><td>{t.category}</td>
                  <td className={`text-right font-black ${t.type === 'income' ? 'text-emerald-600' : ''}`}>{t.type === 'income' ? '+' : '-'}{inr(t.amount)}</td></tr>)}</tbody></table></div>)}</div>
          <div className="card"><h2 className="text-2xl">Savings goals</h2>
            {d.goals.activeCount === 0 ? <p className="mt-3 text-slate-600">No active goals. <Link className="font-black text-rain" to="/budgets">Add one</Link></p> : (<div className="mt-3 space-y-2"><p className="font-black">{inr(d.goals.saved)} saved of {inr(d.goals.target)} across {d.goals.activeCount} active {d.goals.activeCount === 1 ? 'goal' : 'goals'}</p><ProgressBar value={d.goals.saved} max={d.goals.target || 1} color="#FFD84A" /></div>)}</div>
        </div>
      </div>
    </div>
  )
}
