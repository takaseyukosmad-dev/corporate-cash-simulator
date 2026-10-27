import type { Prefecture } from '../../data/prefectures.ts'

// 会社のキャッシュ増加シミュレーターの入力と結果。金額はすべて円、率は % の数値（30% なら 30）。
// 計算の途中では丸めない（「役員報酬・退職金 比較シミュレーター」の決定D67と同じ。表示するときに丸める）

// 企業型DC
export type DcPlan = {
  members: number // 加入人数（0以上）
  monthlyPerMember: number // 1人あたり月額掛金（円）
  annualReturnRate: number // 運用年率 %（非保証の仮定）
  contributionYears: number // 拠出期間（年）。比較期間以下
  // employer: 会社が上乗せで負担する（会社の費用が増える）
  // salarySwap: 給与（役員報酬）から振り替える選択制。給与の減少と掛金が相殺されるため会社の費用は増えない
  funding: 'employer' | 'salarySwap'
}

// 法人契約の保険（福利厚生保険・役員保険で同じ形）
export type InsurancePlan = {
  enabled: boolean
  annualPremium: number // 年間保険料（円）
  deductibleRate: number // 損金割合 %（0〜100）
  // 返戻率は「その時点までに払った保険料の合計」に対する解約返戻金の割合（%）。保険設計書の値を手入力する。
  // 未入力（null）のときは解約返戻金を計算しない
  maturityRate: number | null // 通常ケース（比較期間末まで払い込む）の比較期間末の返戻率
  paidUpRate: number | null // 払済ケースの比較期間末の返戻率
}

// 役員報酬の減額（任意）
export type PayCut = {
  enabled: boolean
  officers: number // 減額する役員の人数
  monthlyCutPerOfficer: number // 1人あたり月額減額（円）
  // 会社負担の社会保険料の減少を計算するときだけ入れる（「役員報酬・退職金 比較シミュレーター」の社会保険料の計算を使う）。null なら計算しない
  socialInsurance: { payBefore: number; age: number; prefecture: Prefecture } | null
}

export type FundInput = {
  annualProfit: number // 年間法人利益（現行の役員報酬を払った後、追加施策の前）。毎年同じとする
  // 年ごとの利益（index 0 = 1年目）。将来の年別入力のため。あれば annualProfit の代わりに使い、足りない年は annualProfit
  profitByYear?: number[]
  years: number // 比較期間（年）
  corporateTaxRate: number // 法人実効税率 %（概算）
  dc: DcPlan
  welfare: InsurancePlan // 福利厚生保険
  officer: InsurancePlan // 役員保険
  payCut: PayCut
  // 払済ケースで保険料を払う年数（福利厚生保険・役員保険で共通。決定C2）。null なら払済ケースを試算しない（決定C19）
  paidUpYears: number | null
}

export type ScenarioKey = 'maturity' | 'paidUp'

// 対策あり 1年分
export type FundYearRow = {
  year: number
  payCut: number // 役員報酬の減額（会社の支出が減る）
  socialInsuranceSaving: number // 会社負担の社会保険料の減少
  dcContribution: number // DC掛金の合計（加入者の資産になる）
  dcCompanyCost: number // DC掛金のうち会社の費用が増える分（選択制は0）
  welfarePremium: number
  officerPremium: number
  deductibleInsurance: number // 保険料のうち損金に算入する額
  taxableIncome: number // 課税対象利益の概算（マイナスもそのまま）
  corporateTax: number // 法人税の概算（マイナスにしない）
  cashFlow: number // その年に増える法人の現金
  cashCumulative: number // 法人の現金の増加の累計（期首の残高は含めない）
  taxCumulative: number
  premiumCumulative: number // 払った保険料の累計（解約返戻金ではない）
  dcAsset: number // DC加入者の資産（年末の評価額）
  dcContributionCumulative: number
}

// 対策なし 1年分
export type BaseYearRow = {
  year: number
  taxableIncome: number
  corporateTax: number
  cashFlow: number
  cashCumulative: number
  taxCumulative: number
}

// 保険1つ分の比較期間末の値
export type InsuranceOutcome = {
  premiumYears: number // 保険料を払った年数
  premiumTotal: number // 払った保険料の合計
  rate: number | null // 使った返戻率（未入力は null）
  surrenderValue: number | null // 解約返戻金（返戻率が未入力なら null）
}

// 比較期間末のまとめ（対策なし・各ケース共通の形）
export type FundTotals = {
  corporateTax: number // 法人税の累計
  cash: number // 法人に残る現金（増加の累計）
  insurance: number | null // 法人保有保険の解約返戻金（未入力の保険があれば null）
  corporateAssets: number | null // 法人保有の現金＋保険評価額
  dcAsset: number // DC加入者の資産（個人の資産。法人の資産ではない）
  dcContribution: number // DC掛金の累計
  referenceTotal: number | null // 参考総額（法人資産＋DC加入者資産。帰属が違うものの合計）
}

export type ScenarioResult = {
  key: ScenarioKey
  label: string // 通常（期間末まで払込） ／ 10年で払済 など
  premiumYears: { welfare: number; officer: number }
  rows: FundYearRow[]
  welfare: InsuranceOutcome | null // 使わない保険は null
  officer: InsuranceOutcome | null
  totals: FundTotals
  diff: FundTotals // 対策なしとの差（対策あり − 対策なし）
  firstYear: FundYearRow
}

export type FundWarning = { message: string }

export type FundResult = {
  base: { rows: BaseYearRow[]; totals: FundTotals; firstYear: BaseYearRow }
  scenarios: ScenarioResult[]
  annualSocialInsuranceSaving: number // 役員報酬の減額による会社負担の社会保険料の減少（年額）
  // 役員個人の負担分の社会保険料の減少（年額）。内訳として見せるだけで、法人の現金・資産には足さない（決定C21）
  annualPersonalSocialInsuranceSaving: number
  socialInsuranceComputed: boolean
  warnings: FundWarning[]
}
