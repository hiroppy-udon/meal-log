// Stage 1 placeholder. The only job of this screen right now is to prove the
// deploy path works end to end and that the app is installable.
// Stage 3 replaces it with the Today screen.

function App() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  return (
    <main className="shell">
      <h1>meal-log</h1>
      <p className="note">段階1 — 公開とホーム画面への追加の確認</p>
      <dl className="checks">
        <dt>表示のされ方</dt>
        <dd>{standalone ? 'ホーム画面から起動' : 'ブラウザで表示中'}</dd>
        <dt>ビルド時刻</dt>
        <dd>{__BUILD_TIME__}</dd>
      </dl>
    </main>
  )
}

export default App
