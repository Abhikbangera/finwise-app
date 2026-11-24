import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function AuthForm({ mode }) {
  const signup = mode === 'signup'
  const { user, configured, signIn, signUp } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true)
    const { data, error } = signup ? await signUp(f.email, f.password, f.name) : await signIn(f.email, f.password)
    setBusy(false)
    if (error) return setErr(error.message)
    if (signup && !data.session) setInfo('Check your email to confirm your account, then log in.')
    else nav('/')
  }
  return (
    <div className="grid min-h-screen place-items-center bg-rain p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-8">
        <div className="text-3xl font-black tracking-tighter">FinWise</div>
        <h1 className="text-4xl">{signup ? 'Create your account' : 'Welcome back'}</h1>
        {!configured && <p className="rounded-2xl bg-sun/40 p-3 text-sm font-black">Supabase is not set up yet. Copy .env.example to .env and add your project URL and anon key, then restart the dev server.</p>}
        {signup && <input className="input" placeholder="Your name" value={f.name} onChange={set('name')} required />}
        <input className="input" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input className="input" type="password" placeholder="Password (6+ characters)" minLength={6} value={f.password} onChange={set('password')} required />
        {err && <p role="alert" className="font-black text-coral">{err}</p>}
        {info && <p className="font-black text-rain">{info}</p>}
        <button className="btn btn-blue w-full" disabled={busy || !configured}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button>
        <p className="text-center">{signup ? 'Already have an account?' : 'New here?'} <Link className="font-black text-rain" to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create an account'}</Link></p>
      </form>
    </div>
  )
}
