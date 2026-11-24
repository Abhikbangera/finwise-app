import { supabase } from './supabase'

// Calls the finwise-assistant Edge Function. The browser never sees the AI key.
// history = earlier turns [{ role: 'user' | 'assistant', content }], month = 'YYYY-MM'.
export async function askAssistant({ message, history, month }) {
  const { data, error } = await supabase.functions.invoke('finwise-assistant', { body: { message, history, month } })
  if (error) {
    let msg = 'The assistant is unavailable right now.'
    if (error.name === 'FunctionsFetchError') msg = 'Could not reach the assistant. Has the function been deployed?'
    try { const j = await error.context.json(); if (j?.error) msg = j.error } catch { /* keep the default */ }
    throw new Error(msg)
  }
  return data.reply
}
