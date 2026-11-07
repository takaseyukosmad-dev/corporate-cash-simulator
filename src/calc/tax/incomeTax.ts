import { type IncomeTaxData, incomeTax2026 } from '../../data/incomeTax.ts'
import { floorTo } from '../rounding.ts'

// 所得税（docs/calculation-rules.md 3章）

// 給与所得（給与収入 − 給与所得控除）。令和8年分
// 660万円未満は国税庁の「年末調整等のための給与所得控除後の給与等の金額の表」（所得税法 別表第五）に従う
export function employmentIncome(annualPay: number, data: IncomeTaxData = incomeTax2026): number {
  const e = data.employmentIncome
  const special = e.transitional.find((t) => annualPay >= t.from && annualPay < t.to)
  if (special) return special.income
  if (annualPay < e.transitional[0].from) return Math.max(0, annualPay - e.minimumDeduction)

  // 別表第五は収入を4,000円単位で区切っているため、その範囲では4,000円未満を切り捨てた収入で計算する
  const base = annualPay < e.tableUpTo ? Math.floor(annualPay / e.tableUnit) * e.tableUnit : annualPay
  const bracket = e.deductionBrackets.find((b) => b.upTo === null || base <= b.upTo) ?? e.deductionBrackets[e.deductionBrackets.length - 1]
  const deduction = (base * bracket.rate) / 100 + bracket.add
  return base - deduction
}

// 基礎控除（合計所得金額に応じた額。令和8年分）
export function basicDeduction(totalIncome: number, data: IncomeTaxData = incomeTax2026): number {
  const row = data.basicDeduction.find((r) => r.upTo === null || totalIncome <= r.upTo)
  return row?.amount ?? 0
}

// 扶養控除（16歳以上の一般の扶養親族 × 人数: 決定D30）
export function dependentDeduction(dependents: number, data: IncomeTaxData = incomeTax2026): number {
  return data.dependentDeduction * dependents
}

// 速算表による所得税額（復興特別所得税を含まない）。退職金の所得税にも使う
export function taxByRateTable(taxableIncome: number, data: IncomeTaxData): number {
  const row = [...data.rateTable].reverse().find((r) => taxableIncome >= r.from) ?? data.rateTable[0]
  return (taxableIncome * row.rate) / 100 - row.deduction
}

// 所得税の年額（復興特別所得税を含む）
// 課税所得 = 給与所得 − 社会保険料控除 − 基礎控除 − 扶養控除（1,000円未満切り捨て）
// 所得税 = 速算表の税額 × 102.1%（100円未満切り捨て）
export function annualIncomeTax(
  annualPay: number,
  annualSocialInsurance: number, // 社会保険料控除（個人負担の年額）
  dependents: number,
  data: IncomeTaxData = incomeTax2026,
): number {
  const income = employmentIncome(annualPay, data) // 合計所得金額（給与だけ）
  const deductions = annualSocialInsurance + basicDeduction(income, data) + dependentDeduction(dependents, data)
  const taxable = Math.max(0, floorTo(income - deductions, 1000))
  const tax = taxByRateTable(taxable, data)
  return floorTo((tax * (100 + data.reconstructionSurtaxRate)) / 100, 100)
}
