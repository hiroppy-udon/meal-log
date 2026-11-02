import { useEffect, useState } from 'react'
import {
  SLOTS,
  SOURCES,
  addShopping,
  formatDate,
  joinMenus,
  loadDay,
  remove,
  setDayEdge,
  setField,
  setMenus,
  setSource,
  shiftDate,
  splitMenus,
  toInputTime,
  today,
} from './day'

// The day as a fixed sequence of slots, which is what a day is here — not a
// list of events sorted by time (判断の記録 #19). Reading and entering happen
// in the same place: tap a cell and type where it sits, no second screen and
// nothing sliding up from the bottom (判断の記録 #22).

function Today() {
  const [date, setDate] = useState(today)
  const [day, setDay] = useState(null)
  const [reloads, setReloads] = useState(0)
  const [editing, setEditing] = useState(null) // 'breakfast:menu', 'wake:time', …
  const [noteFor, setNoteFor] = useState(null) // record id whose note is open
  const [error, setError] = useState(null)

  useEffect(() => {
    // `active` guards against a slow answer for a day the user has already
    // moved off: stepping through dates quickly would otherwise let an earlier
    // request land last and draw the wrong day.
    let active = true

    loadDay(date)
      .then((loaded) => {
        if (!active) return
        setDay(loaded)
        setError(null)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })

    return () => {
      active = false
    }
  }, [date, reloads])

  // Every edit goes through here so one place handles the failure and the
  // reload, and the screen always shows what is actually stored.
  async function apply(fn) {
    try {
      await fn()
      setError(null)
    } catch (e) {
      setError(e.message)
    }
    setEditing(null)
    setReloads((n) => n + 1)
  }

  if (!day) {
    return (
      <main className="shell">
        <p className="note">読み込み中…</p>
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="day-head">
        <button
          className="icon"
          onClick={() => setDate(shiftDate(date, -1))}
          aria-label="前の日"
        >
          ‹
        </button>
        <label className="day-date">
          {formatDate(date)}
          {/* The date field is the whole way back through the record — no
              separate screen for going back in time (仕様 6.2). */}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
        <button
          className="icon"
          onClick={() => setDate(shiftDate(date, 1))}
          aria-label="次の日"
        >
          ›
        </button>
      </header>

      {date !== today() && (
        <button className="quiet today-jump" onClick={() => setDate(today())}>
          今日に戻る
        </button>
      )}

      {error && <p className="error">{error}</p>}

      <section className="frame">
        <EdgeRow
          label="起床"
          record={day.wake}
          editing={editing === 'wake:time'}
          onEdit={() => setEditing('wake:time')}
          onCancel={() => setEditing(null)}
          onChange={(time) => apply(() => setDayEdge(date, 'wake', day.wake, time))}
          onNote={() => setNoteFor(day.wake?.id ?? null)}
        />

        <div className="rule" />

        {SLOTS.map((slot) => (
          <MealRow
            key={slot.key}
            slot={slot}
            meal={day.meals[slot.key]}
            editing={editing}
            setEditing={setEditing}
            onSource={(source) =>
              apply(() => setSource(date, slot.key, day.meals[slot.key], source))
            }
            onTime={(time) =>
              apply(() => setField(day.meals[slot.key].id, { time: time || null }))
            }
            onMenus={(text) =>
              apply(() => setMenus(day.meals[slot.key].id, splitMenus(text)))
            }
            onAmount={(amount) =>
              apply(() =>
                setField(day.meals[slot.key].id, {
                  amount: amount === '' ? null : Number(amount),
                })
              )
            }
            onRemove={() => apply(() => remove(day.meals[slot.key].id))}
            onNote={() => setNoteFor(day.meals[slot.key]?.id ?? null)}
          />
        ))}

        <div className="rule" />

        <EdgeRow
          label="入眠"
          record={day.sleep}
          editing={editing === 'sleep:time'}
          onEdit={() => setEditing('sleep:time')}
          onCancel={() => setEditing(null)}
          onChange={(time) => apply(() => setDayEdge(date, 'sleep', day.sleep, time))}
          onNote={() => setNoteFor(day.sleep?.id ?? null)}
        />
      </section>

      {/* Shopping has no position in the day, so it sits outside the frame and
          carries no time (仕様 6.1). */}
      <section className="outside">
        {day.shopping.map((row) => (
          <ShoppingRow
            key={row.id}
            row={row}
            editing={editing}
            setEditing={setEditing}
            onAmount={(amount) =>
              apply(() =>
                setField(row.id, { amount: amount === '' ? null : Number(amount) })
              )
            }
            onRemove={() => apply(() => remove(row.id))}
            onNote={() => setNoteFor(row.id)}
          />
        ))}

        <button className="quiet add" onClick={() => apply(() => addShopping(date))}>
          ＋ 買い物
        </button>

        <div className="total">
          <span>この日の出費</span>
          <strong>¥{day.total.toLocaleString()}</strong>
        </div>
      </section>

      {noteFor && (
        <NoteEditor
          record={findRecord(day, noteFor)}
          onClose={() => setNoteFor(null)}
          onSave={(note) => {
            setNoteFor(null)
            return apply(() => setField(noteFor, { note: note || null }))
          }}
        />
      )}
    </main>
  )
}

function findRecord(day, id) {
  const all = [day.wake, day.sleep, ...Object.values(day.meals), ...day.shopping]
  return all.find((r) => r && r.id === id) ?? null
}

/** Wake and sleep: a label and a time, nothing else. */
function EdgeRow({ label, record, editing, onEdit, onCancel, onChange, onNote }) {
  return (
    <div className="row edge">
      <span className="label">{label}</span>
      {editing ? (
        <input
          className="cell time"
          type="time"
          autoFocus
          defaultValue={toInputTime(record?.time)}
          onBlur={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur()
            if (e.key === 'Escape') onCancel()
          }}
        />
      ) : (
        <button className="cell time" onClick={onEdit}>
          {toInputTime(record?.time) || <Blank />}
        </button>
      )}
      <span className="cell grow" />
      <NoteMark record={record} onClick={onNote} />
    </div>
  )
}

function MealRow({
  slot,
  meal,
  editing,
  setEditing,
  onSource,
  onTime,
  onMenus,
  onAmount,
  onRemove,
  onNote,
}) {
  const key = (field) => `${slot.key}:${field}`
  const choosing = editing === key('source')

  // With no record yet there is nothing to attach a time or a menu to, and
  // meals.source cannot be empty — so the first tap anywhere in the row asks
  // which it was, rather than picking one silently.
  const openSource = () => setEditing(key('source'))

  return (
    <div className="row meal">
      <span className="label">{slot.label}</span>

      {editing === key('time') ? (
        <input
          className="cell time"
          type="time"
          autoFocus
          defaultValue={toInputTime(meal?.time)}
          onBlur={(e) => onTime(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur()
            if (e.key === 'Escape') setEditing(null)
          }}
        />
      ) : (
        <button
          className="cell time"
          onClick={() => (meal ? setEditing(key('time')) : openSource())}
        >
          {toInputTime(meal?.time) || <Blank />}
        </button>
      )}

      {choosing ? (
        <span className="cell choices">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              className={meal?.source === s.key ? 'chip on' : 'chip'}
              onClick={() => onSource(s.key)}
            >
              {s.label}
            </button>
          ))}
          {meal && (
            <button className="chip danger" onClick={onRemove}>
              消す
            </button>
          )}
        </span>
      ) : (
        <button className="cell source" onClick={openSource}>
          {meal ? (
            SOURCES.find((s) => s.key === meal.source)?.label
          ) : (
            <Blank />
          )}
        </button>
      )}

      {editing === key('menus') ? (
        <input
          className="cell grow"
          type="text"
          autoFocus
          placeholder="目玉焼き、味噌汁"
          defaultValue={meal ? joinMenus(meal.menus ?? []) : ''}
          onBlur={(e) => onMenus(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur()
            if (e.key === 'Escape') setEditing(null)
          }}
        />
      ) : (
        <button
          className="cell grow menus"
          onClick={() => (meal ? setEditing(key('menus')) : openSource())}
        >
          {meal && meal.menus?.length ? joinMenus(meal.menus) : <Blank />}
        </button>
      )}

      {/* Only eating out costs anything, so the amount appears only there (仕様 6.1). */}
      {meal?.source === 'eaten_out' &&
        (editing === key('amount') ? (
          <input
            className="cell amount"
            type="number"
            inputMode="numeric"
            min="0"
            autoFocus
            defaultValue={meal.amount ?? ''}
            onBlur={(e) => onAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur()
              if (e.key === 'Escape') setEditing(null)
            }}
          />
        ) : (
          <button className="cell amount" onClick={() => setEditing(key('amount'))}>
            {meal.amount != null ? `¥${meal.amount.toLocaleString()}` : <Blank />}
          </button>
        ))}

      <NoteMark record={meal} onClick={onNote} />
    </div>
  )
}

function ShoppingRow({ row, editing, setEditing, onAmount, onRemove, onNote }) {
  const key = `shopping-${row.id}:amount`

  return (
    <div className="row shopping">
      <span className="label">買い物</span>
      <span className="cell grow note-preview">{row.note || ''}</span>

      {editing === key ? (
        <input
          className="cell amount"
          type="number"
          inputMode="numeric"
          min="0"
          autoFocus
          defaultValue={row.amount ?? ''}
          onBlur={(e) => onAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur()
            if (e.key === 'Escape') setEditing(null)
          }}
        />
      ) : (
        <button className="cell amount" onClick={() => setEditing(key)}>
          {row.amount != null ? `¥${row.amount.toLocaleString()}` : <Blank />}
        </button>
      )}

      <NoteMark record={row} onClick={onNote} />
      <button className="icon danger" onClick={onRemove} aria-label="この買い物を消す">
        ✕
      </button>
    </div>
  )
}

/** A slot with no record at all shows nothing; "なし" is a value, not an absence. */
function Blank() {
  return <span className="blank" aria-label="未記録" />
}

/** Notes are rare, so they stay behind a mark at the end of the row (仕様 7.5). */
function NoteMark({ record, onClick }) {
  if (!record) return <span className="note-mark empty" />
  return (
    <button
      className={record.note ? 'note-mark on' : 'note-mark'}
      onClick={onClick}
      aria-label="備考"
    >
      ●
    </button>
  )
}

function NoteEditor({ record, onClose, onSave }) {
  const [text, setText] = useState(record?.note ?? '')
  if (!record) return null

  return (
    <div className="note-editor">
      <label htmlFor="note">備考</label>
      <textarea
        id="note"
        rows={3}
        autoFocus
        value={text}
        placeholder="米5kg、鶏むね肉、調味料"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="actions">
        <button onClick={() => onSave(text)}>保存</button>
        <button className="quiet" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}

export default Today
