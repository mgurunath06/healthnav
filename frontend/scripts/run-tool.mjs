import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const [tool, ...args] = process.argv.slice(2)

if (!tool) {
  console.error('Usage: node scripts/run-tool.mjs <tool> [...args]')
  process.exit(1)
}

const env = { ...process.env }

if (process.platform === 'win32') {
  try {
    require.resolve('@tailwindcss/oxide-wasm32-wasi')
  } catch {
    const install = spawnSync(
      'npm',
      ['install', '--no-save', '--force', '@tailwindcss/oxide-wasm32-wasi@4.3.0'],
      { stdio: 'inherit', shell: true },
    )
    if (install.status !== 0) process.exit(install.status ?? 1)
  }
  env.NAPI_RS_FORCE_WASI = '1'
}

const result = spawnSync(
  'npx',
  ['--no-install', tool, ...args],
  {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
)

process.exit(result.status ?? 1)
