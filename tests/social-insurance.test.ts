import { describe, expect, it } from 'vitest'
import { monthlySocialInsurance } from '../src/calc/tax/socialInsurance.ts'

// 期待値は 協会けんぽ「令和8年3月分からの保険料額表（東京支部）」の「折半額」欄
describe('社会保険料の月額（個人負担）', () => {
  it('報酬100万円・52歳（介護保険あり）・東京都', () => {
    expect(monthlySocialInsurance(1_000_000, 52, '東京都')).toEqual({
      health: 56_203, // 98万円 × 11.47% ÷ 2
      childSupport: 1_127,
      pension: 59_475, // 65万円（上限）× 18.3% ÷ 2
      total: 116_805,
    })
  })

  it('報酬100万円・35歳（介護保険なし）・東京都', () => {
    expect(monthlySocialInsurance(1_000_000, 35, '東京都')).toEqual({
      health: 48_265,
      childSupport: 1_127,
      pension: 59_475,
      total: 108_867,
    })
  })

  it('50銭ちょうどの端数は切り捨て（区分ごと: 決定D68）', () => {
    // 41万円・30歳: 健康保険 20,192.5 → 20,192、支援金 471.5 → 471
    expect(monthlySocialInsurance(410_000, 30, '東京都')).toEqual({
      health: 20_192,
      childSupport: 471,
      pension: 37_515,
      total: 58_178,
    })
    // 47万円・50歳: 健康保険（介護あり）26,954.5 → 26,954、支援金 540.5 → 540
    expect(monthlySocialInsurance(470_000, 50, '東京都').health).toBe(26_954)
    expect(monthlySocialInsurance(470_000, 50, '東京都').childSupport).toBe(540)
  })

  it('都道府県の料率を使う', () => {
    // 北海道 10.28%: 30万円 × 10.28% ÷ 2 = 15,420
    expect(monthlySocialInsurance(300_000, 30, '北海道').health).toBe(15_420)
  })

  describe('年齢による対象・対象外（入力時点の年齢で判定）', () => {
    const at = (age: number) => monthlySocialInsurance(1_000_000, age, '東京都')
    it('介護保険は40〜64歳', () => {
      expect(at(39).health).toBe(48_265)
      expect(at(40).health).toBe(56_203)
      expect(at(64).health).toBe(56_203)
      expect(at(65).health).toBe(48_265)
    })
    it('厚生年金は70歳未満', () => {
      expect(at(69).pension).toBe(59_475)
      expect(at(70).pension).toBe(0)
    })
    it('75歳以上は健康保険・子育て支援金も0円（決定D32）', () => {
      expect(at(74)).toEqual({ health: 48_265, childSupport: 1_127, pension: 0, total: 49_392 })
      expect(at(75)).toEqual({ health: 0, childSupport: 0, pension: 0, total: 0 })
    })
  })
})
