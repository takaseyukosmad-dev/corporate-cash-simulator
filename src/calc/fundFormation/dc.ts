// 企業型DCの運用の計算。毎月末に掛金を拠出し、年率を月の複利に換算して増やす
// （月利 = (1 + 年率)^(1/12) − 1）。運用益にかかる税金・手数料は計算しない

export function monthlyRate(annualRatePercent: number): number {
  return (1 + annualRatePercent / 100) ** (1 / 12) - 1
}

// 年末ごとの資産（index 0 = 1年目の年末）。contributionYears 年が過ぎたら拠出をやめ、運用だけ続ける
export function dcAssetByYear(monthlyContribution: number, annualRatePercent: number, contributionYears: number, years: number): number[] {
  const i = monthlyRate(annualRatePercent)
  const result: number[] = []
  let balance = 0
  for (let year = 1; year <= years; year++) {
    const contribution = year <= contributionYears ? monthlyContribution : 0
    for (let m = 0; m < 12; m++) balance = balance * (1 + i) + contribution
    result.push(balance)
  }
  return result
}
