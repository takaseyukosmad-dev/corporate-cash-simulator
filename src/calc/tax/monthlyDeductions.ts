import type { Prefecture } from '../../data/prefectures.ts'
import { roundYen } from '../rounding.ts'
import { annualIncomeTax } from './incomeTax.ts'
import { annualResidentTax } from './residentTax.ts'
import { monthlySocialInsurance } from './socialInsurance.ts'

// 「役員報酬・退職金 比較シミュレーター」から持ってきた計算（そちらと同じ式・同じ令和8年度のデータ）

// 月額の社会保険料（個人負担。会社負担も同額: 元のアプリの決定D10）・所得税・住民税
export type MonthlyDeductions = {
  socialInsurance: number
  incomeTax: number
  residentTax: number
}

// 報酬月額から、月額の社会保険料・所得税・住民税を求める
// 所得税・住民税は年額で計算し、12で割って円未満を四捨五入する（決定D66）
export function monthlyDeductions(
  monthlyPay: number,
  age: number,
  prefecture: Prefecture,
  dependents: number,
): MonthlyDeductions {
  const socialInsurance = monthlySocialInsurance(monthlyPay, age, prefecture).total
  const annualPay = monthlyPay * 12
  const annualSocialInsurance = socialInsurance * 12
  return {
    socialInsurance,
    incomeTax: roundYen(annualIncomeTax(annualPay, annualSocialInsurance, dependents) / 12),
    residentTax: roundYen(annualResidentTax(annualPay, annualSocialInsurance, dependents) / 12),
  }
}
