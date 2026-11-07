import { describe, expect, it } from 'vitest'
import { monthlyDeductions } from '../src/calc/tax/monthlyDeductions.ts'

describe('月額の社会保険料・所得税・住民税', () => {
  it('報酬月100万円・52歳・東京都・扶養1人', () => {
    // 社会保険料 116,805（保険料額表）、所得税 1,146,600 ÷ 12 = 95,550、住民税 791,300 ÷ 12 = 65,941.67 → 65,942
    expect(monthlyDeductions(1_000_000, 52, '東京都', 1)).toEqual({
      socialInsurance: 116_805,
      incomeTax: 95_550,
      residentTax: 65_942,
    })
  })
})
