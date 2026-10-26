import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { simulateFund } from '../src/calc/fundFormation/simulateFund.ts'
import { FundPrint } from '../src/screens/FundPrint.tsx'
import { FundResultPanel } from '../src/screens/FundResultPanel.tsx'
import { DEMO_FUND_FORM, EMPTY_FUND_FORM, monthlyCutPerOfficer, toFundInput, validateFundForm } from '../src/screens/fundForm.ts'

describe('入力欄 → 計算用の入力', () => {
  it('開いたときは利益が空欄なので計算しない', () => {
    expect(toFundInput(EMPTY_FUND_FORM)).toBeNull()
    expect(validateFundForm(EMPTY_FUND_FORM).annualProfitMan).toBeDefined()
  })
  it('開いたときの保険の返戻率は空欄（推測した値を入れない）', () => {
    for (const k of ['welfareMaturityRate', 'welfarePaidUp1Rate', 'welfarePaidUp2Rate', 'officerMaturityRate', 'officerPaidUp1Rate', 'officerPaidUp2Rate'] as const) {
      expect(EMPTY_FUND_FORM[k]).toBe('')
    }
  })
  it('万円の入力を円にする。DC拠出期間が空欄なら比較期間と同じ', () => {
    const input = toFundInput({ ...EMPTY_FUND_FORM, annualProfitMan: '3,000', dcMembers: '2', dcMonthly: '62000' })!
    expect(input.annualProfit).toBe(30_000_000)
    expect(input.dc.contributionYears).toBe(20)
    expect(input.dc.monthlyPerMember).toBe(62_000)
  })
  it('使わない保険の欄は調べない／使う保険は保険料と損金割合が必要', () => {
    const base = { ...EMPTY_FUND_FORM, annualProfitMan: '3000' }
    expect(toFundInput(base)).not.toBeNull()
    const errors = validateFundForm({ ...base, welfareEnabled: true })
    expect(errors.welfarePremiumMan).toBeDefined()
    expect(errors.welfareDeductible).toBeDefined()
    expect(errors.welfareMaturityRate).toBeUndefined() // 返戻率は空欄可
  })
  it('損金割合は0〜100%、DC拠出期間は比較期間以下', () => {
    const base = { ...EMPTY_FUND_FORM, annualProfitMan: '3000', welfareEnabled: true, welfarePremiumMan: '100', welfareDeductible: '120' }
    expect(validateFundForm(base).welfareDeductible).toBeDefined()
    expect(validateFundForm({ ...base, welfareDeductible: '50', dcYears: '25' }).dcYears).toBeDefined()
  })
  it('DCの月額掛金の初期値は打ち合わせの想定の62,000円（加入人数0なら使わない）', () => {
    expect(EMPTY_FUND_FORM.dcMonthly).toBe('62,000')
    expect(toFundInput({ ...EMPTY_FUND_FORM, annualProfitMan: '3000' })!.dc.monthlyPerMember).toBe(0)
  })
  it('役員報酬の減額は「年間の総額（万円）」でも入れられ、1人あたり月額に直す', () => {
    const v = { ...EMPTY_FUND_FORM, annualProfitMan: '3000', payCutEnabled: true, payCutOfficers: '2', payCutMode: 'total' as const, payCutTotalMan: '600' }
    expect(monthlyCutPerOfficer(v)).toBe(250_000)
    const input = toFundInput(v)!
    expect(input.payCut.officers * input.payCut.monthlyCutPerOfficer * 12).toBe(6_000_000)
    expect(validateFundForm({ ...v, payCutTotalMan: '' }).payCutTotalMan).toBeDefined()
    expect(validateFundForm({ ...v, payCutTotalMan: '' }).payCutMonthly).toBeUndefined()
  })
  it('年間の総額で入れたときも、減額前の報酬月額は1人あたり月額減額以上が必要', () => {
    const v = { ...EMPTY_FUND_FORM, annualProfitMan: '3000', payCutEnabled: true, payCutOfficers: '1', payCutMode: 'total' as const, payCutTotalMan: '600', payCutPayBefore: '400000', payCutAge: '50', payCutPrefecture: '東京都' }
    expect(validateFundForm(v).payCutPayBefore).toBeDefined()
    expect(validateFundForm({ ...v, payCutPayBefore: '500000' }).payCutPayBefore).toBeUndefined()
  })
  it('法人名は空欄でも計算でき、51文字以上はエラーになる（決定C17）', () => {
    const base = { ...EMPTY_FUND_FORM, annualProfitMan: '3000' }
    expect(toFundInput({ ...base, companyName: '' })).not.toBeNull()
    expect(validateFundForm({ ...base, companyName: 'あ'.repeat(50) }).companyName).toBeUndefined()
    expect(validateFundForm({ ...base, companyName: 'あ'.repeat(51) }).companyName).toBeDefined()
  })
  it('法人名は計算の結果を変えない', () => {
    const base = { ...EMPTY_FUND_FORM, annualProfitMan: '3000' }
    expect(toFundInput({ ...base, companyName: 'サンプル商事株式会社' })).toEqual(toFundInput(base))
  })
  it('デモ用の仮データは計算できる', () => {
    expect(toFundInput(DEMO_FUND_FORM)).not.toBeNull()
  })
})

// 「保証」は、保証しないという言い方でだけ使う（印刷の免責の文も含む）
const ALLOWED_GUARANTEE_WORDS = /^(非保証|.保証された(金額|値|もの)ではありません|.保証するものではありません)/

describe('8. 未確定の値を「保証」と表示しない', () => {
  const input = toFundInput(DEMO_FUND_FORM)!
  const html = renderToStaticMarkup(<FundResultPanel input={input} result={simulateFund(input)} showReference={false} onShowReferenceChange={() => {}} />)
  const text = html.replace(/<[^>]+>/g, ' ')
  it('「保証」は否定の形（非保証・保証された値ではありません）でしか使わない', () => {
    const uses = [...text.matchAll(/.保証[^。]{0,12}/g)].map((m) => m[0])
    expect(uses.length).toBeGreaterThan(0)
    for (const u of uses) expect(u).toMatch(ALLOWED_GUARANTEE_WORDS)
    expect(text).not.toMatch(/保証額|保証値|確定値/)
  })
  it('概算・非保証・計算していないことを明示する', () => {
    expect(text).toContain('概算')
    expect(text).toContain('計算していません')
    expect(text).toContain('DC加入者資産（個人')
  })
  it('返戻率が未入力のケースは金額を出さず「返戻率未入力」と表示する', () => {
    expect(text).toContain('返戻率未入力') // デモの5年払済は返戻率が空欄
  })
})

describe('通常と払済の差', () => {
  const input = toFundInput(DEMO_FUND_FORM)!
  const html = renderToStaticMarkup(<FundResultPanel input={input} result={simulateFund(input)} showReference={false} onShowReferenceChange={() => {}} />)
  it('比較表に「通常との差」の行がある（10年払済: 保険料は1億円少なく、返戻金は1億円少ない）', () => {
    expect(html).toContain('通常（期間末まで払込）との差')
    expect(html).toContain('−100,000,000円')
  })
})

describe('印刷用の表示（決定C14・C17・C18）', () => {
  const demo = toFundInput(DEMO_FUND_FORM)!
  const render = (companyName: string, input = demo) =>
    renderToStaticMarkup(
      <FundPrint companyName={companyName} input={input} result={simulateFund(input)} showReference={false} date={new Date(2026, 9, 26)} />,
    )
  const html = render('サンプル商事株式会社')
  const text = html.replace(/<[^>]+>/g, ' ')
  it('A4横の4ページで、ページ番号が付く', () => {
    expect(html.match(/class="print-page"/g)).toHaveLength(4)
    expect(text).toContain('4 / 4')
  })
  it('タイトルに法人名と作成日が入る。空欄なら「様」を付けない', () => {
    expect(text).toContain('サンプル商事株式会社様　会社のキャッシュ増加のご提案')
    expect(text).toContain('作成日：2026年10月26日')
    expect(render('  ')).toContain('<h1>会社のキャッシュ増加のご提案</h1>')
  })
  it('年次の明細は入れない', () => {
    expect(text).not.toContain('年次の明細')
    expect(html).not.toContain('fund-year-table')
  })
  it('保険を使わない条件では、払済のケースを載せない', () => {
    const noInsurance = toFundInput({ ...EMPTY_FUND_FORM, annualProfitMan: '3000' })!
    const t = render('', noInsurance).replace(/<[^>]+>/g, ' ')
    expect(t).not.toMatch(/\d+年で払済/)
    expect(t).toContain('対策あり：DC・役員報酬の見直しを組み合わせた場合')
  })
  it('ご注意（免責）の6つの文が入り、「保証」は保証しない言い方だけ', () => {
    expect(html.match(/<ul class="plain print-disclaimer">(.*?)<\/ul>/)![1].match(/<li>/g)).toHaveLength(6)
    expect(text).toContain('本資料の利用により生じた損害について、作成者は責任を負いかねます。')
    for (const u of [...text.matchAll(/.保証[^。]{0,12}/g)].map((m) => m[0])) expect(u).toMatch(ALLOWED_GUARANTEE_WORDS)
  })
})
