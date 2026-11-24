import { getBudget, listCategories } from './budgets'
import { listTransactions } from './transactions'
import { listOverrides } from './overrides'
import { canSpend, computeProgress } from './budgetMath'
import { inr } from './format'

// Smart Budget Locking: may this expense be saved? excludeId = the row being edited.
export async function checkExpense({ date, category, amount, excludeId }) {
  const month = date.slice(0, 7)
  const b = await getBudget(month)
  if (!b) return { ok: true }
  const [cats, txns, ov] = await Promise.all([listCategories(b.id), listTransactions(month), listOverrides(b.id)])
  const c = computeProgress(b, cats, txns.filter((t) => t.id !== excludeId), ov).cats.find((x) => x.name === category)
  if (!c || canSpend(c, amount)) return { ok: true }
  return { ok: false, message: `${category} is ${c.left <= 0 ? 'locked' : 'too full for this'}: ${inr(Math.max(0, c.left))} left of ${inr(c.limit)}. Ask for an exception on the Budgets page to add more.` }
}
