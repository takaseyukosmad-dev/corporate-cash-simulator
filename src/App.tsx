import { MAINTENANCE_MODE } from './maintenance.ts'
import { FundScreen } from './screens/FundScreen.tsx'
import { APP_NAME, LOGO_WHITE } from './shared/appInfo.ts'

function App() {
  return (
    <>
      <header className="app-header">
        <div className="inner">
          <img className="app-logo" src={LOGO_WHITE} alt="Fantree・Marketing" />
          <p className="app-name">{APP_NAME}</p>
        </div>
      </header>
      {MAINTENANCE_MODE ? (
        <main className="maintenance">
          <section className="card maintenance-card">
            <h1>ただいまメンテナンス中です</h1>
            <p>シミュレーターは現在メンテナンスのため、ご利用いただけません。</p>
            <p>再開までしばらくお待ちください。ご不便をおかけして申し訳ありません。</p>
          </section>
        </main>
      ) : (
        <FundScreen />
      )}
      <footer className="app-footer">
        <div className="inner">
          <img className="app-footer-logo" src={LOGO_WHITE} alt="Fantree・Marketing" />
          <p>{APP_NAME}</p>
        </div>
      </footer>
    </>
  )
}

export default App
