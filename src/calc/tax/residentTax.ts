import { type IncomeTaxData, incomeTax2026 } from '../../data/incomeTax.ts'
import { type ResidentTaxData, residentTax2026 } from '../../data/residentTax.ts'
import { floorTo } from '../rounding.ts'
import { employmentIncome } from './incomeTax.ts'

// 住民税（docs/calculation-rules.md 4章）。前年の所得ではなく、同じ年の所得で計算する（決定D10）

// 住民税の基礎控除（合計所得金額に応じた額）
export function residentBasicDeduction(totalIncome: number, data: ResidentTaxData = residentTax2026): number {
  const row = data.basicDeduction.find((r) => r.upTo === null || totalIncome <= r.upTo)
  return row?.amount ?? 0
}

// 調整控除（所得税と住民税の人的控除額の差による負担増を調整する）
export function adjustmentDeduction(
  taxableIncome: number, // 合計課税所得金額
  totalIncome: number, // 合計所得金額
  dependents: number,
  data: ResidentTaxData = residentTax2026,
): number {
  const a = data.adjustment
  if (totalIncome > a.maxTotalIncome) return 0
  const diff = a.personalDeductionDiff.basic + a.personalDeductionDiff.dependent * dependents
  if (taxableIncome <= a.threshold) return (Math.min(diff, taxableIncome) * a.rate) / 100
  return Math.max(((diff - (taxableIncome - a.threshold)) * a.rate) / 100, a.minimum)
}

// 住民税の年額（所得割＋均等割）
// 課税所得 = 給与所得 − 社会保険料控除 − 基礎控除 − 扶養控除（1,000円未満切り捨て）
// 所得割 = 課税所得 × 10% − 調整控除（100円未満切り捨て）
export function annualResidentTax(
  annualPay: number,
  annualSocialInsurance: number, // 社会保険料控除（個人負担の年額）
  dependents: number,
  data: ResidentTaxData = residentTax2026,
  incomeTaxData: IncomeTaxData = incomeTax2026,
): number {
  const income = employmentIncome(annualPay, incomeTaxData) // 合計所得金額（給与だけ）
  const deductions = annualSocialInsurance + residentBasicDeduction(income, data) + data.dependentDeduction * dependents
  const taxable = Math.max(0, floorTo(income - deductions, 1000))
  const levy = (taxable * data.incomeLevyRate) / 100 - adjustmentDeduction(taxable, income, dependents, data)
  return Math.max(0, floorTo(levy, 100)) + data.perCapita
}
