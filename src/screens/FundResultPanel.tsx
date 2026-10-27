import { useState } from 'react'
import { annualDcContribution, annualPayCut, profitIn } from '../calc/fundFormation/simulateFund.ts'
import type { FundInput, FundResult, FundYearRow, InsuranceOutcome, ScenarioResult } from '../calc/fundFormation/types.ts'
import { formatMan, formatRate, formatSignedYen, formatYen } from '../shared/format.ts'
import { formatManYen, formatSignedManYen } from '../shared/money.ts'
import { AssetBarChart, CashLineChart } from './FundCharts.tsx'
import { type Column, columnsFor, NOT_ENTERED } from './fundColumns.ts'

// 右側（結果）。概要KPI → グラフ → 明細テーブル → 計算根拠 の順（要件定義 5章）
// 結論・概要・グラフ・比較表・根拠・前提は、印刷（FundPrint.tsx）でも同じ部品を使う

const SCENARIO_CLASS = { maturity: 'fl-1', paidUp: 'fl-2' } as const

const yen = (v: number | null) => (v === null ? NOT_ENTERED : formatYen(v))
const signed = (v: number | null) => (v === null ? NOT_ENTERED : formatSignedYen(v))

// 概要KPI: 対策ありの各ケースの、法人資産とDC加入者資産を分けて示す
export function Kpis({ columns, years }: { columns: Column[]; years: number }) {
  const base = columns[0]
  return (
    <section className="fund-kpis" aria-label="概要">
      {columns.map((c) => (
        <div key={c.key} className={c.key === 'base' ? 'fund-kpi base' : 'fund-kpi'}>
          <p className="fund-kpi-title">{c.label}</p>
          <p className="fund-kpi-caption">{`法人保有（現金＋保険）・${years}年後`}</p>
          <p className="fund-kpi-value">{c.totals.corporateAssets === null ? `現金 ${formatManYen(c.totals.cash)}` : formatManYen(c.totals.corporateAssets)}</p>
          {c.totals.corporateAssets === null && <p className="fund-kpi-missing">＋保険（{NOT_ENTERED}のため計算していません）</p>}
          {c.diff && (
            <p className="fund-kpi-diff">
              対策なしとの差 {c.diff.corporateAssets === null ? '—' : formatSignedManYen(c.diff.corporateAssets)}
            </p>
          )}
          <dl className="fund-kpi-sub">
            <div>
              <dt>法人税の累計（概算）</dt>
              <dd>{formatManYen(c.totals.corporateTax)}</dd>
            </div>
            {c.key !== 'base' && (
              <div className="dc">
                <dt>DC加入者資産（個人）</dt>
                <dd>{formatManYen(c.totals.dcAsset)}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
      <p className="muted fund-kpi-note">
        DC加入者資産は加入者個人の資産で、法人の現金・資産ではありません。対策なしの法人保有は{formatManYen(base.totals.cash)}（現金のみ）です。
      </p>
    </section>
  )
}

type Row = { label: string; pick: (c: Column) => string; note?: string }

export function CompareTable({ columns, years, showReference, personalSi }: { columns: Column[]; years: number; showReference: boolean; personalSi: number }) {
  const scenarioOnly = (f: (s: ScenarioResult) => string) => (c: Column) => (c.scenario ? f(c.scenario) : '—')
  const first = (f: (r: FundYearRow) => number) => scenarioOnly((s) => formatYen(f(s.firstYear)))
  const insuranceText = (pick: (o: InsuranceOutcome) => string) => (o: InsuranceOutcome | null) => (o ? pick(o) : '使わない')
  const maturity = columns.find((c) => c.scenario?.key === 'maturity')?.scenario
  const premiumTotal = (s: ScenarioResult) => (s.welfare?.premiumTotal ?? 0) + (s.officer?.premiumTotal ?? 0)
  // 払済の列だけ、通常との差を出す（対策なし・通常の列は「—」）
  const vsMaturity = (f: (s: ScenarioResult) => number | null) => (c: Column) => {
    if (!maturity || !c.scenario || c.scenario.key === 'maturity') return '—'
    const a = f(c.scenario)
    const b = f(maturity)
    return a === null || b === null ? NOT_ENTERED : formatSignedYen(a - b)
  }
  const groups: { title: string; rows: Row[] }[] = [
    // 打ち合わせ相手の依頼（2026-10-27）: 対策なしとの差を表の一番上に（決定C22）
    {
      title: '対策なしとの差（対策あり − 対策なし）',
      rows: [
        { label: '法人税の累計', pick: (c) => (c.diff ? signed(c.diff.corporateTax) : '—') },
        { label: '法人に残る現金', pick: (c) => (c.diff ? signed(c.diff.cash) : '—') },
        { label: '法人保有の現金＋保険評価額', pick: (c) => (c.diff ? signed(c.diff.corporateAssets) : '—') },
        { label: 'DC加入者資産（個人）', pick: (c) => (c.diff ? signed(c.diff.dcAsset) : '—') },
        ...(showReference ? [{ label: '参考総額', pick: (c: Column) => (c.diff ? signed(c.diff.referenceTotal) : '—') }] : []),
      ],
    },
    {
      title: `${years}年後（比較期間末）`,
      rows: [
        { label: '法人税の累計（概算）', pick: (c) => yen(c.totals.corporateTax) },
        { label: '法人に残る現金（増加の累計）', pick: (c) => yen(c.totals.cash) },
        { label: '法人保有保険の解約返戻金', pick: (c) => yen(c.totals.insurance) },
        { label: '法人保有の現金＋保険評価額', pick: (c) => yen(c.totals.corporateAssets) },
        { label: 'DC加入者資産（個人の資産）', pick: (c) => yen(c.totals.dcAsset) },
        { label: 'DC掛金の累計', pick: (c) => yen(c.totals.dcContribution) },
        ...(showReference ? [{ label: '参考総額（法人保有＋DC加入者資産。帰属が異なる合計）', pick: (c: Column) => yen(c.totals.referenceTotal) }] : []),
      ],
    },
    // 打ち合わせ（2026-10-23）: 通常と払済の差が分かればよい
    ...(maturity && columns.some((c) => c.scenario && c.scenario.key !== 'maturity')
      ? [
          {
            title: '通常（期間末まで払込）との差（払済 − 通常）',
            rows: [
              { label: '払った保険料の合計', pick: vsMaturity((s) => premiumTotal(s)) },
              { label: '法人保有保険の解約返戻金', pick: vsMaturity((s) => s.totals.insurance) },
              { label: '法人に残る現金', pick: vsMaturity((s) => s.totals.cash) },
              { label: '法人保有の現金＋保険評価額', pick: vsMaturity((s) => s.totals.corporateAssets) },
              { label: '法人税の累計', pick: vsMaturity((s) => s.totals.corporateTax) },
            ],
          },
        ]
      : []),
    {
      title: '初年度（1年目）',
      rows: [
        { label: '役員報酬の減額（会社の支出が減る）', pick: first((r) => r.payCut) },
        { label: '社会保険料の減少: 会社負担分（会社の現金が増える）', pick: first((r) => r.socialInsuranceSaving) },
        { label: '社会保険料の減少: 役員個人の負担分（参考。会社の現金には入らない）', pick: scenarioOnly(() => formatYen(personalSi)) },
        { label: '社会保険料の減少: 合計（会社＋役員個人）', pick: first((r) => r.socialInsuranceSaving + personalSi) },
        { label: 'DC掛金のうち会社の費用', pick: first((r) => r.dcCompanyCost) },
        { label: '保険料（福利厚生＋役員）', pick: first((r) => r.welfarePremium + r.officerPremium) },
        { label: '保険料のうち損金算入額（概算）', pick: first((r) => r.deductibleInsurance) },
        { label: '課税対象利益（概算）', pick: (c) => formatYen(c.scenario ? c.scenario.firstYear.taxableIncome : c.baseFirst!.taxableIncome) },
        { label: '法人税（概算）', pick: (c) => formatYen(c.scenario ? c.scenario.firstYear.corporateTax : c.baseFirst!.corporateTax) },
        { label: '法人の現金の増加', pick: (c) => formatYen(c.scenario ? c.scenario.firstYear.cashFlow : c.baseFirst!.cashFlow) },
      ],
    },
    {
      title: '保険（法人契約）',
      rows: [
        { label: '福利厚生保険: 払込年数', pick: scenarioOnly((s) => insuranceText((o) => `${o.premiumYears}年`)(s.welfare)) },
        { label: '福利厚生保険: 払った保険料の合計', pick: scenarioOnly((s) => insuranceText((o) => formatYen(o.premiumTotal))(s.welfare)) },
        { label: '福利厚生保険: 期間末の返戻率（入力値）', pick: scenarioOnly((s) => insuranceText((o) => (o.rate === null ? '未入力' : formatRate(o.rate)))(s.welfare)) },
        { label: '役員保険: 払込年数', pick: scenarioOnly((s) => insuranceText((o) => `${o.premiumYears}年`)(s.officer)) },
        { label: '役員保険: 払った保険料の合計', pick: scenarioOnly((s) => insuranceText((o) => formatYen(o.premiumTotal))(s.officer)) },
        { label: '役員保険: 期間末の返戻率（入力値）', pick: scenarioOnly((s) => insuranceText((o) => (o.rate === null ? '未入力' : formatRate(o.rate)))(s.officer)) },
      ],
    },
  ]
  return (
    <div className="fund-table-wrap">
      <table className="fund-table">
        <thead>
          <tr>
            <th>項目</th>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => [
            <tr key={g.title} className="group">
              <th colSpan={columns.length + 1}>{g.title}</th>
            </tr>,
            ...g.rows.map((r) => (
              <tr key={`${g.title}-${r.label}`}>
                <th>{r.label}</th>
                {columns.map((c) => (
                  <td key={c.key} data-label={c.label}>
                    {r.pick(c)}
                  </td>
                ))}
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  )
}

function YearTable({ result, scenarios }: { result: FundResult; scenarios: ScenarioResult[] }) {
  const [key, setKey] = useState(scenarios[0].key)
  const s = scenarios.find((x) => x.key === key) ?? scenarios[0]
  const man = (v: number) => formatMan(v)
  return (
    <>
      {scenarios.length > 1 && (
        <div className="fund-year-select">
          <label htmlFor="fund-year-scenario">表示するケース</label>
          <select id="fund-year-scenario" value={s.key} onChange={(e) => setKey(e.target.value as typeof key)}>
            {scenarios.map((x) => (
              <option key={x.key} value={x.key}>
                対策あり：{x.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="fund-table-wrap">
        <table className="fund-table fund-year-table">
          <thead>
            <tr>
              <th>年</th>
              <th>報酬減額＋社保減</th>
              <th>DC会社負担</th>
              <th>保険料</th>
              <th>損金算入</th>
              <th>課税対象利益（概算）</th>
              <th>法人税（概算）</th>
              <th>現金の増加</th>
              <th>法人の現金（累計）</th>
              <th>払った保険料（累計）</th>
              <th className="dc">DC加入者資産（個人）</th>
              <th>対策なしの現金（累計）</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r, i) => (
              <tr key={r.year} className={r.welfarePremium + r.officerPremium === 0 && i > 0 && s.rows[i - 1].welfarePremium + s.rows[i - 1].officerPremium > 0 ? 'stop' : undefined}>
                <th>{r.year}年目</th>
                <td>{man(r.payCut + r.socialInsuranceSaving)}</td>
                <td>{man(r.dcCompanyCost)}</td>
                <td>{man(r.welfarePremium + r.officerPremium)}</td>
                <td>{man(r.deductibleInsurance)}</td>
                <td className={r.taxableIncome < 0 ? 'neg' : undefined}>{man(r.taxableIncome)}</td>
                <td>{man(r.corporateTax)}</td>
                <td>{man(r.cashFlow)}</td>
                <td className="strong">{man(r.cashCumulative)}</td>
                <td>{man(r.premiumCumulative)}</td>
                <td className="dc">{man(r.dcAsset)}</td>
                <td>{man(result.base.rows[i].cashCumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        単位: 万円（万円未満は四捨五入）。法人保有保険の解約返戻金は、途中の年の返戻率が入力されていないため年次には表示しません（{s.rows.length}年後:{' '}
        {s.totals.insurance === null ? NOT_ENTERED : `${formatMan(s.totals.insurance)}万円`}）。色つきの行は保険料の払込を止めた最初の年です。
      </p>
    </>
  )
}

// 業務確認用: 計算式と入力値
export function BasisList({ input, result }: { input: FundInput; result: FundResult }) {
  const t = input.corporateTaxRate
  const dc = input.dc
  return (
      <ul className="plain">
        <li>年間法人利益 P = {formatYen(input.annualProfit)}（現在の役員報酬を払った後、対策前）。{input.years}年間毎年同じとしています。</li>
        <li>
          役員報酬の減額 R = {input.payCut.officers}人 × {formatYen(input.payCut.monthlyCutPerOfficer)} × 12か月 = {formatYen(annualPayCut(input))}／年
          {result.socialInsuranceComputed ? `、会社負担の社会保険料の減少 S = ${formatYen(result.annualSocialInsuranceSaving)}／年（令和8年度の料率。役員個人の負担分も同じ ${formatYen(result.annualPersonalSocialInsuranceSaving)}／年減りますが、会社の現金には入れません）` : '、会社負担の社会保険料の減少 S は計算していません（0円）'}
        </li>
        <li>
          DC掛金 = {dc.members}人 × {formatYen(dc.monthlyPerMember)} × 12か月 = {formatYen(annualDcContribution(input))}／年（{dc.contributionYears}年間）。
          会社が福利厚生費として拠出するため、全額を会社の費用 D とします。
          運用は毎月末拠出・年率{formatRate(dc.annualReturnRate)}を月の複利に換算（非保証）。
        </li>
        <li>
          保険料: 福利厚生 {input.welfare.enabled ? `${formatYen(input.welfare.annualPremium)}／年・損金割合${formatRate(input.welfare.deductibleRate)}` : '使わない'}、役員{' '}
          {input.officer.enabled ? `${formatYen(input.officer.annualPremium)}／年・損金割合${formatRate(input.officer.deductibleRate)}` : '使わない'}
        </li>
        <li>課税対象利益（概算） = P ＋ R ＋ S − D − 保険料 × 損金割合</li>
        <li>法人税（概算） = max(0, 課税対象利益) × 法人実効税率{formatRate(t)}（マイナスにしない）</li>
        <li>法人の現金の増加 = P ＋ R ＋ S − D − 保険料（全額） − 法人税。損金にならない保険料も現金からは出ていきます。</li>
        <li>解約返戻金（比較期間末） = 払った保険料の合計 × 入力された返戻率。払済ケースは払込年数で保険料を止めます。</li>
        <li>参考総額 = 法人保有の現金＋保険評価額 ＋ DC加入者資産（帰属が異なるものを足した参考値）</li>
      </ul>
  )
}

function Basis({ input, result }: { input: FundInput; result: FundResult }) {
  return (
    <details className="card fund-basis">
      <summary>計算の根拠（式と入力値）を見る</summary>
      <BasisList input={input} result={result} />
    </details>
  )
}

// 結論の2文
// 結論: 法人現金＋法人保険返戻金＋個人DC資産の合計で、対策なしと比べる（決定C20。打ち合わせ相手の文のとおり）。
// 個人DC資産は法人の資産ではないため、2行目に金額を分けて示す
export function Conclusion({ result, columns, years }: { result: FundResult; columns: Column[]; years: number }) {
  const main = columns[1].scenario!
  const parts = [
    '法人現金',
    ...(main.welfare || main.officer ? ['法人保険返戻金'] : []),
    ...(main.totals.dcAsset > 0 ? ['個人DC資産'] : []),
  ].join('＋')
  // 画面に出す「法人保有」「個人DC資産」（万円に丸めた値）を足した合計にする（読んだ人が足し算して1万円ずれないように）
  const man = (v: number) => Math.round(v / 10_000) * 10_000
  const corporate = main.totals.corporateAssets
  const total = corporate === null ? null : man(corporate) + man(main.totals.dcAsset)
  const diff = total === null ? null : total - man(result.base.totals.cash)
  const base = `対策なしの場合の法人現金 ${formatManYen(result.base.totals.cash)}`
  return (
    <section className="conclusion" aria-label="結論">
      {total === null || diff === null ? (
        <p className="conclusion-lead">
          {years}年後、対策あり：{parts}の合計は、保険の返戻率が<strong className="conclusion-amount">{NOT_ENTERED}</strong>のため計算していません（{base}）。
        </p>
      ) : (
        <p className="conclusion-lead">
          {years}年後、対策あり：{parts}で<strong className="conclusion-amount">{formatManYen(total)}</strong>となり、{base}と比べて、
          {diff === 0 ? (
            '手残りはほぼ変わりません。'
          ) : (
            <>
              <strong>{formatManYen(diff)}</strong>
              {diff > 0 ? '手残りが増えます。' : '手残りが減ります。'}
            </>
          )}
        </p>
      )}
      <p className="conclusion-sub">（個人DC資産は {formatManYen(main.totals.dcAsset)}です。いずれも概算で、保証された金額ではありません。）</p>
    </section>
  )
}

// 1年目の計算の流れ（決定C23）。対策前の利益から足し引きして、課税対象利益・法人税・現金の増加がなぜその額になるかを示す。
// 数字は「対策あり」の最初のケース（通常）の1年目。使っていない対策の行は出さない
export function FirstYearFlow({ columns, input, result }: { columns: Column[]; input: FundInput; result: FundResult }) {
  const r = columns[1].scenario!.firstYear
  const premiums = r.welfarePremium + r.officerPremium
  const rows: { sign: string; label: string; amount: number; note?: string; total?: boolean }[] = [
    { sign: '', label: '対策前の利益', amount: profitIn(input, 1) },
    ...(input.payCut.enabled
      ? [
          { sign: '＋', label: '役員報酬の減額', amount: r.payCut, note: '役員報酬は会社の経費です。減らすと経費が減るので、課税対象利益は増えます。' },
          {
            sign: '＋',
            label: '会社負担の社会保険料の減少',
            amount: r.socialInsuranceSaving,
            note: result.socialInsuranceComputed
              ? '会社が払う社会保険料も経費です。報酬を減らすと負担が下がって経費が減るので、課税対象利益は増えます（その分、会社の現金も増えます）。'
              : '減額前の報酬月額などを入れると計算します（今は0円）。',
          },
        ]
      : []),
    ...(r.dcCompanyCost > 0
      ? [{ sign: '−', label: 'DC掛金', amount: r.dcCompanyCost, note: '会社が出すDC掛金は全額経費になるので、課税対象利益を減らします。掛金は加入者個人の資産になります。' }]
      : []),
    ...(premiums > 0
      ? [
          {
            sign: '−',
            label: '保険料のうち経費にできる分',
            amount: r.deductibleInsurance,
            note:
              premiums - r.deductibleInsurance > 0
                ? `保険料は損金割合の分だけ経費になり、課税対象利益を減らします。残りの ${formatYen(premiums - r.deductibleInsurance)}は経費にならず、法人税がかかります。`
                : '保険料は損金割合の分だけ経費になり、課税対象利益を減らします。',
          },
        ]
      : []),
    { sign: '＝', label: '課税対象利益（概算）', amount: r.taxableIncome, total: true },
    {
      sign: '',
      label: '法人税（概算）',
      amount: r.corporateTax,
      note: r.taxableIncome < 0 ? '課税対象利益がマイナスのため、法人税は0円としています。' : `課税対象利益 × 法人実効税率 ${formatRate(input.corporateTaxRate)}`,
    },
    {
      sign: '',
      label: '法人の現金の増加',
      amount: r.cashFlow,
      total: true,
      note: [
        '対策前の利益',
        ...(input.payCut.enabled ? ['＋ 報酬減額 ＋ 社保の減少'] : []),
        ...(r.dcCompanyCost > 0 ? ['− DC掛金'] : []),
        ...(premiums > 0 ? [`− 保険料（全額 ${formatYen(premiums)}）`] : []),
        `− 法人税${premiums > 0 ? '。経費にならない保険料も、現金からは出ていきます。' : ''}`,
      ].join(' '),
    },
  ]
  return (
    <table className="fund-flow">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.total ? 'total' : undefined}>
            <th scope="row">
              {row.sign && <span className="fund-flow-sign">{row.sign}</span>}
              {row.label}
            </th>
            <td className="fund-flow-amount">{formatYen(row.amount)}</td>
            <td className="fund-flow-note">{row.note ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 期間末の資産のグラフと凡例
export function AssetChart({ columns, years }: { columns: Column[]; years: number }) {
  return (
    <>
      <div className="chart-scroll">
        <AssetBarChart
          years={years}
          columns={columns.map((c) => ({
            label: c.key === 'base' ? '対策なし' : (c.scenario?.label ?? ''),
            cash: c.totals.cash,
            insurance: c.totals.insurance,
            hasInsurance: !!c.scenario && (!!c.scenario.welfare || !!c.scenario.officer),
            dcAsset: c.totals.dcAsset,
          }))}
        />
      </div>
      <ul className="legend">
        <li><span className="fund-swatch cash" />法人の現金</li>
        <li><span className="fund-swatch ins" />法人保有保険の解約返戻金（入力した返戻率）</li>
        <li><span className="fund-swatch dc" />DC加入者資産（個人の資産。法人のものではない）</li>
      </ul>
    </>
  )
}

// 法人の現金の推移のグラフと注記
export function CashChart({ result, columns, years }: { result: FundResult; columns: Column[]; years: number }) {
  const scenarios = columns.flatMap((c) => (c.scenario ? [c.scenario] : []))
  return (
    <>
      <div className="chart-scroll">
        <CashLineChart
          years={years}
          series={[
            { key: 'base', label: '対策なし', className: 'fl-0', values: result.base.rows.map((r) => r.cashCumulative) },
            ...scenarios.map((s) => ({ key: s.key, label: columns.length <= 2 ? '対策あり' : s.key === 'maturity' ? '通常' : s.label, className: SCENARIO_CLASS[s.key], values: s.rows.map((r) => r.cashCumulative) })),
          ]}
        />
      </div>
      <p className="muted">保険の解約返戻金とDC加入者資産はこのグラフに含めていません（途中の年の返戻率が分からないため、推測して描きません）。</p>
    </>
  )
}

export function WarningList({ result }: { result: FundResult }) {
  return result.warnings.length === 0 ? (
    <p className="muted">この条件では注意はありません。</p>
  ) : (
    result.warnings.map((w) => (
      <p key={w.message} className="warning">
        {w.message}
      </p>
    ))
  )
}

export function AssumptionList() {
  return (
    <ul className="plain">
      <li>税額・保険の損金算入はすべて<strong>概算</strong>です。実際の税額は、税率の段階・繰越欠損金・税額控除・保険契約の内容と税務処理によって変わります。個別に税理士・保険会社に確認してください。</li>
      <li>保険の返戻率・DCの運用利回りは入力された仮定で、<strong>保証された値ではありません</strong>。返戻率は保険設計書の値を入力してください。</li>
      <li>保険はすべて法人契約（解約返戻金は法人のもの）として計算しています。DC加入者資産は加入者個人のもので、法人の現金・資産には含めていません。</li>
      <li>法人の現金は「この期間に増える分」です。期首の現金残高、預金の利息は含めていません。</li>
      <li>退職金の支給とその税金、保険の解約益にかかる法人税、DCの受け取り時の税金、役員個人の所得税・住民税の変化は<strong>計算していません</strong>（将来の課題）。</li>
      <li>DCの掛金の上限・適用時期・他制度の掛金との調整は、制度の最新情報で確認してください。</li>
    </ul>
  )
}

// showReference: 比較表に参考総額を出すか。印刷にも同じ選択を使うため、画面（FundScreen）で持つ
export function FundResultPanel({
  input,
  result,
  showReference,
  onShowReferenceChange,
}: {
  input: FundInput
  result: FundResult
  showReference: boolean
  onShowReferenceChange: (show: boolean) => void
}) {
  const columns = columnsFor(result, input)
  const scenarios = columns.flatMap((c) => (c.scenario ? [c.scenario] : []))
  const years = input.years
  return (
    <div className="result-panel">
      <Conclusion result={result} columns={columns} years={years} />

      <Kpis columns={columns} years={years} />

      <section className="card chart-card">
        <h2>
          {years}年後の資産の比較<span className="period">万円。法人（現金＋法人保有保険）と個人（DC加入者資産）を分けて表示</span>
        </h2>
        <AssetChart columns={columns} years={years} />
      </section>

      <section className="card chart-card">
        <h2>
          法人の現金の推移<span className="period">増加の累計（万円）。期首の現金残高は含めません</span>
        </h2>
        <CashChart result={result} columns={columns} years={years} />
      </section>

      <section className="card table-card">
        <h2>比較表</h2>
        <label className="fund-toggle inline" htmlFor="fund-show-reference">
          <input id="fund-show-reference" type="checkbox" checked={showReference} onChange={(e) => onShowReferenceChange(e.target.checked)} />
          参考総額（法人保有＋DC加入者資産）も表示する
        </label>
        <CompareTable columns={columns} years={years} showReference={showReference} personalSi={result.annualPersonalSocialInsuranceSaving} />
      </section>

      <section className="card table-card">
        <h2>
          1年目の計算の流れ<span className="period">{columns[1].label}の1年目。課税対象利益・法人税・現金の増加が、なぜこの額になるか</span>
        </h2>
        <FirstYearFlow columns={columns} input={input} result={result} />
      </section>

      <section className="card table-card">
        <h2>年次の明細</h2>
        <YearTable result={result} scenarios={scenarios} />
      </section>

      <Basis input={input} result={result} />

      <section className="card">
        <h2>注意</h2>
        <WarningList result={result} />
      </section>

      <section className="card">
        <h2>計算の前提・計算していないこと</h2>
        <AssumptionList />
      </section>
    </div>
  )
}
