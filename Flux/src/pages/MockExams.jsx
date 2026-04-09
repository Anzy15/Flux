import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractTextFromPDF } from '../services/pdfParser';
import { extractExamQuestions } from '../services/groq';

export default function MockExams() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAdmin] = useState(
    currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL ||
    import.meta.env.VITE_ADMIN_EMAIL === undefined
  );

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 className="text-2xl font-bold text-surface-400">Unauthorized Access</h2>
      </div>
    );
  }

  const exams = [
    {
      id: 'csa_exam',
      title: 'CSA Exam',
      description: 'Reviewer questions based on the CSA Document.',
      icon: '🏛️'
    },
    {
      id: 'cad_exam',
      title: 'CAD Exam',
      description: 'Reviewer questions based on the CAD Document.',
      icon: '📐'
    }
  ];

  async function handleExtractPDF(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      setExtractStatus('Reading PDF...');
      const text = await extractTextFromPDF(file);

      const CHUNK_SIZE = 6000;
      let allQuestions = [];
      const totalChunks = Math.ceil(text.length / CHUNK_SIZE);

      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        setExtractStatus(`Extracting with AI (Chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${totalChunks})...`);
        const chunk = text.slice(i, i + CHUNK_SIZE);
        const questions = await extractExamQuestions(chunk);
        allQuestions = allQuestions.concat(questions);

        // Prevent Groq TPM (Tokens Per Minute) limit crash by waiting between chunks
        if (i + CHUNK_SIZE < text.length) {
          setExtractStatus(`Cooling down API (25s) to prevent Rate Limits...`);
          await new Promise(r => setTimeout(r, 25000));
        }
      }

      setExtractStatus(`Finalizing ${allQuestions.length} questions...`);
      const blob = new Blob([JSON.stringify(allQuestions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_exam.json');
      a.click();
      URL.revokeObjectURL(url);
      setExtractStatus('');
    } catch (err) {
      console.error(err);
      alert('Extraction failed: ' + err.message);
      setExtractStatus('');
    } finally {
      setIsExtracting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-6 slide-up-zoom">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Specialized Exams</h1>
          <p className="text-surface-400 max-w-2xl text-lg">
            These are pre-compiled rigorous multiple choice exams extracted from sensitive local documentation.
          </p>
        </div>

        {/* Admin Tool: Extract PDF locally */}
        <div className="relative group">
          <label className={`btn-secondary cursor-pointer ${isExtracting ? 'opacity-50 pointer-events-none' : ''}`}>
            {isExtracting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                {extractStatus}
              </span>
            ) : '+ Extract New PDF'}
            <input type="file" accept=".pdf" className="hidden" disabled={isExtracting} onChange={handleExtractPDF} />
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <div
            key={exam.id}
            className="panel group cursor-pointer hover:-translate-y-1 hover:border-primary/50 transition-all shadow-glass"
            onClick={() => navigate(`/admin-exams/${exam.id}`)}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center text-2xl group-hover:bg-primary/20 transition-colors">
                {exam.icon}
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{exam.title}</h3>
            </div>
            <p className="text-surface-400 mb-6 font-medium">
              {exam.description}
            </p>
            <button className="w-full btn-primary py-3 rounded-xl font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
              Take Exam
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
