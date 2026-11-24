import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { changePassword, getProfile, updateProfile } from '../lib/profile'
import { toPayload, validatePassword, validateProfile } from '../lib/profileMath'

export default function Settings() {
  const { user, signOut } = useAuth()
  const [f, setF] = useState(null)
  const [missing, setMissing] = useState(false)
  const [msg, setMsg] = useState({ profile: '', password: '' })
  const [err, setErr] = useState({ profile: '', password: '' })
  const [busy, setBusy] = useState('')
  const [pw, setPw] = useState({ next: '', confirm: '' })

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return setMissing(true)
      setF({ full_name: p.full_name ?? '', monthly_income: String(p.monthly_income), needs_pct: String(p.needs_pct), wants_pct: String(p.wants_pct), savings_pct: String(p.savings_pct) })
    }).catch((e) => setErr((x) => ({ ...x, profile: e.message })))
  }, [])

  const note = (k, ok, bad) => { setMsg((m) => ({ ...m, [k]: ok || '' })); setErr((e) => ({ ...e, [k]: bad || '' })) }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function saveProfile(e) {
    e.preventDefault(); note('profile')
    const bad = validateProfile(f)
    if (bad) return note('profile', '', bad)
    setBusy('profile')
    try { await updateProfile(user.id, toPayload(f)); note('profile', 'Saved.') } catch (x) { note('profile', '', x.message) } finally { setBusy('') }
  }
  async function savePassword(e) {
    e.preventDefault(); note('password')
    const bad = validatePassword(pw.next, pw.confirm)
    if (bad) return note('password', '', bad)
    setBusy('password')
    try { await changePassword(pw.next); setPw({ next: '', confirm: '' }); note('password', 'Password changed.') } catch (x) { note('password', '', x.message) } finally { setBusy('') }
  }
  const Status = ({ k }) => (<>{err[k] && <p role="alert" className="font-black text-coral">{err[k]}</p>}{msg[k] && <p className="font-black text-emerald-600">{msg[k]}</p>}</>)

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-4xl sm:text-5xl">Profile and Settings</h1>

      {missing ? <p className="card font-black text-coral">Your profile row was not found. Run the module 1 migration again, or tell me and I will help.</p> : !f ? <p>Loading…</p> : (
        <form onSubmit={saveProfile} className="card grid gap-4 sm:grid-cols-2">
          <h2 className="text-2xl sm:col-span-2">Your profile</h2>
          <label className="font-black sm:col-span-2">Email<input className="input mt-1 bg-slate-50" value={user?.email ?? ''} disabled /></label>
          <label className="font-black sm:col-span-2">Name<input className="input mt-1" maxLength={80} value={f.full_name} onChange={set('full_name')} /></label>
          <label className="font-black sm:col-span-2">Usual monthly income (₹)<input className="input mt-1" type="number" min="0" step="0.01" value={f.monthly_income} onChange={set('monthly_income')} /></label>
          <p className="text-slate-600 sm:col-span-2">Your default split. New monthly budgets start from this. Budgets you already created keep their own split.</p>
          {[['needs_pct', 'Needs %'], ['wants_pct', 'Wants %'], ['savings_pct', 'Savings %']].map(([k, l]) => (
            <label key={k} className="font-black">{l}<input className="input mt-1" type="number" min="0" max="100" step="1" value={f[k]} onChange={set(k)} /></label>))}
          <div className="space-y-2 sm:col-span-2"><Status k="profile" /><button className="btn btn-blue" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></div>
        </form>)}

      <form onSubmit={savePassword} className="card grid gap-4 sm:grid-cols-2">
        <h2 className="text-2xl sm:col-span-2">Change password</h2>
        <label className="font-black">New password<input className="input mt-1" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
        <label className="font-black">Confirm it<input className="input mt-1" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></label>
        <div className="space-y-2 sm:col-span-2"><Status k="password" /><button className="btn btn-blue" disabled={busy === 'password'}>{busy === 'password' ? 'Saving…' : 'Change password'}</button></div>
      </form>

      <div className="card"><button onClick={signOut} className="flex items-center gap-2 font-black"><LogOut size={20} />Log out</button></div>
    </div>
  )
}
