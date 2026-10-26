// 目盛りの上限と間隔を、きりの良い値にする（例: 152,622,900円 → 間隔4,000万円・上限1億6,000万円）
export function niceScale(maxValue: number, divisions: number): { step: number; top: number } {
  if (maxValue <= 0) return { step: 1, top: divisions }
  const raw = maxValue / divisions
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 4, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude
  return { step, top: step * divisions }
}

// 折れ線グラフ用: 上限を最大値のすぐ上のきりの良い値にして、上の余白を小さくする（差を大きく見せる）
// 目盛りの数は3〜6のうち、上限が一番小さくなるもの（同じなら4に近いもの）。上限は最大値の5%増し以上（点と文字の余白）
export function tightScale(maxValue: number): { step: number; top: number; count: number } {
  if (maxValue <= 0) return { step: 1, top: 4, count: 4 }
  const magnitude = 10 ** Math.floor(Math.log10(maxValue))
  const candidates = [0.1, 0.2, 0.25, 0.4, 0.5, 1, 2, 2.5, 4, 5].map((m) => m * magnitude)
  let best = { step: magnitude, top: Infinity, count: 0 }
  for (const step of candidates) {
    const count = Math.ceil((maxValue * 1.05) / step)
    if (count < 3 || count > 6) continue
    const top = step * count
    if (top < best.top || (top === best.top && Math.abs(count - 4) < Math.abs(best.count - 4))) best = { step, top, count }
  }
  return best
}

// 右端のラベルが重ならないよう、上から順に最低間隔をあけて並べ直す
export function spreadLabels<T extends { y: number }>(labels: T[], minGap: number): T[] {
  const sorted = [...labels].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) sorted[i] = { ...sorted[i], y: sorted[i - 1].y + minGap }
  }
  return sorted
}
