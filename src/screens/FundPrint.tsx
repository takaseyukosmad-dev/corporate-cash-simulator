import type { ReactNode } from 'react'
import type { FundInput, FundResult, InsurancePlan } from '../calc/fundFormation/types.ts'
import { APP_NAME, LOGO_WHITE } from '../shared/appInfo.ts'
import { formatDate, formatPercent, formatRate, formatYen } from '../shared/format.ts'
import { formatManYen } from '../shared/money.ts'
import { columnsFor, usesInsurance } from './fundColumns.ts'
import { AssetChart, AssumptionList, BasisList, CashChart, CompareTable, Conclusion, Kpis, WarningList } from './FundResultPanel.tsx'

// 印刷用の表示（決定C14・C17・C18）。画面には出さず、印刷するときだけ使う（styles.css の @media print）
// 元のアプリ（役員報酬・退職金 比較シミュレーター）の提案資料PDFを参考にした A4横4ページ。年次の明細は入れない

const PAGES = 4

// 4ページ目「ご注意」（2026-10-26 確認済みの文面）
const DISCLAIMER = [
  '本資料は、ご入力いただいた条件と作成日時点の前提に基づく簡易的な試算であり、将来の金額や効果を保証するものではありません。',
  '法人税・損金算入額は、法人実効税率と損金割合による概算です。税率の段階・繰越欠損金・税額控除などは計算していません。',
  '解約返戻金・解約返戻率は試算上の仮定値です。実際の金額は、保険会社が発行する設計書・契約内容をご確認ください。',
  '企業型DCの運用利回りは仮定であり、保証されたものではありません。DC加入者資産は加入者個人の資産で、会社の資産ではありません。',
  '保険料の損金算入などの税務上の取扱いは、個別の事情により異なります。実行にあたっては、税理士等の専門家にご相談ください。',
  '本資料の利用により生じた損害について、作成者は責任を負いかねます。',
]

function printTitle(companyName: string): string {
  const name = companyName.trim()
  return name ? `${name}様　会社のキャッシュ増加のご提案` : '会社のキャッシュ増加のご提案'
}

function PrintPage({ no, children }: { no: number; children: ReactNode }) {
  return (
    <section className="print-page">
      <div className="print-top-band" />
      {children}
      <footer className="print-footer">
        <img src={LOGO_WHITE} alt="Fantree・Marketing" />
        <span>{APP_NAME}</span>
        <span className="print-page-no">
          {no} / {PAGES}
        </span>
      </footer>
    </section>
  )
}

const insuranceText = (plan: InsurancePlan, input: FundInput) => {
  if (!plan.enabled) return '使わない'
  const rate = (r: number | null) => (r === null ? '未入力' : formatRate(r))
  const paidUp = input.paidUpYears === null ? '' : `／${input.paidUpYears}年で払済 ${rate(plan.paidUpRate)}`
  return `年間保険料 ${formatManYen(plan.annualPremium)}・損金割合 ${formatRate(plan.deductibleRate)}・返戻率 通常 ${rate(plan.maturityRate)}${paidUp}`
}

// 4ページ目「比較条件」: 入力した値
function Conditions({ companyName, input }: { companyName: string; input: FundInput }) {
  const { dc, payCut } = input
  const rows: [string, string][] = [
    ['法人名', companyName.trim() || '（空欄）'],
    ['年間法人利益', formatManYen(input.annualProfit)],
    ['比較期間', `${input.years}年`],
    ['法人実効税率（概算）', formatRate(input.corporateTaxRate)],
    [
      '企業型DC',
      dc.members > 0
        ? `${dc.members}人・1人あたり月額 ${formatYen(dc.monthlyPerMember)}・運用年率 ${formatRate(dc.annualReturnRate)}・拠出 ${dc.contributionYears}年`
        : '使わない',
    ],
    ['福利厚生保険', insuranceText(input.welfare, input)],
    ['役員保険', insuranceText(input.officer, input)],
    [
      '役員報酬の減額',
      payCut.enabled ? `${payCut.officers}人・1人あたり月額 ${formatYen(payCut.monthlyCutPerOfficer)}` : 'しない',
    ],
  ]
  if (payCut.enabled && payCut.socialInsurance) {
    const si = payCut.socialInsurance
    rows.push(['社会保険料の減少', `減額前の報酬月額 ${formatYen(si.payBefore)}・${si.age}歳・${si.prefecture}`])
  }
  return (
    <dl className="print-conditions">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function FundPrint({
  companyName,
  input,
  result,
  showReference,
  date,
}: {
  companyName: string
  input: FundInput
  result: FundResult
  showReference: boolean
  date: Date
}) {
  const columns = columnsFor(result, input)
  const years = input.years
  const insurance = usesInsurance(input)
  return (
    <div className="print-report">
      <PrintPage no={1}>
        <header className="print-title">
          <h1>{printTitle(companyName)}</h1>
          <p>作成日：{formatDate(date)}</p>
        </header>
        <div className="print-cols">
          <div>
            <h3>ご提案の目的</h3>
            <p>
              毎年の法人利益を、そのまま法人税を払って現金で残す場合と、企業型DC・保険・役員報酬の見直しを組み合わせる場合とで、{years}
              年後に会社に残るお金と、DC加入者（個人）の資産がどう変わるかを比べたご提案です。
            </p>
            <h3>ご提案の考え方</h3>
            <ul className="plain">
              <li>利益をそのまま残すと、法人税（概算{formatPercent(input.corporateTaxRate)}）を払った残りだけが現金として残ります。</li>
              <li>企業型DCの掛金は、会社が福利厚生費として出すため会社の費用になります。掛金は加入者個人の資産として運用され、会社の資産にはなりません。</li>
              <li>法人契約の保険は、保険料のうち損金にできる割合の分だけ法人税が減り、解約返戻金は会社の資産になります。損金にならない分には法人税がかかります。</li>
              <li>保険料を数年で払い終える「払済」にすると、その後は保険料の支払いがなくなります。解約返戻金は、保険会社の設計書の返戻率によります。</li>
            </ul>
          </div>
          <div>
            <h3>比較するケース</h3>
            <ul className="plain">
              <li>対策なし：年間利益{formatManYen(input.annualProfit)}に法人税をかけ、残りを現金で残した場合</li>
              {insurance ? (
                <>
                  <li>対策あり（通常）：DC・保険・役員報酬の見直しを、保険料を期間の最後まで払う形で組み合わせた場合</li>
                  {input.paidUpYears !== null && <li>対策あり（{input.paidUpYears}年で払済）：保険料をその年数で払い終えた場合</li>}
                </>
              ) : (
                <li>対策あり：DC・役員報酬の見直しを組み合わせた場合</li>
              )}
            </ul>
            <h3>お金の流れ（イメージ）</h3>
            <div className="print-flow">
              <div><span className="box">会社</span><span className="arrow">法人税 ▶</span><span className="box">国</span><span className="note">戻ってこない</span></div>
              <div><span className="box">会社</span><span className="arrow">保険料 ▶</span><span className="box ins">保険</span><span className="note">解約返戻金は会社の資産</span></div>
              <div><span className="box">会社</span><span className="arrow">DC掛金 ▶</span><span className="box dc">加入者個人</span><span className="note">会社の資産ではない</span></div>
            </div>
          </div>
        </div>
      </PrintPage>

      <PrintPage no={2}>
        <h2 className="print-heading">比較結果の要約（{years}年後）</h2>
        <Conclusion result={result} columns={columns} years={years} />
        <Kpis columns={columns} years={years} />
        <div className="print-cols">
          <div>
            <h3>{years}年後の資産の比較（万円）</h3>
            <AssetChart columns={columns} years={years} />
          </div>
          <div>
            <h3>法人の現金の推移（増加の累計・万円）</h3>
            <CashChart result={result} columns={columns} years={years} />
          </div>
        </div>
      </PrintPage>

      <PrintPage no={3}>
        <h2 className="print-heading">比較表</h2>
        <CompareTable columns={columns} years={years} showReference={showReference} />
      </PrintPage>

      <PrintPage no={4}>
        <h2 className="print-heading">比較条件・計算の根拠・前提・ご注意</h2>
        <div className="print-cols">
          <div>
            <h3>比較条件</h3>
            <Conditions companyName={companyName} input={input} />
            <h3>計算の根拠</h3>
            <BasisList input={input} result={result} />
          </div>
          <div>
            <h3>注意</h3>
            <WarningList result={result} />
            <h3>計算の前提・計算していないこと</h3>
            <AssumptionList />
            <h3>ご注意</h3>
            <ul className="plain print-disclaimer">
              {DISCLAIMER.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </PrintPage>
    </div>
  )
}
