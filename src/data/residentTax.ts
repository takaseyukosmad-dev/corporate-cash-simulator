// 住民税の控除額・税率（令和8年の所得に対する住民税）。中身は resident-tax-2026.json
import raw from './resident-tax-2026.json'

export type ResidentTaxData = {
  baseYearLabel: string
  sources: { name: string; url: string; retrievedAt: string }[]
  basicDeduction: { upTo: number | null; amount: number }[] // 合計所得金額 upTo 以下なら amount
  dependentDeduction: number // 一般の控除対象扶養親族1人あたり（決定D30）
  incomeLevyRate: number // 所得割の税率 %
  perCapita: number // 均等割（森林環境税を含む）
  adjustment: {
    personalDeductionDiff: { basic: number; dependent: number } // 人的控除額の差（所得税との差）
    threshold: number // 合計課税所得金額の境目（200万円）
    rate: number // %
    minimum: number // 200万円超のときの最低額
    maxTotalIncome: number // 合計所得金額がこれを超えると調整控除なし
  }
}

export const residentTax2026: ResidentTaxData = raw
