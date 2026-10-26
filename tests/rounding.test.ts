import { describe, expect, it } from 'vitest'
import { floorTo, roundSocialInsurance, roundYen } from '../src/calc/rounding.ts'

describe('floorTo（指定単位未満の切り捨て）', () => {
  it('1,000円未満を切り捨てる', () => {
    expect(floorTo(36_812_345, 1000)).toBe(36_812_000)
    expect(floorTo(36_812_999.99, 1000)).toBe(36_812_000)
  })
  it('100円未満を切り捨てる', () => {
    expect(floorTo(12_174_404, 100)).toBe(12_174_400)
  })
  it('ちょうどの値はそのまま', () => {
    expect(floorTo(36_800_000, 1000)).toBe(36_800_000)
  })
  it('小数の計算誤差で1単位小さくならない', () => {
    // 4,800,000 × 0.6 × 0.3 は小数計算で 863,999.9999… になることがある
    expect(floorTo(4_800_000 * 0.6 * 0.3, 1)).toBe(864_000)
  })
})

describe('roundSocialInsurance（社会保険料: 50銭以下切り捨て・50銭超切り上げ）', () => {
  it('50銭ちょうどは切り捨て', () => {
    expect(roundSocialInsurance(48_265.5)).toBe(48_265)
  })
  it('50銭を超えると切り上げ', () => {
    expect(roundSocialInsurance(48_265.51)).toBe(48_266)
  })
  it('50銭未満は切り捨て', () => {
    expect(roundSocialInsurance(48_265.49)).toBe(48_265)
  })
  it('端数がなければそのまま', () => {
    expect(roundSocialInsurance(59_475)).toBe(59_475)
  })
})

describe('roundYen（円未満の四捨五入: 決定D66・D67）', () => {
  it('年額 ÷ 12 の円未満を四捨五入する', () => {
    expect(roundYen(1_234_567 / 12)).toBe(102_881)
    expect(roundYen(1_234_562 / 12)).toBe(102_880)
  })
  it('0.5円は切り上げる', () => {
    expect(roundYen(100.5)).toBe(101)
  })
})
