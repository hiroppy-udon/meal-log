import { supabase } from './supabase'

// Everything that reads or writes one day's records.
// Kept out of the screen so the screen is only about showing and editing.

export const SLOTS = [
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'dinner', label: '晩' },
  { key: 'snack', label: '間食' },
]

export const SOURCES = [
  { key: 'cooked', label: '自炊' },
  { key: 'eaten_out', label: '外食' },
  { key: 'none', label: 'なし' },
]

// 'sv-SE' happens to format as YYYY-MM-DD, which is what the date column wants.
export function today() {
  return new Date().toLocaleDateString('sv-SE')
}

export function shiftDate(date, days) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('sv-SE')
}

export function formatDate(date) {
  const d = new Date(`${date}T00:00:00`)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekday})`
}

// Times come back as HH:MM:SS; the screen only ever shows and edits HH:MM.
export function toInputTime(time) {
  return time ? time.slice(0, 5) : ''
}

// Menus are stored one row per item (仕様 13.2) but typed as one line, because
// making someone add rows one at a time is the friction this app exists to
// remove (4.3). The line is split on either comma.
export function splitMenus(text) {
  return text
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function joinMenus(menus) {
  return menus.map((m) => m.name).join('、')
}

function one(value) {
  // A nested select returns an object or a one-element array depending on how
  // the relationship is detected; normalise both to a single value.
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Reads one day and arranges it the way the screen draws it: wake and sleep
 * around four meal slots, with shopping outside the frame (仕様 6.1).
 */
export async function loadDay(date) {
  const { data, error } = await supabase
    .from('records')
    .select('id, date, time, kind, amount, note, meals(slot, source), menus(id, name)')
    .eq('date', date)
    .order('id')

  if (error) throw error

  const day = {
    wake: null,
    sleep: null,
    meals: {},
    shopping: [],
    total: 0,
  }

  for (const record of data) {
    if (record.amount != null) day.total += record.amount

    if (record.kind === 'wake') day.wake = record
    else if (record.kind === 'sleep') day.sleep = record
    else if (record.kind === 'shopping') day.shopping.push(record)
    else if (record.kind === 'meal') {
      const meal = one(record.meals)
      if (meal) day.meals[meal.slot] = { ...record, source: meal.source }
    }
  }

  return day
}

/** Wake and sleep hold nothing but a time, so clearing it removes the record. */
export async function setDayEdge(date, kind, existing, time) {
  if (!time) {
    if (existing) await remove(existing.id)
    return
  }
  if (existing) {
    const { error } = await supabase
      .from('records')
      .update({ time })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('records').insert({ date, kind, time })
    if (error) throw error
  }
}

/**
 * Sets whether a slot was cooked, eaten out, or skipped — and creates the
 * record the first time, because meals.source cannot be empty. Every other
 * cell in the row waits for this, so nothing is ever guessed on the user's
 * behalf.
 */
export async function setSource(date, slot, existing, source) {
  if (existing) {
    const { error } = await supabase
      .from('meals')
      .update({ source })
      .eq('record_id', existing.id)
    if (error) throw error
    return
  }

  const { data, error } = await supabase
    .from('records')
    .insert({ date, kind: 'meal' })
    .select('id')
    .single()
  if (error) throw error

  const { error: mealError } = await supabase
    .from('meals')
    .insert({ record_id: data.id, slot, source })
  if (mealError) throw mealError
}

export async function setField(recordId, patch) {
  const { error } = await supabase.from('records').update(patch).eq('id', recordId)
  if (error) throw error
}

/** Replaces the whole list, which keeps "what is typed" and "what is stored" the same. */
export async function setMenus(recordId, names) {
  const { error: clearError } = await supabase
    .from('menus')
    .delete()
    .eq('record_id', recordId)
  if (clearError) throw clearError

  if (names.length === 0) return

  const { error } = await supabase
    .from('menus')
    .insert(names.map((name) => ({ record_id: recordId, name })))
  if (error) throw error
}

export async function addShopping(date) {
  const { data, error } = await supabase
    .from('records')
    .insert({ date, kind: 'shopping' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** menus and meals carry on delete cascade, so they go with the record. */
export async function remove(recordId) {
  const { error } = await supabase.from('records').delete().eq('id', recordId)
  if (error) throw error
}
