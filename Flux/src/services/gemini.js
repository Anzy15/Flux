import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

function cleanJSON(raw) {
  // Strip markdown code fences if Gemini wraps the response
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

/** Generate flashcards from extracted PDF text */
export async function generateFlashcards(pdfText, title, quantity = 20, isRetake = false) {
  const retakeInstruction = isRetake 
    ? `- IMPORTANT: The user is retaking this study set. Please generate a highly novel, different set of flashcards or heavily paraphrase existing ones if limited by text.`
    : '';

  const prompt = `
You are an expert study assistant. Based on the following document text, generate a comprehensive set of flashcards.

Rules:
- Create between 15 and 40 flashcards depending on the content density.
- CRITICAL ANTI-HALLUCINATION GUARDRAIL: Strictly use ONLY the information provided in the document text. Do not use outside knowledge. If the text does not contain enough info, return what you can based solely on the text.
- Ensure the flashcards follow a standard "Flashcard-esque" format. Keep the "front" very concise (single concepts, short questions, or terms) and the "back" succinct (short, direct answers).
- Prioritize key definitions, important facts, and core concepts.
- Do NOT include trivial or redundant cards.
${retakeInstruction}
- Return ONLY a valid JSON array. No extra text, no markdown fences.

Format:
[{"front": "...", "back": "..."}, ...]

Document title: ${title}

Document text:
${pdfText.slice(0, 150000)}
`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  const cards = JSON.parse(cleanJSON(raw))

  if (!Array.isArray(cards)) throw new Error('Gemini did not return an array')
  return cards
}

/** Generate a quiz from extracted PDF text */
export async function generateQuiz(pdfText, title, format = 'multiple-choice', quantity = 15, isRetake = false) {
  const formatInstruction = {
    'multiple-choice': `Each question must be multiple choice with exactly 4 options (A, B, C, D). Format: {"question":"...","options":["...","...","...","..."],"answer":"...","type":"multiple-choice"}`,
    'true-false': `Each question must be true/false. Format: {"question":"...","options":["True","False"],"answer":"True" or "False","type":"true-false"}. IMPORTANT: The correct answers MUST be a random, unpredictable mix of True and False. To achieve this, you MUST deliberately rewrite a random selection of true facts from the text into plausible false statements.`,
    'identification': `Each question must be an identification or fill-in-the-blank question. Format: {"question":"...","options":[],"answer":"...","type":"identification"}. CRITICAL: The "answer" MUST be a very short keyword or noun (1 to 3 words MAXIMUM). NEVER make the answer a full sentence or phrase. Use "______" in the question text.`,
    'mix': `Mix multiple choice, true/false, and identification questions evenly. Follow the respective formatting rules for each type.`,
  }[format]

  const retakeInstruction = isRetake 
    ? `- IMPORTANT: The user is retaking this quiz. Please generate a highly novel, different set of questions or heavily paraphrase existing ones if limited by text.`
    : '';

  const prompt = `
You are an expert quiz creator. Based on the following document text, generate a rigorous quiz.

Rules:
- Create between 10 and 25 questions depending on the content.
- CRITICAL ANTI-HALLUCINATION GUARDRAIL: Strictly use ONLY the information provided in the document text. Do not hallucinate or include outside knowledge. Every correct answer must be supported by the text.
- Questions should test understanding, not just memorization.
- ${formatInstruction}
- The "answer" field must exactly match one of the options.
${retakeInstruction}
- Return ONLY a valid JSON array. No extra text, no markdown fences.

Document title: ${title}

Document text:
${pdfText.slice(0, 150000)}
`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  const questions = JSON.parse(cleanJSON(raw))

  if (!Array.isArray(questions)) throw new Error('Gemini did not return an array')
  return questions
}
