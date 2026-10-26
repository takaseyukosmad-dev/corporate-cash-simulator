// 万円単位の読みやすい書き方（「役員報酬・退職金 比較シミュレーター」の src/shared/summary.ts と同じ処理）

const numberFormatter = new Intl.NumberFormat('ja-JP')

// 万円単位にして読みやすく書く（万円未満は四捨五入。符号なし）: 7,464万円 ／ 1億452万円 ／ 3億円
export function formatManYen(value: number): string {
  const man = Math.round(Math.abs(value) / 10000)
  const oku = Math.floor(man / 10000)
  const rest = man % 10000
  if (oku === 0) return `${numberFormatter.format(rest)}万円`
  return rest === 0 ? `${oku}億円` : `${oku}億${numberFormatter.format(rest)}万円`
}

// 符号つき: +7,464万円 ／ −294万円 ／ 0円
export function formatSignedManYen(value: number): string {
  const man = Math.round(value / 10000)
  if (man === 0) return '0円'
  return `${man > 0 ? '+' : '−'}${formatManYen(value)}`
}
