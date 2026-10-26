import type { ReactNode } from 'react'
import { PREFECTURES } from '../data/prefectures.ts'
import type { FundField, FundFormValues } from './fundForm.ts'

// 左側（条件入力）。部品・見た目は「役員報酬・退職金 比較シミュレーター」の入力欄と同じクラスを使う

type Props = {
  values: FundFormValues
  onChange: (key: FundField, value: string | boolean) => void
  onBlur: (key: FundField) => void
  errors: Partial<Record<FundField, string>>
}

function Messages({ id, props }: { id: FundField; props: Props }) {
  return props.errors[id] ? (
    <p className="warning error" id={`${id}-error`} role="alert">
      {props.errors[id]}
    </p>
  ) : null
}

const invalid = (id: FundField, props: Props) =>
  props.errors[id] ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}

function Num({ id, label, unit, help, decimal, props }: { id: FundField; label: ReactNode; unit: string; help?: ReactNode; decimal?: boolean; props: Props }) {
  return (
    <div className="row">
      <label htmlFor={`fund-${id}`}>{label}</label>
      <div className="input-wrap">
        <input
          id={`fund-${id}`}
          className="num"
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={props.values[id] as string}
          onChange={(e) => props.onChange(id, e.target.value)}
          onBlur={() => props.onBlur(id)}
          {...invalid(id, props)}
        />
        <span className="unit">{unit}</span>
      </div>
      {help && <p className="help">{help}</p>}
      <Messages id={id} props={props} />
    </div>
  )
}

function Toggle({ id, label, props }: { id: 'welfareEnabled' | 'officerEnabled' | 'payCutEnabled'; label: string; props: Props }) {
  return (
    <label className="fund-toggle" htmlFor={`fund-${id}`}>
      <input id={`fund-${id}`} type="checkbox" checked={props.values[id]} onChange={(e) => props.onChange(id, e.target.checked)} />
      {label}
    </label>
  )
}

function InsuranceGroup({ prefix, title, lead, props }: { prefix: 'welfare' | 'officer'; title: string; lead: string; props: Props }) {
  const enabled = prefix === 'welfare' ? props.values.welfareEnabled : props.values.officerEnabled
  const f = (suffix: string) => `${prefix}${suffix}` as FundField
  const y1 = props.values.paidUp1Years || '—'
  const y2 = props.values.paidUp2Years || '—'
  return (
    <section className="input-group">
      <h2>{title}</h2>
      <Toggle id={`${prefix}Enabled`} label={`${title}を使う`} props={props} />
      <p className="help">{lead}</p>
      {enabled && (
        <div className="fund-sub">
          <Num id={f('PremiumMan')} label="年間保険料" unit="万円" decimal props={props} />
          <Num
            id={f('Deductible')}
            label="損金割合"
            unit="%"
            decimal
            help="保険料のうち会社の経費にできる割合です（資産計上0・4割損金40・1/2損金50・6割損金60・全額損金100）。契約内容・税務処理で変わるため、設計書と税理士に確認してください。"
            props={props}
          />
          <p className="fund-sub-title">比較期間末の解約返戻率（保険設計書の値を入力）</p>
          <p className="help">その時点までに払った保険料の合計に対する割合です。空欄のケースは解約返戻金を計算しません（推測しません）。</p>
          <Num id={f('MaturityRate')} label="通常（期間末まで払込）" unit="%" decimal props={props} />
          <Num id={f('PaidUp1Rate')} label={`${y1}年で払済`} unit="%" decimal props={props} />
          <Num id={f('PaidUp2Rate')} label={`${y2}年で払済`} unit="%" decimal props={props} />
        </div>
      )}
    </section>
  )
}

export function FundInputPanel(props: Props) {
  const { values, onChange, onBlur } = props
  const anyInsurance = values.welfareEnabled || values.officerEnabled
  return (
    <aside className="input-panel" aria-label="条件入力">
      <p className="panel-title">条件入力</p>
      <p className="panel-lead">毎年同じ条件が続くものとして計算します。</p>

      <section className="input-group">
        <h2>基本条件</h2>
        <div className="row">
          <label htmlFor="fund-companyName">法人名（空欄可）</label>
          <input
            id="fund-companyName"
            type="text"
            value={values.companyName}
            onChange={(e) => onChange('companyName', e.target.value)}
            onBlur={() => onBlur('companyName')}
            {...invalid('companyName', props)}
          />
          <p className="help">印刷の1ページ目のタイトルに使います。</p>
          <Messages id="companyName" props={props} />
        </div>
        <Num
          id="annualProfitMan"
          label="年間法人利益"
          unit="万円"
          decimal
          help="現在の役員報酬を払った後で、今回の対策（DC・保険・報酬減額）をする前の利益です。"
          props={props}
        />
        <Num id="years" label="比較期間" unit="年" help="例: 5・10・15・20・25・30年。1〜50年の整数を入れてください。" props={props} />
        <Num
          id="corporateTaxRate"
          label="法人実効税率（概算）"
          unit="%"
          decimal
          help="概算の税率です。税率の段階・繰越欠損金・税額控除などは計算しません。"
          props={props}
        />
      </section>

      <section className="input-group">
        <h2>企業型DC</h2>
        <Num id="dcMembers" label="加入人数（役員を含めてよい）" unit="人" props={props} />
        <Num
          id="dcMonthly"
          label="1人あたり月額掛金"
          unit="円"
          help="初期値62,000円と範囲3,000〜62,000円は、打ち合わせ（2026-10-23）での想定です。制度上の上限・適用時期・他制度の掛金との調整は確認してください（法定値として扱っていません）。"
          props={props}
        />
        <Num id="dcReturnRate" label="運用年率（非保証）" unit="%" decimal help="毎月末に拠出し、年率を月の複利に換算して計算します。" props={props} />
        <Num id="dcYears" label="拠出期間（空欄は比較期間と同じ）" unit="年" props={props} />
      </section>

      <InsuranceGroup prefix="welfare" title="福利厚生保険" lead="法人契約（解約返戻金は法人のもの）として計算します。" props={props} />
      <InsuranceGroup prefix="officer" title="役員保険" lead="法人契約（解約返戻金は法人のもの）として計算します。" props={props} />

      {anyInsurance && (
        <section className="input-group">
          <h2>払済ケース</h2>
          <p className="help">保険料をこの年数だけ払い、その後は払込を止めたケースを、通常のケースと並べて比較します。</p>
          <Num id="paidUp1Years" label="払済ケース1: 払込年数" unit="年" props={props} />
          <Num id="paidUp2Years" label="払済ケース2: 払込年数" unit="年" props={props} />
        </section>
      )}

      <section className="input-group">
        <h2>役員報酬減額（任意）</h2>
        <Toggle id="payCutEnabled" label="役員報酬を減額する" props={props} />
        <p className="help">減額した分を保険に回す前提にはしていません。会社の支出が減り、その分利益が増えます。</p>
        {values.payCutEnabled && (
          <div className="fund-sub">
            <Num id="payCutOfficers" label="減額する役員の人数" unit="人" props={props} />
            <div className="row">
              <label htmlFor="fund-payCutMode">減額の入れ方</label>
              <select id="fund-payCutMode" value={values.payCutMode} onChange={(e) => onChange('payCutMode', e.target.value)} onBlur={() => onBlur('payCutMode')}>
                <option value="perOfficer">1人あたりの月額で入れる</option>
                <option value="total">年間の総額で入れる</option>
              </select>
            </div>
            {values.payCutMode === 'perOfficer' ? (
              <Num id="payCutMonthly" label="1人あたり月額減額" unit="円" props={props} />
            ) : (
              <Num id="payCutTotalMan" label="年間の総減額（全員分）" unit="万円" decimal help="1人あたりの月額は「総額 ÷ 12か月 ÷ 人数」として扱います。" props={props} />
            )}
            <p className="fund-sub-title">会社負担の社会保険料の減少も計算する（任意）</p>
            <Num
              id="payCutPayBefore"
              label="減額前の報酬月額（空欄なら計算しない）"
              unit="円"
              help="令和8年度の料率で、会社負担（個人負担と同額）の減少を計算します。"
              props={props}
            />
            {values.payCutPayBefore.trim() !== '' && (
              <>
                <Num id="payCutAge" label="年齢" unit="歳" props={props} />
                <div className="row">
                  <label htmlFor="fund-payCutPrefecture">都道府県</label>
                  <select
                    id="fund-payCutPrefecture"
                    value={values.payCutPrefecture}
                    onChange={(e) => onChange('payCutPrefecture', e.target.value)}
                    onBlur={() => onBlur('payCutPrefecture')}
                    {...invalid('payCutPrefecture', props)}
                  >
                    <option value="">選んでください</option>
                    {PREFECTURES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Messages id="payCutPrefecture" props={props} />
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </aside>
  )
}
