import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

function cleanJSON(raw) {
  // Strip markdown code fences if Gemini wraps the response
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

/** Generate flashcards from extracted PDF text */
export async function generateFlashcards(pdfText, title) {
  const prompt = `
You are an expert study assistant. Based on the following document text, generate a comprehensive set of flashcards.

Rules:
- Create between 15 and 40 flashcards depending on the content density.
- Each card has a "front" (concise term, concept, or question) and a "back" (clear, accurate explanation or answer).
- Prioritize key definitions, important facts, and core concepts.
- Do NOT include trivial or redundant cards.
- Return ONLY a valid JSON array. No extra text, no markdown fences.

Format:
[{"front": "...", "back": "..."}, ...]

Document title: ${title}

Document text:
${pdfText.slice(0, 25000)}
`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  const cards = JSON.parse(cleanJSON(raw))

  if (!Array.isArray(cards)) throw new Error('Gemini did not return an array')
  return cards
}

/** Generate a quiz from extracted PDF text */
export async function generateQuiz(pdfText, title, format = 'multiple-choice') {
  const formatInstruction = {
    'multiple-choice': `Each question must be multiple choice with exactly 4 options (A, B, C, D). Format: {"question":"...","options":["...","...","...","..."],"answer":"...","type":"multiple-choice"}`,
    'true-false': `Each question must be true/false. Format: {"question":"...","options":["True","False"],"answer":"True or False","type":"true-false"}`,
    'mix': `Mix multiple choice (4 options) and true/false questions roughly 60/40. Use the same format but vary the "type" field between "multiple-choice" and "true-false".`,
  }[format]

  const prompt = `
You are an expert quiz creator. Based on the following document text, generate a rigorous quiz.

Rules:
- Create between 10 and 25 questions depending on the content.
- Questions should test understanding, not just memorization.
- ${formatInstruction}
- The "answer" field must exactly match one of the options.
- Return ONLY a valid JSON array. No extra text, no markdown fences.

Document title: ${title}

Document text:
${pdfText.slice(0, 25000)}
`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  const questions = JSON.parse(cleanJSON(raw))

  if (!Array.isArray(questions)) throw new Error('Gemini did not return an array')
  return questions
}
