import { describe, expect, it } from 'vitest'
import { employmentIncome } from '../src/calc/tax/incomeTax.ts'
import { adjustmentDeduction, annualResidentTax, residentBasicDeduction } from '../src/calc/tax/residentTax.ts'

// 根拠: 中央区・仙台市（基礎控除・扶養控除）、神戸市・東京都主税局（調整控除）、総務省（標準税率・均等割）
describe('住民税の基礎控除', () => {
  it('合計所得2,400万円以下は43万円、超えると段階的に減る', () => {
    expect(residentBasicDeduction(24_000_000)).toBe(430_000)
    expect(residentBasicDeduction(24_000_001)).toBe(290_000)
    expect(residentBasicDeduction(24_500_001)).toBe(150_000)
    expect(residentBasicDeduction(25_000_001)).toBe(0)
  })
})

describe('調整控除', () => {
  it('合計課税所得200万円以下: 人的控除額の差と課税所得の少ない方 × 5%', () => {
    expect(adjustmentDeduction(1_500_000, 3_000_000, 0)).toBe(2_500) // 5万円 × 5%
    expect(adjustmentDeduction(1_500_000, 3_000_000, 2)).toBe(7_500) // (5万＋5万×2) × 5%
    expect(adjustmentDeduction(30_000, 1_000_000, 0)).toBe(1_500) // 課税所得3万円の方が少ない
  })
  it('合計課税所得200万円超: {差 −（課税所得 − 200万円）} × 5%、最低2,500円', () => {
    expect(adjustmentDeduction(2_050_000, 4_000_000, 2)).toBe(5_000) // (15万 − 5万) × 5%
    expect(adjustmentDeduction(7_000_000, 10_000_000, 1)).toBe(2_500)
  })
  it('合計所得2,500万円超は調整控除なし', () => {
    expect(adjustmentDeduction(30_000_000, 25_000_001, 1)).toBe(0)
  })
})

describe('住民税の年額（所得割＋均等割）', () => {
  it('報酬月100万円・社会保険料 月116,805円・扶養1人', () => {
    // 給与所得 10,050,000 − 社保 1,401,660 − 基礎 430,000 − 扶養 330,000 = 7,888,340 → 7,888,000
    // 所得割 788,800 − 調整控除 2,500 = 786,300 → 均等割 5,000 を足して 791,300
    expect(annualResidentTax(12_000_000, 116_805 * 12, 1)).toBe(791_300)
  })
  it('控除が所得を上回るときは均等割だけ', () => {
    expect(annualResidentTax(1_000_000, 150_000, 0)).toBe(5_000)
  })
})

// 江東区「住民税の税率・計算例（その2）」計算例3（令和8年度以降の基準）
// 給与収入500万円・社会保険料控除20万円・配偶者控除33万円・基礎控除43万円
// （住民税の配偶者控除33万円・人的控除額の差5万円は、一般の扶養控除1人分と同じ金額なので扶養1人として計算する）
describe('自治体の計算例と照らし合わせる', () => {
  it('江東区 計算例3: 課税所得260万円・所得割260,000円・調整控除2,500円', () => {
    expect(employmentIncome(5_000_000)).toBe(3_560_000)
    // 3,560,000 − 200,000 − 430,000 − 330,000 = 2,600,000
    expect(adjustmentDeduction(2_600_000, 3_560_000, 1)).toBe(2_500)
    // 所得割 260,000 − 調整控除 2,500 ＋ 均等割・森林環境税 5,000
    expect(annualResidentTax(5_000_000, 200_000, 1)).toBe(260_000 - 2_500 + 5_000)
  })
  it('江東区 計算例1: 給与収入600万円 → 給与所得436万円', () => {
    expect(employmentIncome(6_000_000)).toBe(4_360_000)
  })
})
