import * as pdfjsLib from 'pdfjs-dist'

// Use the local worker bundled with pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * Extracts all text from a PDF File object.
 * @param {File} file - The PDF file from an <input> or drag-drop event
 * @returns {Promise<string>} Concatenated text content
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageTexts   = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text    = content.items.map(item => item.str).join(' ')
    pageTexts.push(text)
  }

  return pageTexts.join('\n\n')
}
