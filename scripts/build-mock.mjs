// 確認用モック（mock/）を作る: npm run mock
// 実際の画面の部品をデモ用の仮データで HTML にし、スタイルとロゴを写す。サーバーなしで mock/index.html を開ける
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { mockPage } = await server.ssrLoadModule('/scripts/mock-page.tsx')
  mkdirSync('mock/images', { recursive: true })
  writeFileSync('mock/index.html', mockPage())
  copyFileSync('src/styles.css', 'mock/style.css')
  copyFileSync('public/images/fantree-marketing-logo-white.png', 'mock/images/fantree-marketing-logo-white.png')
  console.log('mock/index.html を作りました')
} finally {
  await server.close()
}
