import * as pdfjsLib from 'pdfjs-dist'

// Use the unpkg CDN for the worker to prevent Vite from double-minifying it in production
// which often causes "n.toHex is not a function" when parsing complex PDFs.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

/**
 * Extracts all text from a PDF File object.
 * @param {File} file - The PDF file from an <input> or drag-drop event
 * @returns {Promise<string>} Concatenated text content
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  
  // Provide CMaps and standard fonts to handle complex PDFs that don't embed all fonts
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
  }).promise
  const pageTexts   = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text    = content.items.map(item => item.str).join(' ')
    pageTexts.push(text)
  }

  return pageTexts.join('\n\n')
}
