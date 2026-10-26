import type { BaseYearRow, FundInput, FundResult, FundTotals, ScenarioResult } from '../calc/fundFormation/types.ts'

// 結果の列（対策なし・対策ありの各ケース）。画面と印刷で同じ並びを使う

export const NOT_ENTERED = '返戻率未入力'

export type Column = { key: string; label: string; totals: FundTotals; diff: FundTotals | null; scenario: ScenarioResult | null; baseFirst?: BaseYearRow }

export const usesInsurance = (input: FundInput) => input.welfare.enabled || input.officer.enabled

export function columnsFor(result: FundResult, input: FundInput): Column[] {
  const insurance = usesInsurance(input)
  const scenarios = insurance ? result.scenarios : result.scenarios.slice(0, 1)
  return [
    { key: 'base', label: '対策なし', totals: result.base.totals, diff: null, scenario: null, baseFirst: result.base.firstYear },
    ...scenarios.map((s) => ({ key: s.key, label: insurance ? `対策あり：${s.label}` : '対策あり', totals: s.totals, diff: s.diff, scenario: s })),
  ]
}
