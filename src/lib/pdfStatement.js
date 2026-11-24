// Pure statement-table reader. Input: for each page, text pieces { str, x, y } (from pdf.js).
// It finds the header row (Date, Description, Withdrawal, Deposit, Balance), assigns every
// piece to a column by x position, joins wrapped description lines, and then checks each
// row against the running Balance column so misread amounts are caught.
import { categorize, parseAmount, parseDate } from './csvMath.js'
const r2 = (n) => Math.round(n * 100) / 100
const HEAD = {
  idx: /^#$/, date: /^date/i, desc: /^(description|narration|particulars|details)/i, ref: /chq|ref/i,
  debit: /withdrawal|debit/i, credit: /deposit|credit/i, balance: /^balance/i,
}
const FOOTER = /statement generated|page \d+ of|closing balance|end of statement/i
const TOL = 12   // columns start a little left of their header text

export function groupLines(items, tol = 2.5) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x), lines = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - it.y) <= tol) last.items.push(it); else lines.push({ y: it.y, items: [it] })
  }
  lines.forEach((l) => l.items.sort((a, b) => a.x - b.x))
  return lines
}
function headerOf(line) {
  const cols = {}
  for (const it of line.items) for (const [k, re] of Object.entries(HEAD)) if (cols[k] === undefined && re.test(it.str.trim())) { cols[k] = it.x; break }
  return cols.date !== undefined && cols.desc !== undefined && cols.balance !== undefined && (cols.debit !== undefined || cols.credit !== undefined) ? cols : null
}
function toCells(line, cols) {
  const order = Object.entries(cols).sort((a, b) => a[1] - b[1]), cells = {}
  for (const it of line.items) {
    let key = null
    for (const [k, start] of order) if (it.x >= start - TOL) key = k
    if (key) cells[key] = ((cells[key] ?? '') + ' ' + it.str).trim()
  }
  return cells
}

export function parseStatement(pages) {
  let cols = null, opening = null
  const rows = [], skipped = []
  let cur = null
  const flush = () => {
    if (!cur) return
    const d = Math.abs(parseAmount(cur.debit) ?? 0), c = Math.abs(parseAmount(cur.credit) ?? 0)
    if (d > 0 || c > 0) {
      const type = d > 0 ? 'expense' : 'income'
      const description = cur.desc.replace(/\s+/g, ' ').trim().slice(0, 200)
      rows.push({ txn_date: cur.date, type, amount: r2(d > 0 ? d : c), description, balance: parseAmount(cur.balance), ...categorize(description, type) })
    } else skipped.push({ row: rows.length + skipped.length + 1, reason: 'No amount' })
    cur = null
  }
  for (const page of pages) {
    for (const line of groupLines(page)) {
      const h = headerOf(line)
      if (h) { flush(); cols = h; continue }
      if (!cols) continue
      const cells = toCells(line, cols), text = line.items.map((i) => i.str).join(' ')
      if (/^opening balance/i.test(cells.desc ?? '')) { flush(); opening = parseAmount(cells.balance); continue }
      if (FOOTER.test(text)) { flush(); continue }
      const date = cells.date ? parseDate(cells.date) : null
      if (date) { flush(); cur = { date, desc: cells.desc ?? '', debit: cells.debit, credit: cells.credit, balance: cells.balance } }
      else if (cur) {   // wrapped line of the same row
        if (cells.desc) cur.desc += ' ' + cells.desc
        for (const k of ['debit', 'credit', 'balance']) if (!cur[k] && cells[k]) cur[k] = cells[k]
      }
    }
    flush()   // a row never continues onto the next page
  }
  if (!cols) throw new Error('I could not find the transaction table in this PDF (no Date, Description, Withdrawal, Deposit and Balance headings).')
  return { items: rows, skipped, opening, ...checkBalances(opening, rows) }
}

// Each row's Balance must equal the previous balance +/- its amount.
export function checkBalances(opening, rows) {
  let running = opening, checked = 0
  const mismatches = []
  rows.forEach((r, i) => {
    if (r.balance == null) return
    if (running != null) {
      checked++
      if (Math.abs(r2(running + (r.type === 'income' ? r.amount : -r.amount)) - r.balance) > 0.005) { mismatches.push(i); r.check = 'mismatch' } else r.check = 'ok'
    }
    running = r.balance   // resync so one bad row does not flag all the rest
  })
  return { checked, mismatches }
}
