// 画面・PDFの表示用の書式。計算はしない。金額は表示するときに円未満を四捨五入する（決定D67）
import { roundYen } from '../calc/rounding.ts'

const yenFormatter = new Intl.NumberFormat('ja-JP')

// 1,234,567円
export function formatYen(value: number): string {
  return `${yenFormatter.format(roundYen(value))}円`
}

// +1,234,567円 / −1,234,567円（差額用。0は符号なし）
export function formatSignedYen(value: number): string {
  const rounded = roundYen(value)
  if (rounded === 0) return '0円'
  const sign = rounded > 0 ? '+' : '−'
  return `${sign}${yenFormatter.format(Math.abs(rounded))}円`
}

// グラフ用: 万円単位に丸めた数値の文字列（15,262）
export function formatMan(value: number): string {
  return yenFormatter.format(Math.round(value / 10000))
}

// 85 → 85.0%
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// 入力した桁のまま表示する率（預金金利など。小数第3位まで: 0.4%、0.025%）
export function formatRate(value: number): string {
  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 3 }).format(value)}%`
}

// 2026年10月13日
export function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 2026-10-13T05:30:00Z → 2026/10/13 14:30（表示する端末の時刻）
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
