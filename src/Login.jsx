import { useState } from 'react'
import { supabase } from './supabase'

// The only screen shown before signing in (仕様 7.9).
//
// There is no sign-up screen and no password reset: one person uses this, and
// the account is created from the Supabase dashboard. Both can be added later
// if that stops being true.

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // On success, App is listening for the auth change and swaps this screen
    // out, so there is nothing to do here.
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  return (
    <main className="shell">
      <h1>meal-log</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={busy}>
          {busy ? '確認中…' : 'ログイン'}
        </button>

        {error && <p className="error">{error}</p>}
      </form>
    </main>
  )
}

export default Login
