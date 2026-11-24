import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { BUCKETS, CATEGORIES, addTransaction, deleteTransaction, listTransactions, summarize, updateTransaction } from '../lib/transactions'
import { inr } from '../lib/format'
import { checkExpense } from '../lib/locks'
import { listAccounts } from '../lib/accounts'

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const thisMonth = () => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const today = () => `${thisMonth()}-${pad(d.getDate())}`
const blank = () => ({ type: 'expense', amount: '', txn_date: today(), description: '', category: 'Food & Dining', bucket: 'needs', account_id: '' })

export default function Transactions() {
  const [month, setMonth] = useState(thisMonth())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)   // null = closed
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setRows(await listTransactions(month)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [month])
  useEffect(() => { load() }, [load])
  const [accounts, setAccounts] = useState([])
  useEffect(() => { listAccounts().then(setAccounts).catch(() => {}) }, [])

  const totals = summarize(rows)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const openAdd = () => { setEditId(null); setForm(blank()) }
  const openEdit = (r) => { setEditId(r.id); setForm({ type: r.type, amount: String(r.amount), txn_date: r.txn_date, description: r.description ?? '', category: r.category, bucket: r.bucket ?? 'needs', account_id: r.account_id ?? '' }) }
  const close = () => { setForm(null); setEditId(null) }

  async function save(e) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!(amount > 0)) return setError('Amount must be more than zero.')
    const payload = { type: form.type, amount, txn_date: form.txn_date, description: form.description.trim() || null, category: form.category, bucket: form.type === 'expense' ? form.bucket : null, account_id: form.account_id || null }
    setSaving(true); setError('')
    try {
      if (payload.type === 'expense') {
        const chk = await checkExpense({ date: payload.txn_date, category: payload.category, amount, excludeId: editId })
        if (!chk.ok) { setError(chk.message); return }
      }
      editId ? await updateTransaction(editId, payload) : await addTransaction(payload); close(); await load()
    }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  async function remove(id) {
    if (!confirm('Delete this transaction?')) return
    try { await deleteTransaction(id); await load() } catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Transactions</h1>
        <div className="flex items-center gap-3">
          <input aria-label="Month" type="month" className="input !w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="btn btn-blue flex items-center gap-2" onClick={openAdd}><Plus size={18} />Add</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-slate-500">Income</p><p className="text-3xl font-black">{inr(totals.income)}</p></div>
        <div className="card"><p className="text-slate-500">Expenses</p><p className="text-3xl font-black">{inr(totals.expense)}</p></div>
        <div className="card"><p className="text-slate-500">Net</p><p className={`text-3xl font-black ${totals.net < 0 ? 'text-coral' : ''}`}>{inr(totals.net)}</p></div>
      </div>

      {error && <p role="alert" className="card font-black text-coral">{error}</p>}

      {form && (
        <form onSubmit={save} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-3">
            <h2 className="text-2xl">{editId ? 'Edit transaction' : 'New transaction'}</h2>
            <button type="button" aria-label="Close form" onClick={close}><X /></button>
          </div>
          <label className="font-black">Type
            <select className="input mt-1" value={form.type} onChange={set('type')}><option value="expense">Expense</option><option value="income">Income</option></select></label>
          <label className="font-black">Amount (₹)
            <input className="input mt-1" type="number" step="0.01" min="0.01" required value={form.amount} onChange={set('amount')} /></label>
          <label className="font-black">Date
            <input className="input mt-1" type="date" required value={form.txn_date} onChange={set('txn_date')} /></label>
          <label className="font-black">Description
            <input className="input mt-1" maxLength={200} value={form.description} onChange={set('description')} /></label>
          <label className="font-black">Category
            <select className="input mt-1" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          {form.type === 'expense' && (
            <label className="font-black">Budget bucket
              <select className="input mt-1" value={form.bucket} onChange={set('bucket')}>{BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
          )}
          {accounts.length > 0 && (
            <label className="font-black">Account (optional)
              <select className="input mt-1" value={form.account_id} onChange={set('account_id')}><option value="">None</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          )}
          <div className="sm:col-span-2 lg:col-span-3"><button className="btn btn-blue" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Add transaction'}</button></div>
        </form>
      )}

      <div className="card overflow-x-auto">
        {loading ? <p>Loading…</p> : rows.length === 0 ? <p className="font-black">No transactions in this month yet. Tap Add to log one.</p> : (
          <table className="w-full min-w-[640px] text-left">
            <thead><tr className="text-slate-500"><th className="py-2">Date</th><th>Description</th><th>Category</th><th>Bucket</th><th className="text-right">Amount</th><th className="w-24"></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-3">{r.txn_date}</td><td className="font-black">{r.description || '-'}</td><td>{r.category}</td>
                <td className="capitalize">{r.bucket || '-'}</td>
                <td className={`text-right font-black ${r.type === 'income' ? 'text-emerald-600' : ''}`}>{r.type === 'income' ? '+' : '-'}{inr(r.amount)}</td>
                <td className="text-right"><button aria-label="Edit" className="p-2" onClick={() => openEdit(r)}><Pencil size={18} /></button><button aria-label="Delete" className="p-2 text-coral" onClick={() => remove(r.id)}><Trash2 size={18} /></button></td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}