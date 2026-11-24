// Reads text pieces from a PDF with pdf.js (passed in, so it works in the browser and in tests).
// The password is used only here, in memory. It is never stored or sent anywhere.
export async function readPdfPages(pdfjs, bytes, password) {
  const task = pdfjs.getDocument({ data: bytes.slice(), password: password || undefined })
  try {
    const pdf = await task.promise
    if (pdf.numPages > 60) throw new Error('That PDF has more than 60 pages. Download a shorter date range.')
    const pages = []
    for (let n = 1; n <= pdf.numPages; n++) {
      const tc = await (await pdf.getPage(n)).getTextContent()
      pages.push(tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })))
    }
    return pages
  } finally { await task.destroy() }
}
