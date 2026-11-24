import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Trash2 } from 'lucide-react'
import { askAssistant } from '../lib/assistant'
import { monthKey } from '../lib/dashboardMath'

const IDEAS = ['Am I on track with my budget this month?', 'Where could I cut spending?', 'How does my spending compare with last month?', 'How long until I reach my savings goals?']

export default function Assistant() {
  const [msgs, setMsgs] = useState([])     // kept on this page only; never saved
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])

  async function send(q) {
    const message = q.trim()
    if (!message || busy) return
    setError(''); setText(''); setBusy(true)
    const history = msgs.slice(-8)
    setMsgs((m) => [...m, { role: 'user', content: message }])
    try {
      const reply = await askAssistant({ message, history, month: monthKey() })
      setMsgs((m) => [...m, { role: 'assistant', content: reply }])
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-end justify-between gap-4"><h1 className="text-4xl sm:text-5xl">AI Assistant</h1>
        {msgs.length > 0 && <button className="flex items-center gap-1 font-black text-slate-500" onClick={() => { setMsgs([]); setError('') }}><Trash2 size={16} />Clear chat</button>}</div>

      <div className="card min-h-[360px] space-y-3">
        {msgs.length === 0 && !busy && (
          <div className="space-y-3"><p className="flex items-center gap-2 text-xl font-black"><Bot size={22} />Ask about your own money</p>
            <p className="text-slate-600">I can look at this month's budget, spending, limits and goals.</p>
            <div className="flex flex-wrap gap-2">{IDEAS.map((q) => <button key={q} className="rounded-full bg-cloud px-4 py-2 text-left font-black hover:bg-slate-200" onClick={() => send(q)}>{q}</button>)}</div></div>)}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 ${m.role === 'user' ? 'bg-rain font-black text-white' : 'bg-cloud'}`}>{m.content}</p></div>))}
        {busy && <p className="text-slate-500" aria-live="polite">Thinking…</p>}
        {error && <p role="alert" className="font-black text-coral">{error}</p>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex gap-3">
        <input aria-label="Your question" className="input" maxLength={1000} placeholder="Ask a question about your money" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-blue flex items-center gap-2" disabled={busy || !text.trim()}><Send size={18} />Send</button>
      </form>
      <p className="text-sm text-slate-500">To answer, FinWise sends a summary of this month's totals, categories, limits and goals to the AI provider (Google Gemini). Your name, email, account details and bank-statement descriptions are not sent. Answers are general guidance, not professional financial advice. Chats are not saved.</p>
    </div>
  )
}
