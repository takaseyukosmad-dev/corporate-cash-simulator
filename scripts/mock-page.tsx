import { renderToStaticMarkup } from 'react-dom/server'
import { simulateFund } from '../src/calc/fundFormation/simulateFund.ts'
import { FundInputPanel } from '../src/screens/FundInputPanel.tsx'
import { FundResultPanel } from '../src/screens/FundResultPanel.tsx'
import { DEMO_FUND_FORM, toFundInput } from '../src/screens/fundForm.ts'

// 確認用モック（mock/index.html）の本文。実際の画面の部品に、デモ用の仮データを入れて HTML にする

const APP_NAME = '会社のキャッシュ増加シミュレーター'
const noop = () => {}

// 打ち合わせ相手に確認していただきたい点（docs/decisions.md）
const CHECKS = [
  '画面の並び（上: 結論・概要 → グラフ → 比較表 → 年次の明細 → 計算の根拠）と、入力欄のまとまり（基本条件・企業型DC・福利厚生保険・役員保険・払済ケース・役員報酬減額）',
  '払済の年数（5年・10年）を、福利厚生保険と役員保険で共通にしてよいか（決定C2）',
  '解約返戻金は比較期間の最後の年だけで評価し、途中の年は出さない形でよいか（決定C3・C8）',
  '保険はどちらも法人契約（解約返戻金は法人のもの）として計算してよいか（決定C4）',
  '法人の現金は「期間中に増える分」で、期首の残高・預金の利息を入れない形でよいか（決定C5）',
  'DCを「給与から振替（選択制）」にしたとき、会社の費用を増やさない扱いでよいか（決定C6）',
  '役員報酬の減額で、役員個人への影響（手取り・社会保険料・所得税・住民税）も参考に出すか（今は会社側だけ計算）',
]

export function mockPage(): string {
  const input = toFundInput(DEMO_FUND_FORM)
  if (!input) throw new Error('デモ用の仮データが計算できません')
  const result = simulateFund(input)
  const body = renderToStaticMarkup(
    <>
      <header className="app-header">
        <div className="inner">
          <img className="app-logo" src="images/fantree-marketing-logo-white.png" alt="Fantree・Marketing" />
          <p className="app-name">{APP_NAME}</p>
        </div>
      </header>
      <main className="sim-main fund-main">
        <section className="mock-review" aria-label="確認していただきたい点">
          <p className="mock-review-title">確認用モック（実際の画面の見た目と同じです。入力欄は動きません）</p>
          <p>デモ用の仮データ（架空の会社・説明用の値）で表示しています。実在の保険商品の返戻率ではありません。次の点をご確認ください。</p>
          <ol>
            {CHECKS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </section>
        <div className="sim-top">
          <div className="sim-title">
            <h1>{APP_NAME}</h1>
            <p className="muted">年間の法人利益から、対策なしと「DC・保険・役員報酬減額」を組み合わせた場合の、法人の現金・法人保有保険・DC加入者資産を比べます。</p>
            <p className="muted">すべて概算です。入力内容は保存されません。</p>
          </div>
          <div className="sim-actions">
            <span className="btn btn-outline btn-small">デモ用の仮データを入れる</span>
            <span className="btn btn-ghost btn-small">全項目リセット</span>
            <span className="btn btn-primary btn-small">印刷する</span>
          </div>
        </div>
        <div className="sim-layout">
          <FundInputPanel values={DEMO_FUND_FORM} onChange={noop} onBlur={noop} errors={{}} />
          <div>
            <FundResultPanel input={input} result={result} showReference={false} onShowReferenceChange={noop} />
          </div>
        </div>
      </main>
      <footer className="app-footer">
        <div className="inner">
          <img className="app-footer-logo" src="images/fantree-marketing-logo-white.png" alt="Fantree・Marketing" />
          <p>{APP_NAME}</p>
        </div>
      </footer>
    </>,
  )
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_NAME}（確認用モック）</title>
    <link rel="stylesheet" href="style.css" />
    <style>
      #root { min-height: 100vh; display: flex; flex-direction: column; }
      .mock-review { background: var(--yellow-tint); border: 2px dashed var(--yellow); border-radius: var(--radius); padding: 16px 20px; margin-bottom: 24px; font-size: 14px; }
      .mock-review-title { margin: 0 0 6px; font-weight: 800; color: var(--navy-dark); }
      .mock-review p { margin: 0 0 6px; }
      .mock-review ol { margin: 0; padding-left: 22px; }
      .input-panel input, .input-panel select { pointer-events: none; }
    </style>
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>
`
}
