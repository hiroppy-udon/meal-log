import { useEffect, useState } from 'react'
import { missingConfig, supabase } from './supabase'
import Login from './Login'
import Today from './Today'

// Opening the app lands on today, because recording is the thing that happens
// every day and the one condition the whole project depends on is that it gets
// used (仕様 12.5, 4.3). The tabs for the other two screens arrive in stage 5.

function App() {
  const [session, setSession] = useState(null)
  // With no configuration there is no session to look for, so nothing to wait on.
  const [checking, setChecking] = useState(!missingConfig)

  useEffect(() => {
    if (missingConfig) return

    function apply(next) {
      setSession(next)
      setChecking(false)
    }

    // A stored session survives a reload, so ask for it before deciding which
    // screen to show — otherwise the login form flashes up for an instant.
    supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) =>
      apply(next)
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  if (missingConfig) return <MissingConfig />
  if (checking) return <main className="shell" />
  if (!session) return <Login />

  return (
    <>
      <Today />
      <footer className="app-foot">
        <span>{session.user.email}</span>
        <button className="quiet" onClick={() => supabase.auth.signOut()}>
          ログアウト
        </button>
      </footer>
    </>
  )
}

/**
 * Shown when the build went out without the two Supabase values. Vite bakes
 * them in at build time, so this cannot be fixed in the running page — the
 * build has to be done again with them present.
 */
function MissingConfig() {
  return (
    <main className="shell">
      <h1>meal-log</h1>
      <p className="error">
        Supabase に繋ぐ設定が、このビルドに入っていません。
      </p>
      <p className="note">
        必要なのは <code>VITE_SUPABASE_URL</code> と{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> の2つです。
      </p>
      <dl className="checks">
        <dt>手元で動かすとき</dt>
        <dd>
          <code>.env.local</code> に書く（<code>.env.example</code> が見本）
        </dd>
        <dt>Vercel</dt>
        <dd>
          Settings → Environment Variables。
          <strong>確認用の環境（Preview）にも入れる</strong>必要があります
        </dd>
        <dt>どちらも共通</dt>
        <dd>値を入れた後、もう一度ビルドし直すこと</dd>
      </dl>
    </main>
  )
}

export default App
