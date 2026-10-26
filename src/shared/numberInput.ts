// 入力欄の文字列の扱い（「役員報酬・退職金 比較シミュレーター」の src/screens/validation.ts・simulatorForm.ts と同じ処理）

// 全角の数字・カンマ・ピリオド・マイナスを半角にし、桁区切りのカンマと空白を取り除く
export function normalizeNumberText(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，、]/g, ',')
    .replace(/[．。]/g, '.')
    .replace(/[－ー−]/g, '-')
    .replace(/[,\s　]/g, '')
}

// 入力欄の文字列を数値にする。空欄や数値でないときは null
export function parseNumber(text: string): number | null {
  const cleaned = normalizeNumberText(text)
  if (cleaned === '' || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

// 金額などを桁区切りの文字列にする（入力欄から離れたときの表示）
export function formatNumberText(text: string): string {
  const n = parseNumber(text)
  return n === null ? text : new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(n)
}
