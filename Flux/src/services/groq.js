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
export async function generateFlashcards(pdfText, title, quantity = 20, isRetake = false) {
  const retakeInstruction = isRetake 
    ? `- IMPORTANT: The user is retaking this study set. Please generate a highly novel, different set of flashcards or heavily paraphrase existing ones if limited by text.`
    : '';

  const prompt = `
You are an expert study assistant. Based on the following document text, generate a comprehensive set of flashcards.

Rules:
- Generate EXACTLY ${quantity} flashcards. Do not stop early unless the document is too short. You must fulfill the requested quantity of ${quantity}.
- CRITICAL INSTRUCTION: If the document text already consists of questions and answers (e.g. a reviewer, exam, or Q&A sheet), extract those exact questions and answers directly into the flashcards.
- CRITICAL ANTI-HALLUCINATION GUARDRAIL: Strictly use ONLY the information provided in the document text. Do not use outside knowledge. If the text does not contain enough info, return what you can based solely on the text.
- Ensure the flashcards follow a standard "Flashcard-esque" format. Keep the "front" very concise (single concepts, short questions, or terms) and the "back" succinct (short, direct answers).
- Prioritize key definitions, important facts, and core concepts.
- Do NOT include trivial or redundant cards.
${retakeInstruction}
- You MUST return a JSON object with a single key "flashcards" containing the array of cards.

Format:
{"flashcards": [{"front": "...", "back": "..."}, ...]}

Document title: ${title}

Document text:
${pdfText.slice(0, 150000)}
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
- Generate EXACTLY ${quantity} questions. Do not stop early unless the document is literally too short to support it. You must strive to reach exactly ${quantity} questions.
- CRITICAL INSTRUCTION: If the document already contains questions and answers, extract them directly! If they are missing options and you need multiple-choice, generate the 3 plausible wrong options yourself while using the document's original highlighted or correct answer.
- CRITICAL ANTI-HALLUCINATION GUARDRAIL: Strictly use ONLY the information provided in the document text. Do not hallucinate or include outside knowledge. Every correct answer must be supported by the text.
- Questions should test understanding, not just memorization.
- ${formatInstruction}
- The "answer" field must exactly match one of the options.
${retakeInstruction}
- You MUST return a JSON object with a single key "questions" containing the array of questions.

Format:
{"questions": [{"question": "...", "options": [...], "answer": "...", "type": "..."}, ...]}

Document title: ${title}

Document text:
${pdfText.slice(0, 150000)}
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

export async function extractExamQuestions(textChunk) {
  const prompt = `
You are an expert exam extractor. You are provided with text extracted from a PDF that contains a list of questions and answers. 
Your task is to aggressively extract ALL questions along with their corresponding answers from this text chunk.

Rules:
- If a question is multiple choice, extract the options.
- If the correct answer is not explicitly highlighted or obvious, choose the best possible answer based on the context of the question.
- Format your response strictly as a JSON object with a single key "questions" containing an array of objects.
- Each object should be formatted exactly as:
  {"question": "...", "options": ["...", "...", "...", "..."], "answer": "...", "type": "multiple-choice"}
- If there are no options provided in the text and it's a fill-in-the-blank or direct Q&A, format it as:
  {"question": "...", "options": [], "answer": "...", "type": "identification"}
- Do NOT hallucinate questions. Only extract what is explicitly in the text.

Text:
${textChunk}
`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.1-8b-instant', // Switch to 8B model to bypass 100k TPD limit on 70B
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  const raw = completion.choices[0]?.message?.content || '{"questions":[]}';
  const parsed = JSON.parse(cleanJSON(raw));
  return parsed.questions || [];
}
