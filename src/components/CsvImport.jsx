import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { buildTransactions, detectMapping, findHeader, markDuplicates, parseCsv } from '../lib/csvMath'
import { findExisting, insertTransactions } from '../lib/csvImport'
import { BUCKETS, CATEGORIES } from '../lib/transactions'
import { inr } from '../lib/format'

const MAX_CSV = 2 * 1024 * 1024, MAX_PDF = 10 * 1024 * 1024, MAX_ROWS = 5000
const FIELDS = [['date', 'Date'], ['desc', 'Description'], ['debit', 'Debit / Withdrawal'], ['credit', 'Credit / Deposit'], ['amount', 'Single amount column']]

export default function CsvImport({ accounts, onDone }) {
  const [file, setFile] = useState(null)   // CSV: { rows, header }
  const [map, setMap] = useState(null)
  const [pdf, setPdf] = useState(null)     // PDF: { items, skipped, checked, mismatches }
  const [needPw, setNeedPw] = useState(false)
  const [pw, setPw] = useState('')
  const [reading, setReading] = useState(false)
  const bytes = useRef(null)
  const [accountId, setAccountId] = useState('')
  const [items, setItems] = useState([])
  const [skipped, setSkipped] = useState([])
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => { setError(''); setDone(''); setItems([]); setFile(null); setMap(null); setPdf(null); setNeedPw(false); setPw('') }

  async function openPdf(password) {
    setError(''); setReading(true)
    try {
      const { readStatement } = await import('../lib/pdfLoad')
      const res = await readStatement(bytes.current, password)
      if (!res.items.length) throw new Error('I found the table but no transactions in it.')
      if (res.items.length > MAX_ROWS) throw new Error(`That statement has more than ${MAX_ROWS} rows. Download a shorter date range.`)
      setPdf(res); setNeedPw(false); setPw('')
    } catch (e) {
      if (e.name === 'PasswordException') { setNeedPw(true); setError(e.code === 2 ? 'That password is not right. Try again.' : '') }
      else setError(e.message)
    } finally { setReading(false) }
  }

  async function pick(e) {
    const f = e.target.files[0]; reset()
    if (!f) return
    if (/\.pdf$/i.test(f.name)) {
      if (f.size > MAX_PDF) return setError('That PDF is over 10 MB. Download a shorter date range.')
      bytes.current = new Uint8Array(await f.arrayBuffer()); return openPdf('')
    }
    if (f.size > MAX_CSV) return setError('That file is over 2 MB. Export a shorter date range.')
    const rows = parseCsv(await f.text())
    if (rows.length < 2) return setError('That file has no rows I can read. Is it a CSV or PDF statement?')
    if (rows.length > MAX_ROWS) return setError(`That file has more than ${MAX_ROWS} rows. Export a shorter date range.`)
    const header = findHeader(rows)
    setFile({ rows, header }); setMap(detectMapping(rows[header]))
  }

  useEffect(() => {
    let built, sk
    if (pdf) { built = pdf.items; sk = pdf.skipped }
    else if (file && map) ({ items: built, skipped: sk } = buildTransactions(file.rows.slice(file.header + 1), map))
    else return
    setSkipped(sk)
    if (!built.length) { setItems([]); return }
    let live = true
    const dates = built.map((t) => t.txn_date).sort()
    findExisting(dates[0], dates[dates.length - 1]).then((ex) => live && setItems(markDuplicates(built, ex))).catch((e) => live && setError(e.message))
    return () => { live = false }
  }, [file, map, pdf])

  const fresh = items.filter((t) => !t.duplicate)
  const edit = (i, patch) => setItems(items.map((t, n) => (n === i ? { ...t, ...patch } : t)))
  async function run() {
    setBusy(true); setError('')
    try { const n = await insertTransactions(fresh, accountId); reset(); setDone(`Imported ${n} transactions.`); onDone?.() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const showPreview = (file && map) || pdf

  return (
    <section className="card space-y-4">
      <h2 className="flex items-center gap-2 text-2xl"><Upload size={22} />Import a bank statement (PDF or CSV)</h2>
      <p className="text-slate-600">Upload a statement from your bank. It is read inside your browser: the file and any PDF password stay on your device. Dates are read day first (DD/MM/YYYY).</p>
      <div className="flex flex-wrap items-center gap-3">
        <input aria-label="Statement file" type="file" accept=".pdf,.csv,.txt,application/pdf,text/csv" onChange={pick} className="input !w-auto" />
        {accounts.length > 0 && <select aria-label="Account" className="input !w-auto" value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
      </div>
      {reading && <p className="font-black">Reading the PDF…</p>}
      {error && <p role="alert" className="font-black text-coral">{error}</p>}
      {done && <p className="font-black text-emerald-600">{done}</p>}

      {needPw && (
        <form onSubmit={(e) => { e.preventDefault(); openPdf(pw) }} className="flex flex-wrap items-end gap-3">
          <label className="font-black">This PDF is password protected. Enter its password.<input className="input mt-1" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <button className="btn btn-blue" disabled={reading || !pw}>Unlock</button>
          <p className="w-full text-sm text-slate-500">Used on your device only to open the file. It is not stored or sent anywhere.</p>
        </form>)}

      {file && map && (
        <div className="grid gap-3 sm:grid-cols-5">{FIELDS.map(([k, l]) => (
          <label key={k} className="text-sm font-black">{l}<select className="input mt-1" value={map[k]} onChange={(e) => setMap({ ...map, [k]: Number(e.target.value) })}>
            <option value={-1}>none</option>{file.rows[file.header].map((h, i) => <option key={i} value={i}>{h.trim() || `Column ${i + 1}`}</option>)}</select></label>))}</div>)}

      {pdf && (pdf.mismatches.length > 0
        ? <p role="alert" className="rounded-2xl bg-coral/20 p-3 font-black">⚠ {pdf.mismatches.length} of {pdf.checked} rows do not match the statement's running balance. The PDF may have been read wrongly there. Check the marked rows against your statement before importing.</p>
        : pdf.checked > 0 ? <p className="rounded-2xl bg-emerald-50 p-3 font-black text-emerald-700">All {pdf.checked} rows match the statement's running balance.</p>
        : <p className="rounded-2xl bg-sun/40 p-3 font-black">This statement has no balance column I could check, so review the rows carefully.</p>)}

      {showPreview && (<>
        <p className="font-black">{fresh.length} new · {items.length - fresh.length} already imported · {skipped.length} skipped (blank dates, totals and notes)</p>
        {items.length > 0 && (
          <div className="max-h-96 overflow-auto"><table className="w-full min-w-[700px] text-left text-sm">
            <thead className="sticky top-0 bg-white text-slate-500"><tr><th className="py-2">Date</th><th>Description</th><th>Category</th><th>Bucket</th><th className="text-right">Amount</th></tr></thead>
            <tbody>{items.map((t, i) => (
              <tr key={i} className={`border-t border-slate-100 ${t.duplicate ? 'opacity-40' : ''}`}>
                <td className="py-2">{t.check === 'mismatch' && <span aria-label="Does not match balance" className="font-black text-coral">⚠ </span>}{t.txn_date}</td><td className="max-w-[240px] truncate" title={t.description}>{t.description || '-'}</td>
                <td>{t.duplicate ? 'Already imported' : <select aria-label="Category" className="rounded-lg border border-slate-200 p-1" value={t.category} onChange={(e) => edit(i, { category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</td>
                <td>{t.duplicate || t.type === 'income' ? '-' : <select aria-label="Bucket" className="rounded-lg border border-slate-200 p-1" value={t.bucket} onChange={(e) => edit(i, { bucket: e.target.value })}>{BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select>}</td>
                <td className={`text-right font-black ${t.type === 'income' ? 'text-emerald-600' : ''}`}>{t.type === 'income' ? '+' : '-'}{inr(t.amount)}</td></tr>))}</tbody></table></div>)}
        <p className="text-sm text-slate-500">Categories are keyword guesses. Check them before importing. Imported spending is real history, so budget locks do not block it. A category can show as over its limit afterwards.</p>
        <button className="btn btn-blue" disabled={busy || fresh.length === 0} onClick={run}>{busy ? 'Importing…' : `Import ${fresh.length} transactions`}</button>
      </>)}
    </section>
  )
}