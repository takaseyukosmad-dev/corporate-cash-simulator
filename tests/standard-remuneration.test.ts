import { describe, expect, it } from 'vitest'
import { standardRemuneration } from '../src/calc/tax/standardRemuneration.ts'
import { socialInsurance2026 as d } from '../src/data/socialInsurance.ts'

const health = (pay: number) => standardRemuneration(pay, d.healthGrades)
const pension = (pay: number) => standardRemuneration(pay, d.pensionGrades)

describe('標準報酬月額（健康保険）', () => {
  it('等級の範囲に入る標準報酬月額になる', () => {
    expect(health(1_000_000)).toBe(980_000) // 43等級: 955,000〜1,005,000
    expect(health(800_000)).toBe(790_000) // 39等級: 770,000〜810,000
    expect(health(600_000)).toBe(590_000) // 33等級: 575,000〜605,000
  })
  it('境目は「円以上」で次の等級になる', () => {
    expect(health(62_999)).toBe(58_000)
    expect(health(63_000)).toBe(68_000)
    expect(health(1_004_999)).toBe(980_000)
    expect(health(1_005_000)).toBe(1_030_000)
  })
  it('上限は139万円', () => {
    expect(health(1_355_000)).toBe(1_390_000)
    expect(health(3_000_000)).toBe(1_390_000)
  })
  it('いちばん下の等級より低い報酬は1等級', () => {
    expect(health(1)).toBe(58_000)
  })
})

describe('標準報酬月額（厚生年金）', () => {
  it('上限は65万円', () => {
    expect(pension(1_000_000)).toBe(650_000)
    expect(pension(635_000)).toBe(650_000)
    expect(pension(634_999)).toBe(620_000)
  })
  it('下限は8.8万円（93,000円未満）', () => {
    expect(pension(92_999)).toBe(88_000)
    expect(pension(93_000)).toBe(98_000)
    expect(pension(10_000)).toBe(88_000)
  })
})
