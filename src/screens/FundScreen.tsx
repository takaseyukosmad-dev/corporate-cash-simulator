import { useEffect, useMemo, useState } from 'react'
import { simulateFund } from '../calc/fundFormation/simulateFund.ts'
import type { FundInput, FundResult } from '../calc/fundFormation/types.ts'
import { formatNumberText } from '../shared/numberInput.ts'
import { FundInputPanel } from './FundInputPanel.tsx'
import { FundPrint } from './FundPrint.tsx'
import { FundResultPanel } from './FundResultPanel.tsx'
import { DEMO_FUND_FORM, EMPTY_FUND_FORM, type FundField, type FundFormValues, toFundInput, validateFundForm } from './fundForm.ts'

// キャッシュ増加シュミレーター。入力を変えるとすぐに計算し直す。入力内容は保存しない

const AMOUNT_FIELDS: FundField[] = ['annualProfitMan', 'dcMonthly', 'welfarePremiumMan', 'officerPremiumMan', 'payCutMonthly', 'payCutTotalMan', 'payCutPayBefore']

type Computed = { input: FundInput; result: FundResult }

export function FundScreen() {
  const [values, setValues] = useState<FundFormValues>(EMPTY_FUND_FORM)
  const [touched, setTouched] = useState<Set<FundField>>(() => new Set())
  const [isDemo, setIsDemo] = useState(false)
  const [lastComputed, setLastComputed] = useState<Computed | null>(null)
  // 比較表に参考総額を出すか。画面と印刷で同じ選択を使う
  const [showReference, setShowReference] = useState(false)
  // 印刷の作成日。印刷する直前に、その日の日付にする
  const [printDate, setPrintDate] = useState(() => new Date())
  useEffect(() => {
    const update = () => setPrintDate(new Date())
    window.addEventListener('beforeprint', update)
    return () => window.removeEventListener('beforeprint', update)
  }, [])

  const current = useMemo<Computed | null>(() => {
    const input = toFundInput(values)
    return input ? { input, result: simulateFund(input) } : null
  }, [values])
  if (current && current !== lastComputed) setLastComputed(current)
  const shown = current ?? lastComputed

  const allErrors = validateFundForm(values)
  // エラーは、触った欄と、値が入っている欄に出す（空欄のまま触っていない欄は、入力前から赤くしない）。
  // 例: 比較期間を短くしてDC拠出期間が超えたときは、拠出期間を触っていなくても表示する
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(([k]) => touched.has(k as FundField) || String(values[k as FundField]).trim() !== ''),
  )

  function handleChange(key: FundField, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }
  function handleBlur(key: FundField) {
    setTouched((prev) => new Set(prev).add(key))
    if (AMOUNT_FIELDS.includes(key)) setValues((prev) => ({ ...prev, [key]: formatNumberText(prev[key] as string) }))
  }
  function loadDemo() {
    setValues(DEMO_FUND_FORM)
    setTouched(new Set())
    setIsDemo(true)
  }
  function reset() {
    setValues(EMPTY_FUND_FORM)
    setTouched(new Set())
    setLastComputed(null)
    setIsDemo(false)
  }

  return (
    <>
      <main className="sim-main fund-main">
        <div className="sim-top">
          <div className="sim-title">
            <h1>キャッシュ増加シュミレーター</h1>
            <p className="muted">年間の法人利益から、対策なしと「DC・保険・役員報酬減額」を組み合わせた場合の、法人の現金・法人保有保険・DC加入者資産を比べます。</p>
            <p className="muted">すべて概算です。入力内容は保存されません。</p>
            {isDemo && <p className="notice fund-demo-note">デモ用の仮データ（架空の会社・説明用の値）を表示しています。実在の保険商品の返戻率ではありません。</p>}
          </div>
          <div className="sim-actions">
            <button type="button" className="btn btn-outline btn-small" onClick={loadDemo}>
              デモ用の仮データを入れる
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
              全項目リセット
            </button>
            <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()} disabled={!current}>
              印刷する
            </button>
          </div>
        </div>

        <div className="sim-layout">
          <FundInputPanel values={values} onChange={handleChange} onBlur={handleBlur} errors={errors} />
          {shown ? (
            <div>
              {!current && <p className="warning">入力にエラーがあるため、直前の結果を表示しています。</p>}
              <FundResultPanel input={shown.input} result={shown.result} showReference={showReference} onShowReferenceChange={setShowReference} />
            </div>
          ) : (
            <div className="result-panel">
              <section className="card empty-state">
                <p>左の条件（年間法人利益など）を入力すると、比較結果がここに表示されます。</p>
                <button type="button" className="btn btn-outline" onClick={loadDemo}>
                  デモ用の仮データで試す
                </button>
              </section>
            </div>
          )}
        </div>
      </main>
      {/* 印刷用の表示（画面には出さない）。入力にエラーがあるときは印刷ボタンが押せないので、current だけを使う */}
      {current && <FundPrint companyName={values.companyName} input={current.input} result={current.result} showReference={showReference} date={printDate} />}
    </>
  )
}
