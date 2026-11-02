import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Today from './Today'

// Opening the app lands on today, because recording is the thing that happens
// every day and the one condition the whole project depends on is that it gets
// used (仕様 12.5, 4.3). The tabs for the other two screens arrive in stage 5.

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
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

export default App
