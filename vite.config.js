import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// pdfjs-dist is loaded on demand for PDF statements. Listing it here makes the dev server
// prepare it at startup, so it is not rebuilt mid-session (which breaks the dynamic import).
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ['pdfjs-dist/legacy/build/pdf.mjs'] },
})