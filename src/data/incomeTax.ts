// 所得税の控除額・税率（令和8年分）。中身は income-tax-2026.json
import raw from './income-tax-2026.json'

export type IncomeTaxData = {
  baseYearLabel: string
  sources: { name: string; url: string; retrievedAt: string }[]
  employmentIncome: {
    minimumDeduction: number // 給与所得控除の最低額（令和8・9年分の特例）
    transitional: { from: number; to: number; income: number }[] // 収入219.1万〜220万円の給与所得（特例）
    tableUnit: number // 別表第五の刻み（4,000円）
    tableUpTo: number // 別表第五を使う収入の上限（660万円未満）
    deductionBrackets: { upTo: number | null; rate: number; add: number }[] // 給与所得控除 = 収入 × rate% + add
  }
  basicDeduction: { upTo: number | null; amount: number }[] // 合計所得金額 upTo 以下なら amount
  dependentDeduction: number // 一般の控除対象扶養親族1人あたり（決定D30）
  rateTable: { from: number; rate: number; deduction: number }[] // 課税所得 from 以上: × rate% − deduction
  reconstructionSurtaxRate: number // 復興特別所得税 %
}

export const incomeTax2026: IncomeTaxData = raw
