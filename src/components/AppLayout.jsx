import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Landmark, Lightbulb, Bot, Settings, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/accounts', label: 'Bank Accounts', icon: Landmark },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/settings', label: 'Settings', icon: Settings },
]
export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()
  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 font-black ${isActive ? 'bg-rain text-white' : 'text-ink hover:bg-cloud'}`}>
          <Icon size={20} />{label}
        </NavLink>
      ))}
      <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-black hover:bg-cloud"><LogOut size={20} />Log out</button>
    </nav>
  )
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 bg-white p-5 lg:flex">
        <div className="px-2 text-3xl font-black tracking-tighter">FinWise</div>{nav}
      </aside>
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 lg:hidden">
        <div className="text-2xl font-black tracking-tighter">FinWise</div>
        <button aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="flex h-full w-72 flex-col gap-4 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Close menu" className="self-end" onClick={() => setOpen(false)}><X /></button>{nav}
          </div>
        </div>
      )}
      <main className="p-4 sm:p-8"><Outlet /></main>
    </div>
  )
}
