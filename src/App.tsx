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
      <FundScreen />
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
