import type { Prefecture } from '../../data/prefectures.ts'
import { type SocialInsuranceData, socialInsurance2026 } from '../../data/socialInsurance.ts'
import { roundSocialInsurance } from '../rounding.ts'
import { standardRemuneration } from './standardRemuneration.ts'

// 社会保険料の月額（個人負担分）。docs/calculation-rules.md 2章
export type MonthlySocialInsurance = {
  health: number // 健康保険（40〜64歳は介護保険を含む）
  childSupport: number // 子ども・子育て支援金
  pension: number // 厚生年金
  total: number // 合計（個人負担）。法人負担も同額（決定D10）
}

// 対象かどうか（年齢は入力時点で固定: 決定D10）
const isCareTarget = (age: number) => age >= 40 && age <= 64 // 介護保険: 40〜64歳
const isHealthTarget = (age: number) => age < 75 // 健康保険・子育て支援金: 75歳未満（決定D32）
const isPensionTarget = (age: number) => age < 70 // 厚生年金: 70歳未満

// 個人負担分 = 標準報酬月額 × 料率 ÷ 2。端数処理は区分ごと（決定D68）
const half = (standard: number, ratePercent: number) => roundSocialInsurance((standard * ratePercent) / 100 / 2)

export function monthlySocialInsurance(
  monthlyPay: number,
  age: number,
  prefecture: Prefecture,
  data: SocialInsuranceData = socialInsurance2026,
): MonthlySocialInsurance {
  const healthStandard = standardRemuneration(monthlyPay, data.healthGrades)
  const pensionStandard = standardRemuneration(monthlyPay, data.pensionGrades)

  const healthRate = data.healthInsuranceRates[prefecture] + (isCareTarget(age) ? data.careInsuranceRate : 0)
  const health = isHealthTarget(age) ? half(healthStandard, healthRate) : 0
  const childSupport = isHealthTarget(age) ? half(healthStandard, data.childSupportRate) : 0
  const pension = isPensionTarget(age) ? half(pensionStandard, data.pensionRate) : 0

  return { health, childSupport, pension, total: health + childSupport + pension }
}
