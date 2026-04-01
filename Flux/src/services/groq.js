import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || 'dummy_key_to_prevent_crash_before_env_is_set',
  dangerouslyAllowBrowser: true
})

const MODEL = 'llama-3.3-70b-versatile'

function cleanJSON(raw) {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

/** Generate flashcards from extracted PDF text */
export async function generateFlashcards(pdfText, title, quantity = 20) {
  const prompt = `
You are an expert study assistant. Based on the following document text, generate a comprehensive set of flashcards.

Rules:
- Generate EXACTLY ${quantity} flashcards. Do not stop early unless the document is too short. You must fulfill the requested quantity of ${quantity}.
- CRITICAL INSTRUCTION: If the document text already consists of questions and answers (e.g. a reviewer, exam, or Q&A sheet), extract those exact questions and answers directly into the flashcards.
- Each card has a "front" (concise term, concept, or question) and a "back" (clear, accurate explanation or answer).
- Prioritize key definitions, important facts, and core concepts.
- Do NOT include trivial or redundant cards.
- You MUST return a JSON object with a single key "flashcards" containing the array of cards.

Format:
{"flashcards": [{"front": "...", "back": "..."}, ...]}

Document title: ${title}

Document text:
${pdfText.slice(0, 20000)}
`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    response_format: { type: 'json_object' },
  })
  
  const raw = completion.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(cleanJSON(raw))
  const cards = parsed.flashcards || parsed

  if (!Array.isArray(cards)) throw new Error('Groq did not return an array of flashcards')
  return cards
}

/** Generate a quiz from extracted PDF text */
export async function generateQuiz(pdfText, title, format = 'multiple-choice', quantity = 15) {
  const formatInstruction = {
    'multiple-choice': `Each question must be multiple choice with exactly 4 options (A, B, C, D). Format: {"question":"...","options":["...","...","...","..."],"answer":"...","type":"multiple-choice"}`,
    'true-false': `Each question must be true/false. Format: {"question":"...","options":["True","False"],"answer":"True or False","type":"true-false"}`,
    'mix': `Mix multiple choice (4 options) and true/false questions roughly 60/40. Use the same format but vary the "type" field between "multiple-choice" and "true-false".`,
  }[format]

  const prompt = `
You are an expert quiz creator. Based on the following document text, generate a rigorous quiz.

Rules:
- Generate EXACTLY ${quantity} questions. Do not stop early unless the document is literally too short to support it. You must strive to reach exactly ${quantity} questions.
- CRITICAL INSTRUCTION: If the document already contains questions and answers, extract them directly! If they are missing options and you need multiple-choice, generate the 3 plausible wrong options yourself while using the document's original highlighted or correct answer.
- Questions should test understanding, not just memorization.
- ${formatInstruction}
- The "answer" field must exactly match one of the options.
- You MUST return a JSON object with a single key "questions" containing the array of questions.

Format:
{"questions": [{"question": "...", "options": [...], "answer": "...", "type": "..."}, ...]}

Document title: ${title}

Document text:
${pdfText.slice(0, 20000)}
`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(cleanJSON(raw))
  const questions = parsed.questions || parsed

  if (!Array.isArray(questions)) throw new Error('Groq did not return an array of questions')
  return questions
}
