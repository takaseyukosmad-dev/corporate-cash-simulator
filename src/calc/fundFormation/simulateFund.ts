import { monthlySocialInsurance } from '../tax/socialInsurance.ts'
import { dcAssetByYear } from './dc.ts'
import type {
  BaseYearRow,
  FundInput,
  FundResult,
  FundTotals,
  FundWarning,
  FundYearRow,
  InsuranceOutcome,
  InsurancePlan,
  ScenarioKey,
  ScenarioResult,
} from './types.ts'

// 計算（要件定義 4章）。確定申告上の税額ではなく概算
//   課税対象利益（概算） = 利益 P ＋ 報酬減額 R ＋ 会社負担社保の減少 S − DC会社負担 D − 保険料 × 損金割合
//   法人税（概算）       = max(0, 課税対象利益) × 実効税率（マイナスにしない。欠損金の繰越は計算しない）
//   現金の増加           = P ＋ R ＋ S − D − 保険料（損金にならない分も含めて全額） − 法人税
// DC掛金は加入者の資産になるため、法人の現金・資産には含めない

const pct = (rate: number) => rate / 100

// その年の利益（年別の利益があればそれを使う）
export function profitIn(input: FundInput, year: number): number {
  return input.profitByYear?.[year - 1] ?? input.annualProfit
}
const taxOf = (taxable: number, ratePercent: number) => Math.max(0, taxable) * pct(ratePercent)

// 役員報酬の減額による会社負担の社会保険料の減少（年額）。会社負担は個人負担と同額とする（「役員報酬・退職金 比較シミュレーター」の決定D10）
export function socialInsuranceSaving(input: FundInput): number {
  const { payCut } = input
  if (!payCut.enabled || !payCut.socialInsurance || payCut.officers <= 0) return 0
  const { payBefore, age, prefecture } = payCut.socialInsurance
  const after = Math.max(0, payBefore - payCut.monthlyCutPerOfficer)
  const monthly = monthlySocialInsurance(payBefore, age, prefecture).total - monthlySocialInsurance(after, age, prefecture).total
  return monthly * 12 * payCut.officers
}

// 役員個人の負担分の社会保険料の減少（年額）。会社負担と同額（決定D10）。法人の現金・資産には足さない（決定C21）
export function personalSocialInsuranceSaving(input: FundInput): number {
  return socialInsuranceSaving(input)
}

export function annualPayCut(input: FundInput): number {
  const { payCut } = input
  return payCut.enabled ? payCut.officers * payCut.monthlyCutPerOfficer * 12 : 0
}

export function annualDcContribution(input: FundInput): number {
  return input.dc.members * input.dc.monthlyPerMember * 12
}

// 試算するケース。払済の年数が入っていれば「通常」と「払済」、なければ「通常」だけ（決定C19）
export function scenarioKeys(input: Pick<FundInput, 'paidUpYears'>): ScenarioKey[] {
  return input.paidUpYears === null ? ['maturity'] : ['maturity', 'paidUp']
}

export function scenarioLabel(key: ScenarioKey, input: Pick<FundInput, 'paidUpYears'>): string {
  if (key === 'maturity') return '通常（期間末まで払込）'
  return `${input.paidUpYears}年で払済`
}

// 保険料を払う年数。払済年数が比較期間以上なら通常と同じ
function premiumYearsFor(key: ScenarioKey, input: FundInput): number {
  if (key === 'maturity' || input.paidUpYears === null) return input.years
  return Math.min(input.years, input.paidUpYears)
}

function rateFor(plan: InsurancePlan, key: ScenarioKey): number | null {
  return key === 'maturity' ? plan.maturityRate : plan.paidUpRate
}

// 比較期間末の解約返戻金 = その時点までに払った保険料の合計 × 入力された返戻率。途中の年は計算しない（推測しない）
function insuranceOutcome(plan: InsurancePlan, key: ScenarioKey, premiumYears: number): InsuranceOutcome | null {
  if (!plan.enabled) return null
  const premiumTotal = plan.annualPremium * premiumYears
  const rate = rateFor(plan, key)
  return { premiumYears, premiumTotal, rate, surrenderValue: rate === null ? null : premiumTotal * pct(rate) }
}

function baseRows(input: FundInput): BaseYearRow[] {
  const rows: BaseYearRow[] = []
  let cash = 0
  let tax = 0
  for (let year = 1; year <= input.years; year++) {
    const profit = profitIn(input, year)
    const corporateTax = taxOf(profit, input.corporateTaxRate)
    const cashFlow = profit - corporateTax
    cash += cashFlow
    tax += corporateTax
    rows.push({ year, taxableIncome: profit, corporateTax, cashFlow, cashCumulative: cash, taxCumulative: tax })
  }
  return rows
}

function scenarioRows(input: FundInput, premiumYears: { welfare: number; officer: number }, siSaving: number): FundYearRow[] {
  const { dc, welfare, officer } = input
  const payCut = annualPayCut(input)
  const dcMonthly = dc.members * dc.monthlyPerMember
  const dcAssets = dcAssetByYear(dcMonthly, dc.annualReturnRate, dc.contributionYears, input.years)
  const rows: FundYearRow[] = []
  let cash = 0
  let tax = 0
  let premiums = 0
  let dcContribCum = 0
  for (let year = 1; year <= input.years; year++) {
    const dcContribution = year <= dc.contributionYears ? dcMonthly * 12 : 0
    // 選択制（給与から振替）は、給与の減少と掛金が相殺されるため会社の費用は増えない（二重計上しない）
    const dcCompanyCost = dc.funding === 'employer' ? dcContribution : 0
    const welfarePremium = welfare.enabled && year <= premiumYears.welfare ? welfare.annualPremium : 0
    const officerPremium = officer.enabled && year <= premiumYears.officer ? officer.annualPremium : 0
    const deductibleInsurance = welfarePremium * pct(welfare.deductibleRate) + officerPremium * pct(officer.deductibleRate)
    const profit = profitIn(input, year)
    const taxableIncome = profit + payCut + siSaving - dcCompanyCost - deductibleInsurance
    const corporateTax = taxOf(taxableIncome, input.corporateTaxRate)
    const cashFlow = profit + payCut + siSaving - dcCompanyCost - welfarePremium - officerPremium - corporateTax
    cash += cashFlow
    tax += corporateTax
    premiums += welfarePremium + officerPremium
    dcContribCum += dcContribution
    rows.push({
      year,
      payCut,
      socialInsuranceSaving: siSaving,
      dcContribution,
      dcCompanyCost,
      welfarePremium,
      officerPremium,
      deductibleInsurance,
      taxableIncome,
      corporateTax,
      cashFlow,
      cashCumulative: cash,
      taxCumulative: tax,
      premiumCumulative: premiums,
      dcAsset: dcAssets[year - 1],
      dcContributionCumulative: dcContribCum,
    })
  }
  return rows
}

function totals(cash: number, corporateTax: number, insurance: number | null, dcAsset: number, dcContribution: number): FundTotals {
  const corporateAssets = insurance === null ? null : cash + insurance
  return {
    corporateTax,
    cash,
    insurance,
    corporateAssets,
    dcAsset,
    dcContribution,
    referenceTotal: corporateAssets === null ? null : corporateAssets + dcAsset,
  }
}

const sub = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b)

function diffTotals(after: FundTotals, before: FundTotals): FundTotals {
  return {
    corporateTax: after.corporateTax - before.corporateTax,
    cash: after.cash - before.cash,
    insurance: sub(after.insurance, before.insurance),
    corporateAssets: sub(after.corporateAssets, before.corporateAssets),
    dcAsset: after.dcAsset - before.dcAsset,
    dcContribution: after.dcContribution - before.dcContribution,
    referenceTotal: sub(after.referenceTotal, before.referenceTotal),
  }
}

function scenario(key: ScenarioKey, input: FundInput, siSaving: number, baseTotals: FundTotals): ScenarioResult {
  const years = premiumYearsFor(key, input)
  const premiumYears = { welfare: years, officer: years }
  const rows = scenarioRows(input, premiumYears, siSaving)
  const last = rows[rows.length - 1]
  const welfare = insuranceOutcome(input.welfare, key, premiumYears.welfare)
  const officer = insuranceOutcome(input.officer, key, premiumYears.officer)
  const outcomes = [welfare, officer].filter((o): o is InsuranceOutcome => o !== null)
  const insurance = outcomes.some((o) => o.surrenderValue === null)
    ? null
    : outcomes.reduce((sum, o) => sum + (o.surrenderValue ?? 0), 0)
  const t = totals(last.cashCumulative, last.taxCumulative, insurance, last.dcAsset, last.dcContributionCumulative)
  return {
    key,
    label: scenarioLabel(key, input),
    premiumYears,
    rows,
    welfare,
    officer,
    totals: t,
    diff: diffTotals(t, baseTotals),
    firstYear: rows[0],
  }
}

const usesInsurance = (input: FundInput) => input.welfare.enabled || input.officer.enabled

// 計算はできるが、前提から外れる・現実的でない条件の注意
function warningsFor(input: FundInput, base: BaseYearRow[], scenarios: ScenarioResult[]): FundWarning[] {
  const w: string[] = []
  const profits = base.map((r) => r.taxableIncome)
  const allPositive = profits.every((p) => p > 0)
  if (!allPositive) {
    w.push('年間法人利益が0円以下の年があります。法人税は0円として計算しています（繰越欠損金などは計算していません）。')
  }
  for (const s of scenarios) {
    const minusYear = s.rows.find((r) => r.taxableIncome < 0)
    if (minusYear && allPositive) {
      w.push(`「${s.label}」では${minusYear.year}年目に課税対象利益の概算がマイナスになります。法人税は0円として計算し、欠損金の繰越は計算していません。`)
    }
    const shortYear = s.rows.find((r) => r.cashCumulative < 0)
    if (shortYear) {
      w.push(`「${s.label}」では${shortYear.year}年目に法人の現金の増加の累計がマイナスになります（現金が足りない可能性）。期首の現金残高は計算に含めていません。`)
    }
  }
  const outflow = annualDcContribution(input) * (input.dc.funding === 'employer' ? 1 : 0) +
    (input.welfare.enabled ? input.welfare.annualPremium : 0) +
    (input.officer.enabled ? input.officer.annualPremium : 0)
  if (allPositive && profits.some((p) => outflow > p + annualPayCut(input))) {
    w.push('保険料とDCの会社負担の合計が、年間法人利益と役員報酬の減額の合計を超えています。払い続けられるか確認してください。')
  }
  if (usesInsurance(input)) {
    const y = input.paidUpYears
    if (y !== null && y >= input.years) w.push(`払済の年数（${y}年）が比較期間（${input.years}年）以上のため、そのケースは通常と同じ払い方になります。`)
  }
  const dcMonthly = input.dc.monthlyPerMember
  if (input.dc.members > 0 && (dcMonthly < 3_000 || dcMonthly > 62_000)) {
    w.push('DCの1人あたり月額掛金が、打ち合わせで想定した範囲（3,000〜62,000円）の外です。制度上の上限・適用時期・他制度の掛金との調整を確認してください。')
  }
  if (input.dc.contributionYears < input.years && input.dc.members > 0) {
    w.push(`DCの拠出期間（${input.dc.contributionYears}年）が比較期間より短いため、拠出をやめた後も運用だけ続くものとしています。`)
  }
  if (base.length === 0) w.push('比較期間が0年です。')
  return w.map((message) => ({ message }))
}

export function simulateFund(input: FundInput): FundResult {
  const siSaving = socialInsuranceSaving(input)
  const rows = baseRows(input)
  const last = rows[rows.length - 1]
  // 対策なし: 保険・DCはない（保険評価額は0円）
  const baseTotals = totals(last.cashCumulative, last.taxCumulative, 0, 0, 0)
  const scenarios = scenarioKeys(input).map((key) => scenario(key, input, siSaving, baseTotals))
  return {
    base: { rows, totals: baseTotals, firstYear: rows[0] },
    scenarios,
    annualSocialInsuranceSaving: siSaving,
    annualPersonalSocialInsuranceSaving: personalSocialInsuranceSaving(input),
    socialInsuranceComputed: input.payCut.enabled && input.payCut.socialInsurance !== null,
    warnings: warningsFor(input, rows, scenarios),
  }
}
