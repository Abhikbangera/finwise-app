import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import CsvImport from '../components/CsvImport'
import { ACCOUNT_TYPES, addAccount, deleteAccount, listAccounts, updateAccount } from '../lib/accounts'
import { inr } from '../lib/format'

const blank = { name: '', bank_name: '', account_type: 'savings', last4: '', balance: '' }
const typeLabel = (v) => ACCOUNT_TYPES.find((t) => t.value === v)?.label ?? v

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try { setAccounts(await listAccounts()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault(); setError('')
    if (form.last4 && !/^\d{4}$/.test(form.last4)) return setError('Enter exactly 4 digits, or leave it blank. Never enter a full account number.')
    const payload = { name: form.name.trim(), bank_name: form.bank_name.trim() || null, account_type: form.account_type, last4: form.last4 || null, balance: Number(form.balance || 0) }
    setSaving(true)
    try { editId ? await updateAccount(editId, payload) : await addAccount(payload); setForm(null); setEditId(null); await load() }
    catch (x) { setError(x.message) } finally { setSaving(false) }
  }
  async function remove(a) {
    if (!confirm(`Delete ${a.name}? Its transactions stay, but are no longer linked to it.`)) return
    try { await deleteAccount(a.id); await load() } catch (x) { setError(x.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="text-4xl sm:text-5xl">Bank Accounts</h1>
        <button className="btn btn-blue flex items-center gap-2" onClick={() => { setEditId(null); setForm({ ...blank }) }}><Plus size={18} />Add account</button></div>
      {error && <p role="alert" className="card font-black text-coral">{error}</p>}

      {form && (
        <form onSubmit={save} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-3"><h2 className="text-2xl">{editId ? 'Edit account' : 'New account'}</h2><button type="button" aria-label="Close" onClick={() => { setForm(null); setEditId(null) }}><X /></button></div>
          <label className="font-black">Nickname<input className="input mt-1" required maxLength={80} value={form.name} onChange={set('name')} /></label>
          <label className="font-black">Bank (optional)<input className="input mt-1" maxLength={80} value={form.bank_name} onChange={set('bank_name')} /></label>
          <label className="font-black">Type<select className="input mt-1" value={form.account_type} onChange={set('account_type')}>{ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label className="font-black">Last 4 digits (optional)<input className="input mt-1" inputMode="numeric" maxLength={4} pattern="\d{4}" title="4 digits" value={form.last4} onChange={set('last4')} /></label>
          <label className="font-black">Balance you track (₹)<input className="input mt-1" type="number" step="0.01" value={form.balance} onChange={set('balance')} /></label>
          <p className="text-sm text-slate-500 sm:col-span-2 lg:col-span-3">FinWise stores only the last 4 digits. The balance is a number you keep up to date yourself.</p>
          <div className="sm:col-span-2 lg:col-span-3"><button className="btn btn-blue" disabled={saving}>{saving ? 'Saving…' : 'Save account'}</button></div>
        </form>)}

      {loading ? <p>Loading…</p> : accounts.length === 0 ? <p className="card font-black">No accounts yet. Add one, or import a statement without linking an account.</p> : (
        <div className="grid gap-4 md:grid-cols-2">{accounts.map((a) => (
          <div key={a.id} className="card space-y-1">
            <div className="flex items-center justify-between font-black"><span>{a.name}</span>
              <span><button aria-label={`Edit ${a.name}`} className="p-2" onClick={() => { setEditId(a.id); setForm({ name: a.name, bank_name: a.bank_name ?? '', account_type: a.account_type, last4: a.last4 ?? '', balance: String(a.balance) }) }}><Pencil size={18} /></button>
                <button aria-label={`Delete ${a.name}`} className="p-2 text-coral" onClick={() => remove(a)}><Trash2 size={18} /></button></span></div>
            <p className="text-slate-600">{[a.bank_name, typeLabel(a.account_type), a.last4 && `•••• ${a.last4}`].filter(Boolean).join(' · ')}</p>
            <p className="text-3xl font-black tracking-tight">{inr(a.balance)}</p>
          </div>))}</div>)}

      <CsvImport accounts={accounts} />
    </div>
  )
}
