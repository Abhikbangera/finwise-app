// Supabase Edge Function. Runs on Supabase's servers, so the AI key is never in the browser.
// It queries the database AS THE LOGGED-IN USER (their token), so row-level security applies.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { DAILY_LIMIT, handle, type Deps } from './handler.ts'

const URL = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!
// AI provider: any OpenAI-compatible chat API. The default is Google Gemini's free tier.
// Set AI_API_KEY as a Supabase secret. AI_MODEL and AI_BASE_URL are optional overrides.
const KEY = Deno.env.get('AI_API_KEY')
const MODEL = Deno.env.get('AI_MODEL') || 'gemini-flash-lite-latest'
const BASE = (Deno.env.get('AI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '')
// Free tiers are often briefly busy (503) or rate-limited (429): retry, then try a lighter model.
const FALLBACK = Deno.env.get('AI_FALLBACK_MODEL') || 'gemini-flash-latest'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const db = (auth: string) => createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
const ok = <T>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T }
const pad = (n: number) => String(n).padStart(2, '0')
const shift = (ym: string, by: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + by, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01` }

const deps: Deps = {
  apiKeyConfigured: !!KEY,
  bumpUsage: async (auth) => ok(await db(auth).rpc('bump_assistant_usage', { p_limit: DAILY_LIMIT })) === true,
  getData: async (auth, month) => {
    const c = db(auth), from = `${month}-01`, to = shift(month, 1), prevFrom = shift(month, -1)
    const budget = ok(await c.from('budgets').select('*').eq('month', from).maybeSingle()) as any
    const [cats, overrides, txns, prevTxns, goals] = await Promise.all([
      budget ? c.from('budget_categories').select('*').eq('budget_id', budget.id).then(ok) : [],
      budget ? c.from('budget_override_requests').select('*').eq('budget_id', budget.id).eq('status', 'approved').then(ok) : [],
      c.from('transactions').select('type,amount,category,bucket').gte('txn_date', from).lt('txn_date', to).limit(1000).then(ok),
      c.from('transactions').select('type,amount,category,bucket').gte('txn_date', prevFrom).lt('txn_date', from).limit(1000).then(ok),
      c.from('financial_goals').select('name,target_amount,saved_amount,target_date,status').then(ok),
    ])
    return { month, budget, cats, overrides, txns, prevTxns, goals } as any
  },
  callModel: async (system, messages) => {
    const attempts = [MODEL, MODEL, FALLBACK]
    let last = 0
    for (let n = 0; n < attempts.length; n++) {
      if (n > 0) await sleep(n * 1500)
      let res: Response
      try {
        res = await fetch(`${BASE}/chat/completions`, {
          method: 'POST', signal: AbortSignal.timeout(20000),
          headers: { Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: attempts[n], max_tokens: 600, messages: [{ role: 'system', content: system }, ...messages] }),
        })
      } catch (e) {   // too slow or network hiccup: treat like "busy" and try again
        last = 504
        console.warn(`AI provider did not answer on ${attempts[n]}: ${e instanceof Error ? e.message : String(e)}`)
        continue
      }
      if (res.ok) {
        const out = await res.json()
        const text = String(out.choices?.[0]?.message?.content ?? '').trim()
        if (!text) throw new Error('AI provider returned no text')
        return text
      }
      last = res.status
      // Google's own reason, e.g. "model is overloaded" or "API key not valid". It never contains the key.
      const why = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)
      console.warn(`AI provider said ${res.status} on ${attempts[n]}: ${why}`)
      if (res.status !== 429 && res.status < 500) break   // a bad key or request will not fix itself
    }
    throw new Error(`AI provider returned ${last}`)
  },
}
Deno.serve((req) => handle(req, deps))
