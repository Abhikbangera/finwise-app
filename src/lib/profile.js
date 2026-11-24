import { supabase } from './supabase'
const must = ({ data, error }) => { if (error) throw error; return data }

export async function getProfile() {
  return must(await supabase.from('profiles').select('*').maybeSingle())
}
// RLS only lets a user change their own row; the id filter is just to target it.
export async function updateProfile(userId, values) {
  return must(await supabase.from('profiles').update(values).eq('id', userId).select().single())
}
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
