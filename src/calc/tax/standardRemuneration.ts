import type { Grade } from '../../data/socialInsurance.ts'

// 報酬月額から標準報酬月額を求める（docs/calculation-rules.md 2.2）
// 等級表の「報酬月額の下限（from）」以上で、いちばん上の等級を選ぶ
export function standardRemuneration(monthlyPay: number, grades: Grade[]): number {
  let result = grades[0].standard
  for (const g of grades) {
    if (monthlyPay >= g.from) result = g.standard
  }
  return result
}
