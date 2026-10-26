// 端数処理（docs/calculation-rules.md）。端数処理はすべてこのファイルの関数を使う。

// 小数の計算誤差（例: 0.6 × 0.3 = 0.18000000000000002）で切り捨て結果がずれないよう、
// 1銭（0.01円）未満の誤差を取り除いてから端数処理する
function clean(value: number): number {
  return Math.round(value * 100) / 100
}

// unit 円未満を切り捨てる（例: floorTo(36_812_345, 1000) → 36_812_000）
// 課税所得・退職所得は1,000円未満、所得税・住民税（所得割）は100円未満を切り捨てる
export function floorTo(value: number, unit: number): number {
  return Math.floor(clean(value) / unit) * unit
}

// 社会保険料の個人負担分: 50銭以下は切り捨て、50銭を超えると切り上げ（calculation-rules.md 2.2）
export function roundSocialInsurance(value: number): number {
  const v = clean(value)
  const yen = Math.floor(v)
  return v - yen > 0.5 ? yen + 1 : yen
}

// 円未満を四捨五入する。所得税・住民税の月額（年額 ÷ 12: 決定D66）と、画面・PDFの表示（決定D67）に使う
export function roundYen(value: number): number {
  return Math.round(clean(value))
}
