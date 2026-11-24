// Pure CSV-statement logic (no database, no libraries). Dates are read day-first (DD/MM/YYYY),
// the usual Indian bank format.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n) => String(n).padStart(2, '0')

export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '')
  const first = text.split(/\r?\n/, 1)[0] || ''
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]
  const rows = []; let row = [], cell = '', q = false
  const endRow = () => { row.push(cell); cell = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c }
    else if (c === '"') q = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow() }
    else cell += c
  }
  endRow()
  return rows
}

// Banks often print account details above the table: find the real header row.
export function findHeader(rows) {
  const i = rows.slice(0, 20).findIndex((r) => r.filter((c) => c.trim()).length >= 3 && r.some((c) => /date|\bdt\b/i.test(c)))
  return i === -1 ? 0 : i
}
export function detectMapping(headers) {
  const h = headers.map((x) => x.trim().toLowerCase())
  const find = (re, bad) => h.findIndex((x) => re.test(x) && !(bad && bad.test(x)))
  return {
    date: find(/date|\bdt\b/, /value/) !== -1 ? find(/date|\bdt\b/, /value/) : find(/date|\bdt\b/),
    desc: find(/narration|description|particulars|details|remarks/),
    debit: find(/withdrawal|debit|^dr\b/), credit: find(/deposit|credit|^cr\b/), amount: find(/^amount/),
  }
}

export function parseDate(s) {
  const t = String(s ?? '').trim(); let y, m, d, x
  if ((x = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) [y, m, d] = [+x[1], +x[2], +x[3]]
  else if ((x = t.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/))) [d, m, y] = [+x[1], +x[2], +x[3]]
  else if ((x = t.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ,]*(\d{2,4})/))) { d = +x[1]; m = MONTHS.indexOf(x[2].slice(0, 3).toLowerCase()) + 1; y = +x[3] }
  else return null
  if (y < 100) y += 2000
  const dt = new Date(y, m - 1, d)
  return m >= 1 && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null
}

// Returns a signed number (Dr, minus sign or brackets = negative) or null.
export function parseAmount(s) {
  let t = String(s ?? '').trim(); if (!t) return null
  let neg = false
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1) }
  if (/dr\.?$/i.test(t)) { neg = true; t = t.replace(/\s*dr\.?$/i, '') } else if (/cr\.?$/i.test(t)) t = t.replace(/\s*cr\.?$/i, '')
  t = t.replace(/[₹,\s]|rs\.?|inr/gi, '')
  if (t.startsWith('-')) { neg = true; t = t.slice(1) }
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return neg ? -Number(t) : Number(t)
}

// Keyword guesses only. The person reviews and can change each row before importing.
const RULES = [
  [/rent|electric|bescom|water bill|broadband|jio|airtel|recharge|insurance|emi/i, 'Rent & Bills', 'needs'],
  [/grocer|bigbasket|blinkit|zepto|dmart|supermarket/i, 'Food & Dining', 'needs'],
  [/swiggy|zomato|restaurant|cafe|dining|dominos|mcdonald/i, 'Food & Dining', 'wants'],
  [/amazon|flipkart|myntra|ajio|nykaa|shopping/i, 'Shopping', 'wants'],
  [/uber|ola\b|rapido|metro|irctc|fuel|petrol|diesel|fastag/i, 'Transport', 'needs'],
  [/pharmacy|hospital|clinic|apollo|medical|diagnostic/i, 'Health', 'needs'],
  [/netflix|spotify|hotstar|prime video|bookmyshow|movie/i, 'Entertainment', 'wants'],
  [/\bsip\b|mutual fund|zerodha|groww|ppf|recurring deposit/i, 'Goals & Savings', 'savings'],
]
export function categorize(desc, type) {
  if (type === 'income') return { category: /salary/i.test(desc) ? 'Salary' : 'Other', bucket: null }
  const r = RULES.find(([re]) => re.test(desc))
  return r ? { category: r[1], bucket: r[2] } : { category: 'Other', bucket: 'wants' }
}

// rows = data rows below the header. mapping = column indexes (or -1).
export function buildTransactions(rows, mapping) {
  const items = [], skipped = []
  const cell = (r, i) => (i >= 0 ? r[i] : undefined)
  rows.forEach((r, n) => {
    const date = parseDate(cell(r, mapping.date))
    if (!date) return skipped.push({ row: n + 1, reason: 'No valid date' })
    let type, amount
    if (mapping.debit >= 0 || mapping.credit >= 0) {
      const d = Math.abs(parseAmount(cell(r, mapping.debit)) ?? 0), c = Math.abs(parseAmount(cell(r, mapping.credit)) ?? 0)
      if (d > 0) { type = 'expense'; amount = d } else if (c > 0) { type = 'income'; amount = c }
    } else if (mapping.amount >= 0) {
      const a = parseAmount(cell(r, mapping.amount))
      if (a) { type = a < 0 ? 'expense' : 'income'; amount = Math.abs(a) }
    }
    if (!type) return skipped.push({ row: n + 1, reason: 'No amount' })
    const description = String(cell(r, mapping.desc) ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
    items.push({ txn_date: date, type, amount: Math.round(amount * 100) / 100, description, ...categorize(description, type) })
  })
  return { items, skipped }
}

// Re-importing the same statement must not double-count. Compare with rows already saved,
// counting repeats so two genuine identical purchases on one day are both kept.
const key = (t) => `${t.txn_date}|${t.type}|${Number(t.amount).toFixed(2)}|${String(t.description ?? '').trim().toLowerCase()}`
export function markDuplicates(items, existing) {
  const counts = new Map()
  for (const e of existing) counts.set(key(e), (counts.get(key(e)) ?? 0) + 1)
  return items.map((t) => { const k = key(t), n = counts.get(k) ?? 0; if (n > 0) { counts.set(k, n - 1); return { ...t, duplicate: true } } return { ...t, duplicate: false } })
}
