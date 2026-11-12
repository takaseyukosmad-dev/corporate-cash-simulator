import { formatMan } from '../shared/format.ts'
import { spreadLabels, tightScale } from '../shared/scale.ts'

// グラフ（SVG）。色は styles.css の .fund-* クラス
// 法人の現金・法人保有保険・DC加入者資産（個人）を色と位置で分け、合計の棒にはしない

export type AssetColumn = {
  label: string
  cash: number
  insurance: number | null // null: 返戻率が未入力
  hasInsurance: boolean
  dcAsset: number
  personalNet: number // 個人の報酬の手残り（対策なしだけ。決定C27）
}

// 印刷用（決定C32・C34）: 紙の上で文字が大きく見えるよう、グラフの枠（viewBox）を小さくして縮み方を減らす。
// 文字の大きさは styles.css の .print-page の指定。枠が小さい分、棒を細くし、余白を広げて文字が重ならないようにする
const ASSET_SCREEN = { width: 720, height: 340, left: 64, right: 16, top: 24, bottom: 64, maxBar: 56, subY: 16, groupY: 40 }
const ASSET_PRINT = { width: 560, height: 210, left: 68, right: 8, top: 26, bottom: 46, maxBar: 46, subY: 16, groupY: 36 }

// 比較期間末の資産。各ケースで「法人（現金＋保険）」の積み上げ棒と、「個人（DC＋報酬の手残り）」の積み上げ棒を離して並べる
export function AssetBarChart({ columns, years, print = false }: { columns: AssetColumn[]; years: number; print?: boolean }) {
  const { width, height, left, right, top, bottom, maxBar, subY, groupY } = print ? ASSET_PRINT : ASSET_SCREEN
  const plotW = width - left - right
  const plotH = height - top - bottom
  const maxValue = Math.max(1, ...columns.map((c) => Math.max(0, c.cash) + Math.max(0, c.insurance ?? 0)), ...columns.map((c) => c.dcAsset + c.personalNet))
  const minValue = Math.min(0, ...columns.map((c) => c.cash))
  const { step, top: yTop } = tightScale(maxValue)
  const yBottom = minValue < 0 ? -Math.ceil(-minValue / step) * step : 0
  const y = (v: number) => top + plotH - ((v - yBottom) / (yTop - yBottom)) * plotH
  const ticks: number[] = []
  for (let v = yBottom; v <= yTop + 1e-6; v += step) ticks.push(v)
  const slot = plotW / columns.length
  const barW = Math.min(maxBar, slot * 0.34)
  const label = `${years}年後の資産。` + columns.map((c) => `${c.label}: 法人の現金${formatMan(c.cash)}万円、法人保有保険${c.insurance === null ? '未入力' : `${formatMan(c.insurance)}万円`}、DC加入者資産${formatMan(c.dcAsset)}万円${c.personalNet > 0 ? `、個人の報酬の手残り${formatMan(c.personalNet)}万円` : ''}`).join('。')

  return (
    <svg className="chart fund-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <g className="grid">
        {ticks.map((v) => (
          <line key={v} x1={left} y1={y(v)} x2={left + plotW} y2={y(v)} />
        ))}
      </g>
      <g className="axis-label">
        {ticks.map((v) => (
          <text key={v} x={left - 8} y={y(v) + 5} textAnchor="end">
            {formatMan(v)}
          </text>
        ))}
      </g>
      {columns.map((c, i) => {
        const cx = left + slot * i + slot / 2
        const corpX = cx - barW - 4
        const dcX = cx + 8
        const cashTop = y(Math.max(0, c.cash))
        const cashBottom = y(Math.min(0, c.cash))
        const ins = Math.max(0, c.insurance ?? 0)
        const insBase = Math.max(0, c.cash)
        const corporate = c.cash + (c.insurance ?? 0)
        return (
          <g key={c.label}>
            <rect className="fund-cash" x={corpX} y={cashTop} width={barW} height={Math.max(0, cashBottom - cashTop)} rx={2} />
            {ins > 0 && <rect className="fund-ins" x={corpX} y={y(insBase + ins)} width={barW} height={y(insBase) - y(insBase + ins)} rx={2} />}
            <text className="bar-value" x={corpX + barW / 2} y={y(Math.max(0, corporate, c.cash)) - 6} textAnchor="middle">
              {c.insurance === null && c.hasInsurance ? `${formatMan(c.cash)}+?` : formatMan(corporate)}
            </text>
            {c.dcAsset > 0 && <rect className="fund-dc" x={dcX} y={y(c.dcAsset)} width={barW * 0.8} height={y(0) - y(c.dcAsset)} rx={2} />}
            {c.personalNet > 0 && (
              <rect className="fund-net" x={dcX} y={y(c.dcAsset + c.personalNet)} width={barW * 0.8} height={y(c.dcAsset) - y(c.dcAsset + c.personalNet)} rx={2} />
            )}
            {c.dcAsset + c.personalNet > 0 && (
              <text className="bar-value" x={dcX + (barW * 0.8) / 2} y={y(c.dcAsset + c.personalNet) - 6} textAnchor="middle">
                {formatMan(c.dcAsset + c.personalNet)}
              </text>
            )}
            <text className="fund-sub-label" x={corpX + barW / 2} y={top + plotH + subY} textAnchor="middle">
              法人
            </text>
            <text className="fund-sub-label" x={dcX + (barW * 0.8) / 2} y={top + plotH + subY} textAnchor="middle">
              個人
            </text>
            <text className="group-label" x={cx} y={top + plotH + groupY} textAnchor="middle">
              {c.label}
            </text>
          </g>
        )
      })}
      <line className="fund-zero" x1={left} y1={y(0)} x2={left + plotW} y2={y(0)} />
    </svg>
  )
}

export type CashSeries = { key: string; label: string; className: string; values: number[] } // values[i] = i+1年目末

// 法人の現金（増加の累計）の年次推移。保険の解約返戻金は途中の年の返戻率がないため描かない
const CASH_SCREEN = { width: 720, height: 320, left: 64, right: 140, top: 20, bottom: 40, xLabelY: 22, labelGap: 18 }
const CASH_PRINT = { width: 560, height: 210, left: 68, right: 168, top: 14, bottom: 30, xLabelY: 22, labelGap: 17 }

export function CashLineChart({ series, years, print = false }: { series: CashSeries[]; years: number; print?: boolean }) {
  const { width, height, left, right, top, bottom, xLabelY, labelGap } = print ? CASH_PRINT : CASH_SCREEN
  const plotW = width - left - right
  const plotH = height - top - bottom
  const all = series.flatMap((s) => s.values)
  const maxValue = Math.max(1, ...all)
  const minValue = Math.min(0, ...all)
  const { step, top: yTop } = tightScale(maxValue)
  const yBottom = minValue < 0 ? -Math.ceil(-minValue / step) * step : 0
  const y = (v: number) => top + plotH - ((v - yBottom) / (yTop - yBottom)) * plotH
  const x = (year: number) => left + (year / years) * plotW
  const ticks: number[] = []
  for (let v = yBottom; v <= yTop + 1e-6; v += step) ticks.push(v)
  const xStep = years <= 10 ? 1 : years <= 20 ? 5 : 10
  const xTicks = Array.from({ length: Math.floor(years / xStep) + 1 }, (_, i) => i * xStep)
  if (xTicks[xTicks.length - 1] !== years) xTicks.push(years)
  const labels = spreadLabels(
    series.map((s) => ({ s, y: y(s.values[s.values.length - 1]) + 5 })),
    labelGap,
  )
  const ariaLabel = `法人の現金（増加の累計）の推移。${years}年後に` + series.map((s) => `${s.label}${formatMan(s.values[s.values.length - 1])}万円`).join('、')

  return (
    <svg className="chart fund-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      <g className="grid">
        {ticks.map((v) => (
          <line key={v} x1={left} y1={y(v)} x2={left + plotW} y2={y(v)} />
        ))}
      </g>
      <g className="axis-label">
        {ticks.map((v) => (
          <text key={v} x={left - 8} y={y(v) + 5} textAnchor="end">
            {formatMan(v)}
          </text>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={top + plotH + xLabelY} textAnchor="middle">
            {t === years ? `${t}年` : t}
          </text>
        ))}
      </g>
      {series.map((s) => (
        <polyline key={s.key} className={`line ${s.className}`} points={[[0, 0], ...s.values.map((v, i) => [i + 1, v])].map(([yr, v]) => `${x(yr)},${y(v)}`).join(' ')} />
      ))}
      {labels.map((l) => (
        <text key={l.s.key} className={`fund-end-label ${l.s.className}`} x={left + plotW + 8} y={l.y}>
          {`${formatMan(l.s.values[l.s.values.length - 1])} ${l.s.label}`}
        </text>
      ))}
    </svg>
  )
}
