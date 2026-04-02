const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.VITE_GROQ_API_KEY;
if (!apiKey) {
    console.error("VITE_GROQ_API_KEY not found in .env");
    process.exit(1);
}

const groq = new Groq({ apiKey });

function cleanJSON(raw) {
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function extractQuestionsChunk(textChunk) {
    const prompt = `
You are an expert exam extractor. You are provided with text extracted from a PDF that contains a list of questions and answers. 
Your task is to aggressively extract ALL questions along with their corresponding answers from this text chunk.

Rules:
- If a question is multiple choice, extract the options.
- If the correct answer is not explicitly highlighted or obvious, choose the best possible answer based on the context of the question.
- Format your response strictly as a JSON object with a single key "questions" containing an array of objects.
- Each object should be formatted as:
  {"question": "...", "options": ["...", "...", "...", "..."], "answer": "...", "type": "multiple-choice"}
- If there are no options provided in the text and it's a fill-in-the-blank or direct Q&A, format it as:
  {"question": "...", "options": [], "answer": "...", "type": "identification"}
- Do NOT hallucinate questions. Only extract what is in the text.

Text:
${textChunk}
`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            temperature: 0.1
        });
        const raw = completion.choices[0]?.message?.content || '{"questions":[]}';
        const parsed = JSON.parse(cleanJSON(raw));
        return parsed.questions || parsed || [];
    } catch (e) {
        console.error("Failed to parse chunk:", e);
        return [];
    }
}

async function processPdf(pdfPath, outputPath) {
    console.log(`Processing ${pdfPath}...`);
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    // Split text into chunks to avoid the 8192 output token limit.
    // We use a small chunk size to ensure reliable extraction.
    const CHUNK_SIZE = 6000;
    const text = data.text;
    
    let allQuestions = [];
    
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        const chunk = text.slice(i, i + CHUNK_SIZE);
        console.log(`Extracting chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(text.length / CHUNK_SIZE)}...`);
        const questions = await extractQuestionsChunk(chunk);
        allQuestions = allQuestions.concat(questions);
    }
    
    const dataDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));
    console.log(`Saved ${allQuestions.length} questions to ${outputPath}!`);
}

async function main() {
    const pdfsDir = path.join(__dirname, '..', 'PDFs');
    const csaPath = path.join(pdfsDir, 'CSA-Question-5.pdf');
    const cadPath = path.join(pdfsDir, 'CAD_Reviewer_Biancy-2.pdf');
    
    const csaOutPath = path.join(__dirname, '..', 'src', 'data', 'csa_exam.json');
    const cadOutPath = path.join(__dirname, '..', 'src', 'data', 'cad_exam.json');
    
    if (fs.existsSync(csaPath)) {
        await processPdf(csaPath, csaOutPath);
    } else {
        console.error("CSA PDF not found:", csaPath);
    }
    
    if (fs.existsSync(cadPath)) {
        await processPdf(cadPath, cadOutPath);
    } else {
        console.error("CAD PDF not found:", cadPath);
    }
}

main().catch(console.error);
