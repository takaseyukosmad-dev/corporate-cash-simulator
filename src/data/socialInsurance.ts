// 社会保険の料率・標準報酬月額の等級表（令和8年度）。中身は social-insurance-2026.json
import type { Prefecture } from './prefectures.ts'
import raw from './social-insurance-2026.json'

export type Grade = {
  grade: number // 等級
  standard: number // 標準報酬月額
  from: number // 報酬月額の下限（円以上）。次の等級の from 未満までがこの等級
}

export type SocialInsuranceData = {
  baseYearLabel: string
  sources: { name: string; url: string; retrievedAt: string }[]
  healthInsuranceRates: Record<Prefecture, number> // 健康保険料率 %（協会けんぽ・都道府県別）
  careInsuranceRate: number // 介護保険料率 %（40〜64歳）
  childSupportRate: number // 子ども・子育て支援金率 %
  pensionRate: number // 厚生年金保険料率 %
  healthGrades: Grade[] // 健康保険の等級表（50等級）
  pensionGrades: Grade[] // 厚生年金の等級表（32等級）
}

export const socialInsurance2026: SocialInsuranceData = raw
