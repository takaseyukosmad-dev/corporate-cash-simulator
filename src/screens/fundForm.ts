import type { FundInput, InsurancePlan } from '../calc/fundFormation/types.ts'
import { type Prefecture, PREFECTURES } from '../data/prefectures.ts'
import { normalizeNumberText, parseNumber } from '../shared/numberInput.ts'

// 入力欄（文字列）と、計算用の入力への変換・入力チェック

export type FundFormValues = {
  companyName: string // 法人名（空欄可）。印刷のタイトルにだけ使い、計算には使わない（決定C17）
  annualProfitMan: string // 年間法人利益（万円）
  years: string
  corporateTaxRate: string
  dcMembers: string
  dcMonthly: string // 1人あたり月額掛金（円）
  dcReturnRate: string
  dcYears: string // 空欄なら比較期間と同じ
  welfareEnabled: boolean
  welfarePremiumMan: string
  welfareDeductible: string
  welfareMaturityRate: string
  welfarePaidUpRate: string
  officerEnabled: boolean
  officerPremiumMan: string
  officerDeductible: string
  officerMaturityRate: string
  officerPaidUpRate: string
  paidUpEnabled: boolean // 払済保険の場合を試算する（決定C19）
  paidUpYears: string // 払済の払込年数（福利厚生保険・役員保険で共通。決定C2）
  payCutEnabled: boolean
  payCutOfficers: string
  payCutMode: 'perOfficer' | 'total' // 1人あたり月額で入れる ／ 年間の総額で入れる
  payCutMonthly: string // 1人あたり月額減額（円）
  payCutTotalMan: string // 年間総減額（万円）
  payCutPayBefore: string // 減額前の報酬月額（円）。空欄なら社会保険料の減少は計算しない
  payCutAge: string
  payCutPrefecture: string
}

export type FundField = keyof FundFormValues

// 開いたときの値。保険の返戻率などは保険設計書の値を入れてもらうため空欄にする（推測で値を入れない）
export const EMPTY_FUND_FORM: FundFormValues = {
  companyName: '',
  annualProfitMan: '',
  years: '20',
  corporateTaxRate: '30', // 「役員報酬・退職金 比較シミュレーター」と同じ「目安」の初期値。法定値ではない
  dcMembers: '0',
  dcMonthly: '62,000', // 打ち合わせ（2026-10-23）での想定。法定の上限としては扱わない
  dcReturnRate: '0',
  dcYears: '',
  welfareEnabled: false,
  welfarePremiumMan: '',
  welfareDeductible: '',
  welfareMaturityRate: '',
  welfarePaidUpRate: '',
  officerEnabled: false,
  officerPremiumMan: '',
  officerDeductible: '',
  officerMaturityRate: '',
  officerPaidUpRate: '',
  paidUpEnabled: false,
  paidUpYears: '',
  payCutEnabled: false,
  payCutOfficers: '',
  payCutMode: 'perOfficer',
  payCutMonthly: '',
  payCutTotalMan: '',
  payCutPayBefore: '',
  payCutAge: '',
  payCutPrefecture: '',
}

// デモ用の仮データ（架空の会社）。打ち合わせ・資料の説明例をもとにした値で、実在の保険商品の値ではない
export const DEMO_FUND_FORM: FundFormValues = {
  ...EMPTY_FUND_FORM,
  companyName: 'サンプル商事株式会社',
  annualProfitMan: '3,000',
  years: '20',
  corporateTaxRate: '30',
  dcMembers: '2',
  dcMonthly: '62,000',
  dcReturnRate: '6',
  dcYears: '20',
  welfareEnabled: true,
  welfarePremiumMan: '1,000',
  welfareDeductible: '50',
  welfareMaturityRate: '150',
  paidUpEnabled: true,
  paidUpYears: '10', // 資料の例（福利厚生保険20年継続と10年払済の比較）
  welfarePaidUpRate: '200',
  payCutEnabled: true,
  payCutOfficers: '1',
  payCutMonthly: '500,000',
}

const MAN = 10_000
// 法人名の長さの上限（元のアプリと同じ。長い名前で印刷のタイトルが崩れないように）
const COMPANY_NAME_MAX = 50

type Rule = { label: string; min: number; max: number; decimals: number; optional?: boolean }

const RULES: Partial<Record<FundField, Rule>> = {
  annualProfitMan: { label: '年間法人利益', min: -999_999, max: 999_999, decimals: 1 },
  years: { label: '比較期間', min: 1, max: 50, decimals: 0 },
  corporateTaxRate: { label: '法人実効税率', min: 0, max: 60, decimals: 2 },
  dcMembers: { label: 'DC加入人数', min: 0, max: 1000, decimals: 0 },
  dcMonthly: { label: 'DC月額掛金', min: 0, max: 1_000_000, decimals: 0 },
  dcReturnRate: { label: 'DC運用年率', min: 0, max: 20, decimals: 2 },
  dcYears: { label: 'DC拠出期間', min: 1, max: 50, decimals: 0, optional: true },
  welfarePremiumMan: { label: '年間保険料', min: 0, max: 99_999, decimals: 1 },
  welfareDeductible: { label: '損金割合', min: 0, max: 100, decimals: 1 },
  welfareMaturityRate: { label: '返戻率', min: 0, max: 1000, decimals: 1, optional: true },
  welfarePaidUpRate: { label: '返戻率', min: 0, max: 1000, decimals: 1, optional: true },
  officerPremiumMan: { label: '年間保険料', min: 0, max: 99_999, decimals: 1 },
  officerDeductible: { label: '損金割合', min: 0, max: 100, decimals: 1 },
  officerMaturityRate: { label: '返戻率', min: 0, max: 1000, decimals: 1, optional: true },
  officerPaidUpRate: { label: '返戻率', min: 0, max: 1000, decimals: 1, optional: true },
  paidUpYears: { label: '払済の払込年数', min: 1, max: 50, decimals: 0 },
  payCutOfficers: { label: '減額する役員の人数', min: 1, max: 50, decimals: 0 },
  payCutMonthly: { label: '1人あたり月額減額', min: 0, max: 99_999_999, decimals: 0 },
  payCutTotalMan: { label: '年間の総減額', min: 0, max: 99_999, decimals: 1 },
  payCutPayBefore: { label: '減額前の報酬月額', min: 1, max: 99_999_999, decimals: 0, optional: true },
  payCutAge: { label: '年齢', min: 15, max: 100, decimals: 0 },
}

const WELFARE_FIELDS: FundField[] = ['welfarePremiumMan', 'welfareDeductible', 'welfareMaturityRate']
const OFFICER_FIELDS: FundField[] = ['officerPremiumMan', 'officerDeductible', 'officerMaturityRate']

// 払済ケースを試算するか（保険を1つ以上使い、「払済保険の場合を試算する」にチェックがあるとき）
export const paidUpOn = (v: FundFormValues) => (v.welfareEnabled || v.officerEnabled) && v.paidUpEnabled
// 役員報酬の減額の1人あたり月額（年間の総額で入れたときは 総額 ÷ 12か月 ÷ 人数）。入力が足りなければ null
export function monthlyCutPerOfficer(v: FundFormValues): number | null {
  if (v.payCutMode === 'perOfficer') return parseNumber(v.payCutMonthly)
  const total = parseNumber(v.payCutTotalMan)
  const officers = parseNumber(v.payCutOfficers)
  return total === null || !officers ? null : (total * MAN) / 12 / officers
}

function decimalPlaces(text: string): number {
  const cleaned = normalizeNumberText(text)
  const i = cleaned.indexOf('.')
  return i === -1 ? 0 : cleaned.length - i - 1
}

function rangeText(r: Rule): string {
  const f = new Intl.NumberFormat('ja-JP')
  const dec = r.decimals === 0 ? 'の整数' : `（小数第${r.decimals}位まで）`
  return `${f.format(r.min)}〜${f.format(r.max)}${dec}`
}

function checkNumber(key: FundField, text: string, errors: Partial<Record<FundField, string>>) {
  const rule = RULES[key]
  if (!rule) return
  if (text.trim() === '') {
    if (!rule.optional) errors[key] = `${rule.label}を入力してください。`
    return
  }
  const n = parseNumber(text)
  if (n === null || n < rule.min || n > rule.max || decimalPlaces(text) > rule.decimals) {
    errors[key] = `${rule.label}は ${rangeText(rule)} で入力してください。`
  }
}

// 入力欄ごとのエラー（使わない保険・減額をしない場合はその欄を調べない）
export function validateFundForm(v: FundFormValues): Partial<Record<FundField, string>> {
  const errors: Partial<Record<FundField, string>> = {}
  const fields: FundField[] = ['annualProfitMan', 'years', 'corporateTaxRate', 'dcMembers', 'dcReturnRate', 'dcYears']
  const dcMembers = parseNumber(v.dcMembers) ?? 0
  if (dcMembers > 0) fields.push('dcMonthly')
  if (v.welfareEnabled) fields.push(...WELFARE_FIELDS)
  if (v.officerEnabled) fields.push(...OFFICER_FIELDS)
  if (paidUpOn(v)) {
    fields.push('paidUpYears')
    if (v.welfareEnabled) fields.push('welfarePaidUpRate')
    if (v.officerEnabled) fields.push('officerPaidUpRate')
  }
  if (v.payCutEnabled) {
    fields.push('payCutOfficers', v.payCutMode === 'perOfficer' ? 'payCutMonthly' : 'payCutTotalMan', 'payCutPayBefore')
    if (v.payCutPayBefore.trim() !== '') fields.push('payCutAge')
  }
  for (const key of fields) checkNumber(key, v[key] as string, errors)
  if (v.companyName.trim().length > COMPANY_NAME_MAX) errors.companyName = `法人名は${COMPANY_NAME_MAX}文字以内で入力してください。`

  const years = parseNumber(v.years)
  const dcYears = parseNumber(v.dcYears)
  if (!errors.dcYears && years !== null && dcYears !== null && dcYears > years) {
    errors.dcYears = 'DC拠出期間は比較期間以下にしてください。'
  }
  if (v.payCutEnabled && v.payCutPayBefore.trim() !== '') {
    if (!PREFECTURES.includes(v.payCutPrefecture as Prefecture)) errors.payCutPrefecture = '都道府県を選んでください。'
    const before = parseNumber(v.payCutPayBefore)
    const cut = monthlyCutPerOfficer(v)
    if (!errors.payCutPayBefore && before !== null && cut !== null && cut > before) {
      errors.payCutPayBefore = '減額前の報酬月額は、1人あたり月額減額以上にしてください。'
    }
  }
  return errors
}

const num = (text: string) => parseNumber(text) ?? 0
const optional = (text: string) => (text.trim() === '' ? null : parseNumber(text))

function insurance(v: FundFormValues, prefix: 'welfare' | 'officer'): InsurancePlan {
  const get = (suffix: string) => v[`${prefix}${suffix}` as FundField] as string
  return {
    enabled: prefix === 'welfare' ? v.welfareEnabled : v.officerEnabled,
    annualPremium: num(get('PremiumMan')) * MAN,
    deductibleRate: num(get('Deductible')),
    maturityRate: optional(get('MaturityRate')),
    paidUpRate: paidUpOn(v) ? optional(get('PaidUpRate')) : null,
  }
}

// エラーがなければ計算用の入力にする（エラーがあれば null）
export function toFundInput(v: FundFormValues): FundInput | null {
  if (Object.keys(validateFundForm(v)).length > 0) return null
  const years = num(v.years)
  const withSi = v.payCutEnabled && v.payCutPayBefore.trim() !== ''
  return {
    annualProfit: num(v.annualProfitMan) * MAN,
    years,
    corporateTaxRate: num(v.corporateTaxRate),
    dc: {
      members: num(v.dcMembers),
      monthlyPerMember: num(v.dcMembers) > 0 ? num(v.dcMonthly) : 0,
      annualReturnRate: num(v.dcReturnRate),
      contributionYears: v.dcYears.trim() === '' ? years : num(v.dcYears),
      funding: 'employer', // 会社が福利厚生費として拠出する形だけで計算する（決定C6）
    },
    welfare: insurance(v, 'welfare'),
    officer: insurance(v, 'officer'),
    payCut: {
      enabled: v.payCutEnabled,
      officers: v.payCutEnabled ? num(v.payCutOfficers) : 0,
      monthlyCutPerOfficer: v.payCutEnabled ? (monthlyCutPerOfficer(v) ?? 0) : 0,
      socialInsurance: withSi
        ? { payBefore: num(v.payCutPayBefore), age: num(v.payCutAge), prefecture: v.payCutPrefecture as Prefecture }
        : null,
    },
    paidUpYears: paidUpOn(v) ? num(v.paidUpYears) : null,
  }
}
