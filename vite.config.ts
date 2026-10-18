/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// `npm run dev:local` talks to the local Supabase stack through the dev server,
// so the browser only ever sees one origin.
const LOCAL_SUPABASE = 'http://127.0.0.1:55321'
const localProxy = Object.fromEntries(
  ['/rest/v1', '/auth/v1', '/storage/v1', '/functions/v1', '/realtime/v1'].map(p => [
    p,
    { target: LOCAL_SUPABASE, changeOrigin: true, ws: p === '/realtime/v1' },
  ]),
)

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: mode === 'localdb' ? { proxy: localProxy } : undefined,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:55321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
}))
