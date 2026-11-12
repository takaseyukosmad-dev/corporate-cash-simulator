// 印刷用の5ページを、ブラウザの中で1ページずつ画像にして A4横の PDF にする（決定C33）。
// iPad・携帯では印刷画面から PDF にできないことがあるため。入力内容・PDF は外部に送らない。
// PDF を作る部品は大きいので、ボタンを押したときに読み込む

const A4_W = 297 // mm
const A4_H = 210

const pad = (n: number) => String(n).padStart(2, '0')

// 保存するファイルの名前。法人名があれば先頭に付ける（ファイル名に使えない記号は除く）
export function pdfFileName(companyName: string, date: Date): string {
  const name = companyName.trim().replace(/[\\/:*?"<>|]/g, '')
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  return `${name ? `${name}様_` : ''}キャッシュ増加のご提案_${ymd}.pdf`
}

// 印刷用のページ（.print-page）を画像にして PDF を作る
export async function makePdf(fileName: string): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
  document.documentElement.classList.add('pdf-capture')
  try {
    // フォントと画像（ロゴ）を読み終えてから写す
    await document.fonts?.ready
    const pages = [...document.querySelectorAll<HTMLElement>('.print-report .print-page')]
    if (pages.length === 0) throw new Error('印刷用のページがありません')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
    for (const [i, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: '#ffffff',
        // 画面の幅（スマホのときの表示の切り替え）に左右されないよう、パソコンの幅で写す
        windowWidth: 1400,
        windowHeight: 1000,
        logging: false,
      })
      if (i > 0) pdf.addPage('a4', 'landscape')
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, A4_H)
    }
    return new File([pdf.output('blob')], fileName, { type: 'application/pdf' })
  } finally {
    document.documentElement.classList.remove('pdf-capture')
  }
}

// 作った PDF を保存する。iPad・携帯は共有の画面（「ファイルに保存」など）、それ以外はダウンロード
export async function savePdf(file: File): Promise<void> {
  const touch = navigator.maxTouchPoints > 0
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // 共有の画面を閉じただけ
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
