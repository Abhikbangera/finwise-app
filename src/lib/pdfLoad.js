import { parseStatement } from './pdfStatement'
import { readPdfPages } from './pdfRead'

// Loaded on demand so the PDF library is only downloaded when someone imports a PDF.
// The "legacy" build of pdf.js runs on older browsers (for example older Safari) too.
export async function readStatement(bytes, password) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
  return parseStatement(await readPdfPages(pdfjs, bytes, password))
}