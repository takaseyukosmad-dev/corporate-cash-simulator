import { describe, expect, it } from 'vitest'
import { dcAssetByYear } from '../src/calc/fundFormation/dc.ts'
import { simulateFund, socialInsuranceSaving } from '../src/calc/fundFormation/simulateFund.ts'
import type { FundInput, InsurancePlan } from '../src/calc/fundFormation/types.ts'
import { monthlySocialInsurance } from '../src/calc/tax/socialInsurance.ts'

// 受け入れテスト（要件定義 6章）

const noInsurance: InsurancePlan = { enabled: false, annualPremium: 0, deductibleRate: 0, maturityRate: null, paidUpRate: null }

const zero: FundInput = {
  annualProfit: 30_000_000,
  years: 20,
  corporateTaxRate: 30,
  dc: { members: 0, monthlyPerMember: 0, annualReturnRate: 0, contributionYears: 20, funding: 'employer' },
  welfare: noInsurance,
  officer: noInsurance,
  payCut: { enabled: false, officers: 0, monthlyCutPerOfficer: 0, socialInsurance: null },
  paidUpYears: 5,
}

const welfare = (overrides: Partial<InsurancePlan> = {}): InsurancePlan => ({
  enabled: true,
  annualPremium: 10_000_000,
  deductibleRate: 50,
  maturityRate: 150,
  paidUpRate: 300,
  ...overrides,
})

describe('1. 追加施策がすべて0なら、対策なしと対策ありが一致する', () => {
  const r = simulateFund(zero)
  it('各ケースの年次の税・現金が対策なしと同じ', () => {
    for (const s of r.scenarios) {
      s.rows.forEach((row, i) => {
        expect(row.corporateTax).toBe(r.base.rows[i].corporateTax)
        expect(row.cashCumulative).toBe(r.base.rows[i].cashCumulative)
      })
      expect(s.totals).toEqual(r.base.totals)
      expect(s.diff).toEqual({ corporateTax: 0, cash: 0, insurance: 0, corporateAssets: 0, dcAsset: 0, dcContribution: 0, referenceTotal: 0 })
    }
  })
  it('対策なし: 利益3,000万円・30%で毎年900万円の法人税、20年で現金4億2,000万円', () => {
    expect(r.base.firstYear.corporateTax).toBe(9_000_000)
    expect(r.base.totals.cash).toBe(420_000_000)
    expect(r.base.totals.corporateTax).toBe(180_000_000)
  })
})

describe('2. 役員報酬の減額だけ', () => {
  const input: FundInput = { ...zero, payCut: { enabled: true, officers: 2, monthlyCutPerOfficer: 500_000, socialInsurance: null } }
  const r = simulateFund(input)
  const s = r.scenarios[0]
  it('減額分（2人×50万円×12か月＝1,200万円）が利益・税・現金に反映される', () => {
    expect(s.firstYear.payCut).toBe(12_000_000)
    expect(s.firstYear.taxableIncome).toBe(42_000_000)
    expect(s.firstYear.corporateTax).toBeCloseTo(12_600_000, 6)
    expect(s.firstYear.cashFlow).toBeCloseTo(29_400_000, 6)
    expect(s.diff.cash).toBeCloseTo(8_400_000 * 20, 4)
  })
  it('保険料は自動で増えない', () => {
    expect(s.rows.every((row) => row.welfarePremium === 0 && row.officerPremium === 0)).toBe(true)
    expect(s.totals.insurance).toBe(0)
  })
  it('減額前の報酬月額などを入れたときだけ、「役員報酬・退職金 比較シミュレーター」と同じ計算で会社負担の社会保険料の減少を加える', () => {
    expect(socialInsuranceSaving(input)).toBe(0)
    const withSi: FundInput = { ...input, payCut: { ...input.payCut, socialInsurance: { payBefore: 1_500_000, age: 50, prefecture: '東京都' } } }
    const expected = (monthlySocialInsurance(1_500_000, 50, '東京都').total - monthlySocialInsurance(1_000_000, 50, '東京都').total) * 12 * 2
    expect(socialInsuranceSaving(withSi)).toBe(expected)
    expect(expected).toBeGreaterThan(0)
    expect(simulateFund(withSi).scenarios[0].firstYear.taxableIncome).toBe(42_000_000 + expected)
  })
})

describe('3. 損金割合0%と50%', () => {
  const r0 = simulateFund({ ...zero, welfare: welfare({ deductibleRate: 0 }) }).scenarios[0]
  const r50 = simulateFund({ ...zero, welfare: welfare({ deductibleRate: 50 }) }).scenarios[0]
  it('税は異なる（50%の方が損金の分だけ少ない）', () => {
    expect(r0.firstYear.corporateTax).toBeCloseTo(9_000_000, 6)
    expect(r50.firstYear.corporateTax).toBeCloseTo(7_500_000, 6)
  })
  it('実際に払う保険料は同じ', () => {
    expect(r0.rows.map((x) => x.welfarePremium)).toEqual(r50.rows.map((x) => x.welfarePremium))
    expect(r0.welfare?.premiumTotal).toBe(r50.welfare?.premiumTotal)
  })
  it('損金にならない保険料も現金からは全額出ていく', () => {
    expect(r0.firstYear.cashFlow).toBeCloseTo(30_000_000 - 10_000_000 - 9_000_000, 6)
  })
})

describe('4. 5年払済', () => {
  const r = simulateFund({ ...zero, welfare: welfare() })
  const paidUp5 = r.scenarios.find((s) => s.key === 'paidUp')!
  it('6年目以降の保険料は0', () => {
    expect(paidUp5.rows.slice(0, 5).every((x) => x.welfarePremium === 10_000_000)).toBe(true)
    expect(paidUp5.rows.slice(5).every((x) => x.welfarePremium === 0)).toBe(true)
    expect(paidUp5.label).toBe('5年で払済')
  })
  it('比較期間末の返戻率（300%）が払った保険料5,000万円に反映される', () => {
    expect(paidUp5.welfare).toEqual({ premiumYears: 5, premiumTotal: 50_000_000, rate: 300, surrenderValue: 150_000_000 })
    expect(paidUp5.totals.insurance).toBe(150_000_000)
  })
  it('通常（20年払込）は2億円 × 150% = 3億円', () => {
    expect(r.scenarios[0].welfare?.surrenderValue).toBe(300_000_000)
  })
  it('返戻率が未入力なら解約返戻金を推測しない（null）', () => {
    const s = simulateFund({ ...zero, welfare: welfare({ paidUpRate: null }) }).scenarios[1]
    expect(s.welfare?.surrenderValue).toBeNull()
    expect(s.totals.insurance).toBeNull()
    expect(s.totals.corporateAssets).toBeNull()
    expect(s.totals.cash).toBeGreaterThan(0) // 現金は計算できる
  })
  it('払済の年数がない（払済を試算しない）ときは、通常のケースだけを計算する（決定C19）', () => {
    const res = simulateFund({ ...zero, welfare: welfare(), paidUpYears: null })
    expect(res.scenarios.map((s) => s.key)).toEqual(['maturity'])
    expect(res.scenarios[0].welfare?.surrenderValue).toBe(300_000_000)
  })
  it('払済年数が比較期間以上なら通常と同じ払い方で注意を出す', () => {
    const res = simulateFund({ ...zero, years: 10, welfare: welfare(), paidUpYears: 15 })
    expect(res.scenarios[1].premiumYears.welfare).toBe(10)
    expect(res.warnings.some((w) => w.message.includes('15年'))).toBe(true)
  })
})

describe('5. DC', () => {
  it('人数0ならDCの金額は0', () => {
    const s = simulateFund({ ...zero, dc: { ...zero.dc, members: 0, monthlyPerMember: 62_000, annualReturnRate: 6 } }).scenarios[0]
    expect(s.totals.dcAsset).toBe(0)
    expect(s.totals.dcContribution).toBe(0)
    expect(s.rows.every((x) => x.dcCompanyCost === 0)).toBe(true)
  })
  it('運用0%なら掛金総額と運用額が一致する', () => {
    const s = simulateFund({ ...zero, dc: { ...zero.dc, members: 2, monthlyPerMember: 62_000, annualReturnRate: 0 } }).scenarios[0]
    expect(s.totals.dcContribution).toBe(29_760_000)
    expect(s.totals.dcAsset).toBeCloseTo(29_760_000, 4)
  })
  it('資料のモデル例（2名・62,000円・20年・6%）は約5,623万円', () => {
    const assets = dcAssetByYear(124_000, 6, 20, 20)
    expect(Math.round(assets[19] / 10_000)).toBe(5_623)
  })
  it('会社が上乗せする場合は損金になり、選択制（給与から振替）は会社の費用を増やさない', () => {
    const dc = { members: 2, monthlyPerMember: 62_000, annualReturnRate: 6, contributionYears: 20 }
    const employer = simulateFund({ ...zero, dc: { ...dc, funding: 'employer' } }).scenarios[0]
    const swap = simulateFund({ ...zero, dc: { ...dc, funding: 'salarySwap' } }).scenarios[0]
    expect(employer.firstYear.taxableIncome).toBe(30_000_000 - 1_488_000)
    expect(swap.firstYear.taxableIncome).toBe(30_000_000)
    expect(swap.totals.cash).toBe(simulateFund(zero).base.totals.cash)
    expect(swap.totals.dcAsset).toBeCloseTo(employer.totals.dcAsset, 6)
  })
  it('拠出期間が終わったら掛金は0で、運用だけ続く', () => {
    const s = simulateFund({ ...zero, dc: { members: 1, monthlyPerMember: 50_000, annualReturnRate: 3, contributionYears: 10, funding: 'employer' } }).scenarios[0]
    expect(s.rows[10].dcContribution).toBe(0)
    expect(s.totals.dcContribution).toBe(6_000_000)
    expect(s.rows[19].dcAsset).toBeGreaterThan(s.rows[9].dcAsset)
  })
})

describe('7. 二重計上がない', () => {
  const input: FundInput = {
    ...zero,
    dc: { members: 3, monthlyPerMember: 30_000, annualReturnRate: 4, contributionYears: 20, funding: 'employer' },
    welfare: welfare(),
    officer: { enabled: true, annualPremium: 3_000_000, deductibleRate: 40, maturityRate: 90, paidUpRate: 120 },
    payCut: { enabled: true, officers: 1, monthlyCutPerOfficer: 300_000, socialInsurance: { payBefore: 1_000_000, age: 55, prefecture: '大阪府' } },
  }
  const r = simulateFund(input)
  it('毎年: 利益＋減額＋社保減 ＝ DC会社負担＋保険料＋法人税＋現金の増加', () => {
    for (const s of r.scenarios) {
      for (const row of s.rows) {
        const inflow = input.annualProfit + row.payCut + row.socialInsuranceSaving
        const outflow = row.dcCompanyCost + row.welfarePremium + row.officerPremium + row.corporateTax + row.cashFlow
        expect(outflow).toBeCloseTo(inflow, 6)
      }
    }
  })
  it('DC資産は法人の現金・法人資産に入らない', () => {
    const s = r.scenarios[0]
    expect(s.totals.corporateAssets).toBeCloseTo(s.totals.cash + (s.totals.insurance ?? 0), 6)
    expect(s.totals.referenceTotal).toBeCloseTo((s.totals.corporateAssets ?? 0) + s.totals.dcAsset, 6)
  })
  it('保険の評価額は払った保険料 × 返戻率だけで、現金とは別', () => {
    const s = r.scenarios[0]
    expect(s.totals.insurance).toBeCloseTo(200_000_000 * 1.5 + 60_000_000 * 0.9, 4)
  })
})

describe('警告', () => {
  it('課税対象利益がマイナスでも法人税は負にしない', () => {
    const r = simulateFund({ ...zero, annualProfit: 5_000_000, welfare: welfare({ deductibleRate: 100 }) })
    const s = r.scenarios[0]
    expect(s.firstYear.taxableIncome).toBe(-5_000_000)
    expect(s.firstYear.corporateTax).toBe(0)
    expect(r.warnings.some((w) => w.message.includes('マイナス'))).toBe(true)
  })
  it('利益が0以下でも法人税は0円', () => {
    const r = simulateFund({ ...zero, annualProfit: -1_000_000 })
    expect(r.base.firstYear.corporateTax).toBe(0)
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})

describe('年ごとの利益（将来の年別入力のための設計）', () => {
  it('年別の利益があればその年に使い、足りない年は年間法人利益を使う', () => {
    const r = simulateFund({ ...zero, years: 3, profitByYear: [10_000_000, 20_000_000] })
    expect(r.base.rows.map((x) => x.corporateTax)).toEqual([3_000_000, 6_000_000, 9_000_000])
    expect(r.scenarios[0].rows.map((x) => x.taxableIncome)).toEqual([10_000_000, 20_000_000, 30_000_000])
  })
  it('一部の年が0円以下なら注意を出す', () => {
    const r = simulateFund({ ...zero, years: 2, profitByYear: [-5_000_000] })
    expect(r.base.rows[0].corporateTax).toBe(0)
    expect(r.warnings.some((w) => w.message.includes('0円以下の年'))).toBe(true)
  })
})

describe('打ち合わせの例（2026-10-23）: 報酬減額＋保険の法人税', () => {
  // 「報酬を減らすが保険は全額経費にならないので、600万円のうち半分の300万円に法人税がかかり90万円出ていく」
  it('報酬減額600万円・保険料600万円（1/2損金）なら、法人税は対策なしより90万円増える', () => {
    const s = simulateFund({
      ...zero,
      payCut: { enabled: true, officers: 1, monthlyCutPerOfficer: 500_000, socialInsurance: null },
      officer: { enabled: true, annualPremium: 6_000_000, deductibleRate: 50, maturityRate: null, paidUpRate: null },
    }).scenarios[0]
    expect(s.firstYear.corporateTax - 9_000_000).toBeCloseTo(900_000, 6)
  })
})
