import { describe, expect, it } from 'vitest'
import {
  annualIncomeTax,
  basicDeduction,
  dependentDeduction,
  employmentIncome,
  taxByRateTable,
} from '../src/calc/tax/incomeTax.ts'
import { incomeTax2026 } from '../src/data/incomeTax.ts'

// 根拠: 国税庁 令和8年分 年末調整のしかた（給与所得控除の最低保障額74万円・219.1万〜220万円の特例）、
//       タックスアンサー No.1410（給与所得控除の表）、所得税法 別表第五（660万円未満は4,000円単位）
describe('給与所得（給与収入 − 給与所得控除）令和8年分', () => {
  it('219.1万円未満は 収入 − 74万円（0円未満は0円）', () => {
    expect(employmentIncome(700_000)).toBe(0)
    expect(employmentIncome(741_000)).toBe(1_000)
    expect(employmentIncome(1_000_000)).toBe(260_000)
    expect(employmentIncome(2_190_999)).toBe(1_450_999)
  })
  it('219.1万〜220万円は特例の金額', () => {
    expect(employmentIncome(2_191_000)).toBe(1_451_000)
    expect(employmentIncome(2_193_000)).toBe(1_453_000)
    expect(employmentIncome(2_199_999)).toBe(1_456_000)
  })
  it('220万〜360万円: 4,000円単位の収入 × 70% − 8万円', () => {
    expect(employmentIncome(2_200_000)).toBe(1_460_000)
    expect(employmentIncome(3_000_000)).toBe(2_020_000)
    expect(employmentIncome(3_003_999)).toBe(2_020_000) // 4,000円未満は切り捨て
    expect(employmentIncome(3_004_000)).toBe(2_022_800)
  })
  it('360万〜660万円未満: 4,000円単位の収入 × 80% − 44万円', () => {
    expect(employmentIncome(6_000_000)).toBe(4_360_000)
    expect(employmentIncome(6_599_999)).toBe(4_836_800) // 6,596,000 × 80% − 440,000
  })
  it('660万〜850万円: 収入 × 90% − 110万円（4,000円単位にしない）', () => {
    expect(employmentIncome(6_600_000)).toBe(4_840_000)
    expect(employmentIncome(7_200_000)).toBe(5_380_000)
  })
  it('850万円超: 収入 − 195万円（上限）', () => {
    expect(employmentIncome(9_600_000)).toBe(7_650_000)
    expect(employmentIncome(12_000_000)).toBe(10_050_000)
    expect(employmentIncome(36_000_000)).toBe(34_050_000)
  })
})

// 根拠: 国税庁 令和8年分 基礎控除額の表
describe('基礎控除（合計所得金額に応じた額）令和8年分', () => {
  it('境目は「以下」', () => {
    expect(basicDeduction(4_890_000)).toBe(1_040_000)
    expect(basicDeduction(4_890_001)).toBe(670_000)
    expect(basicDeduction(6_550_000)).toBe(670_000)
    expect(basicDeduction(6_550_001)).toBe(620_000)
    expect(basicDeduction(23_500_000)).toBe(620_000)
    expect(basicDeduction(23_500_001)).toBe(480_000)
    expect(basicDeduction(24_500_000)).toBe(320_000)
    expect(basicDeduction(24_500_001)).toBe(160_000)
    expect(basicDeduction(25_000_000)).toBe(160_000)
  })
  it('2,500万円を超えると0円', () => {
    expect(basicDeduction(25_000_001)).toBe(0)
  })
})

describe('扶養控除（一般の扶養親族 38万円 × 人数: 決定D30）', () => {
  it('人数分', () => {
    expect(dependentDeduction(0)).toBe(0)
    expect(dependentDeduction(2)).toBe(760_000)
  })
})

// 根拠: 国税庁 タックスアンサー No.2260 所得税の速算表
describe('速算表', () => {
  const tax = (taxable: number) => taxByRateTable(taxable, incomeTax2026)
  it('国税庁の計算例: 課税所得700万円 → 974,000円', () => {
    expect(tax(7_000_000)).toBe(974_000)
  })
  it('各段階の税額', () => {
    expect(tax(1_949_000)).toBe(97_450)
    expect(tax(1_950_000)).toBe(97_500)
    expect(tax(7_648_000)).toBe(1_123_040)
    expect(tax(36_800_000)).toBe(11_924_000)
    expect(tax(40_000_000)).toBe(13_204_000)
    expect(tax(98_000_000)).toBe(39_304_000)
  })
})

describe('所得税の年額（復興特別所得税を含む）', () => {
  it('報酬月100万円・社会保険料 月116,805円・扶養1人', () => {
    // 給与所得 10,050,000 − 社保 1,401,660 − 基礎 620,000 − 扶養 380,000 = 7,648,340 → 7,648,000
    // 7,648,000 × 23% − 636,000 = 1,123,040 → × 102.1% = 1,146,623.84 → 1,146,600
    expect(annualIncomeTax(12_000_000, 116_805 * 12, 1)).toBe(1_146_600)
  })
  it('報酬月60万円・社会保険料 月85,000円・扶養0人', () => {
    // 給与所得 6,600,000 未満のため4,000円単位: 7,200,000 は 660万以上 → 7,200,000 × 90% − 1,100,000 = 5,380,000
    // 合計所得 5,380,000 → 基礎控除 670,000
    // 5,380,000 − 1,020,000 − 670,000 = 3,690,000 → × 20% − 427,500 = 310,500 → × 102.1% = 317,020.5 → 317,000
    expect(annualIncomeTax(7_200_000, 85_000 * 12, 0)).toBe(317_000)
  })
  it('控除が所得を上回るときは0円', () => {
    expect(annualIncomeTax(1_000_000, 150_000, 0)).toBe(0)
  })
})
