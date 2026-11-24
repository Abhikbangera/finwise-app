import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lightbulb } from 'lucide-react'
import ProgressBar from '../components/ProgressBar'
import { loadInsights } from '../lib/insights'
import { inr } from '../lib/format'

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const COLORS = { needs: '#3D6BFF', wants: '#FF7A59', savings: '#FFD84A' }

export default function Insights() {
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`)
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { setD(null); setError(''); loadInsights(month).then(setD).catch((e) => setError(e.message)) }, [month])

  const chart = d ? d.rows.filter((r) => r.amount > 0).slice(0, 8) : []
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="text-4xl sm:text-5xl">Financial Insights</h1>
        <input aria-label="Month" type="month" className="input !w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
      {error && <p role="alert" className="card font-black text-coral">{error}</p>}
      {!d && !error && <p>Loading…</p>}
      {d?.isEmpty && <div className="card max-w-xl space-y-3"><p className="font-black">No transactions in this month yet.</p><div className="flex gap-3"><Link to="/transactions" className="btn btn-blue">Add a transaction</Link><Link to="/accounts" className="btn">Import a statement</Link></div></div>}

      {d && !d.isEmpty && (<>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card"><p className="text-slate-500">Income</p><p className="text-3xl font-black">{inr(d.income)}</p></div>
          <div className="card"><p className="text-slate-500">Spent</p><p className="text-3xl font-black">{inr(d.expense)}</p></div>
          <div className="card"><p className="text-slate-500">Kept of your income</p><p className={`text-3xl font-black ${d.savingsRate < 0 ? 'text-coral' : ''}`}>{d.savingsRate == null ? '-' : `${d.savingsRate}%`}</p></div>
        </div>

        {d.observations.length > 0 && (
          <div className="card space-y-3"><h2 className="flex items-center gap-2 text-2xl"><Lightbulb size={22} />What stands out</h2>
            <ul className="space-y-2">{d.observations.map((o, i) => <li key={i} className="rounded-2xl bg-cloud px-4 py-2 font-black">{o}</li>)}</ul>
            <p className="text-sm text-slate-500">These come from simple rules on your own numbers, not from AI.</p></div>)}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card"><h2 className="text-2xl">Where the money went</h2>
            {chart.length === 0 ? <p className="mt-3 text-slate-600">No spending this month.</p> : (
              <div className="mt-4" style={{ height: chart.length * 44 + 30 }}><ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid horizontal={false} stroke="#e8ecf7" />
                  <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? v / 1000 + 'k' : v)} /><YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => inr(v)} /><Bar dataKey="amount" radius={8}>{chart.map((r) => <Cell key={r.name} fill="#3D6BFF" />)}</Bar></BarChart>
              </ResponsiveContainer></div>)}</div>

          <div className="card space-y-5"><h2 className="text-2xl">Plan vs. reality</h2>
            {d.baseLabel ? d.buckets.map((b) => (
              <div key={b.bucket}><div className="mb-1 flex justify-between font-black"><span className="capitalize">{b.bucket}</span><span>{Math.round(b.pct)}% of income · target {b.target}%</span></div>
                <ProgressBar value={b.pct} max={b.target || 1} color={COLORS[b.bucket]} /><p className="mt-1 text-sm text-slate-500">{inr(b.amount)} spent in this bucket</p></div>
            )) : <p className="text-slate-600">Log some income or set a budget to compare with your split.</p>}
            {d.baseLabel && <p className="text-sm text-slate-500">Percentages are of your {d.baseLabel}{d.usingDefaultSplit ? '. No budget this month, so the default 50:30:20 is used.' : '.'}</p>}</div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card overflow-x-auto"><h2 className="text-2xl">Compared with last month</h2>
            {!d.hasPrev ? <p className="mt-3 text-slate-600">No transactions last month to compare with.</p> : (
              <table className="mt-3 w-full min-w-[420px] text-left"><thead><tr className="text-slate-500"><th className="py-2">Category</th><th className="text-right">This month</th><th className="text-right">Last month</th><th className="text-right">Change</th></tr></thead>
                <tbody>{d.rows.map((r) => <tr key={r.name} className="border-t border-slate-100"><td className="py-2 font-black">{r.name}</td><td className="text-right">{inr(r.amount)}</td><td className="text-right">{inr(r.prev)}</td>
                  <td className={`text-right font-black ${r.delta > 0 ? 'text-coral' : r.delta < 0 ? 'text-emerald-600' : ''}`}>{r.delta > 0 ? '+' : r.delta < 0 ? '-' : ''}{inr(Math.abs(r.delta))}{r.deltaPct != null && ` (${r.deltaPct > 0 ? '+' : ''}${r.deltaPct}%)`}</td></tr>)}</tbody></table>)}</div>
          <div className="card overflow-x-auto"><h2 className="text-2xl">Biggest expenses</h2>
            {d.top.length === 0 ? <p className="mt-3 text-slate-600">No expenses this month.</p> : (
              <table className="mt-3 w-full min-w-[360px] text-left"><tbody>{d.top.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="py-2">{t.txn_date}</td><td className="max-w-[220px] truncate font-black" title={t.description}>{t.description || t.category}</td><td>{t.category}</td><td className="text-right font-black">{inr(t.amount)}</td></tr>)}</tbody></table>)}</div>
        </div>
      </>)}
    </div>
  )
}
