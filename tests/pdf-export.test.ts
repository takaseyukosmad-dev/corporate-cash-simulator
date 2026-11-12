import { describe, expect, it } from 'vitest'
import { pdfFileName } from '../src/screens/pdfExport.ts'

describe('PDFのファイル名（決定C33）', () => {
  const date = new Date(2026, 10, 12)
  it('法人名があれば「○○様_キャッシュ増加のご提案_作成日.pdf」', () => {
    expect(pdfFileName('サンプル商事株式会社', date)).toBe('サンプル商事株式会社様_キャッシュ増加のご提案_20261112.pdf')
  })
  it('法人名が空欄なら「様」を付けない', () => {
    expect(pdfFileName('  ', date)).toBe('キャッシュ増加のご提案_20261112.pdf')
  })
  it('ファイル名に使えない記号は除く', () => {
    expect(pdfFileName('A/B:C*株式会社', date)).toBe('ABC株式会社様_キャッシュ増加のご提案_20261112.pdf')
  })
})
