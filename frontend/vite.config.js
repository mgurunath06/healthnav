import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const testAuth = mode === 'test-auth'

  return {
    plugins: [tailwindcss(), react()],
    resolve: testAuth
      ? {
          alias: {
            '@clerk/clerk-react': path.resolve(__dirname, 'src/testing/clerkMock.jsx'),
          },
        }
      : undefined,
    server: {
      port: 5173,
      allowedHosts: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/testing/setupTests.js',
      globals: true,
      css: true,
      include: ['src/**/*.test.{js,jsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
  }
})
