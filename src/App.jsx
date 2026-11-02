import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'

// Stage 2. This screen exists to prove one thin path works end to end:
// screen -> sign in -> write -> stored -> read back -> screen.
// Stage 3 replaces it with the Today screen (仕様 7.5).

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  async function load() {
    const { data, error } = await supabase
      .from('records')
      .select('id, date, kind, amount, note, created_at')
      .order('id', { ascending: false })
      .limit(20)

    if (error) setError(error.message)
    else setRows(data)
  }

  useEffect(() => {
    // Everything that follows the sign-in state is handled here, so there is
    // one place that reacts to it rather than two effects chaining.
    function apply(next) {
      setSession(next)
      setChecking(false)
      if (next) load()
      else setRows([])
    }

    // A stored session survives a reload, so ask for it before deciding which
    // screen to show — otherwise the login form flashes up for an instant.
    supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) =>
      apply(next)
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function addTestRow() {
    setError(null)

    // user_id is left out on purpose: the column defaults to auth.uid(), so
    // the row cannot end up owned by the wrong person by mistake.
    const { error } = await supabase.from('records').insert({
      date: new Date().toLocaleDateString('sv-SE'), // sv-SE renders as YYYY-MM-DD
      kind: 'shopping',
      amount: 1234,
      note: '段階2の確認用',
    })

    if (error) setError(error.message)
    else load()
  }

  if (checking) return <main className="shell" />
  if (!session) return <Login />

  return (
    <main className="shell">
      <h1>meal-log</h1>
      <p className="note">段階2 — 書き込みと読み出しの確認</p>

      <dl className="checks">
        <dt>ログイン中</dt>
        <dd>{session.user.email}</dd>
        <dt>ビルド時刻</dt>
        <dd>{__BUILD_TIME__}</dd>
      </dl>

      <div className="actions">
        <button onClick={addTestRow}>テスト用の記録を1件書き込む</button>
        <button className="quiet" onClick={() => supabase.auth.signOut()}>
          ログアウト
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <p className="note">保存されている記録 {rows.length} 件</p>
      <ul className="rows">
        {rows.map((row) => (
          <li key={row.id}>
            <span className="id">#{row.id}</span>
            <span>{row.date}</span>
            <span>{row.kind}</span>
            <span>{row.amount != null ? `¥${row.amount.toLocaleString()}` : '—'}</span>
            <span className="dim">{row.note}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
