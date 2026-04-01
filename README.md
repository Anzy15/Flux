# Flux: Flashcard and Quiz Reviewer

Flux is an AI-powered smart study companion that automatically generates flashcards and interactive quizzes from your documents. Simply upload your study materials, and let Flux transform them into effective study tools to supercharge your learning experience!

## Features

- **Smart Document Processing**: Upload PDFs and seamlessly extract text content using robust, client-side PDF parsing.
- **AI-Generated Study Materials**: Automatically generate personalized, high-quality flashcards and multiple-choice quizzes directly from your reading material using Google's Gemini AI.
- **Interactive Study Modes**: Review flashcards with intuitive layouts and take practice quizzes to test your knowledge retention.
- **Secure Authentication**: Robust user sign-up, login, and secure sessions managed via Firebase Authentication.
- **Cloud Sync**: Automatically save your generated flashcards, topics, and progress to the cloud with Firebase Firestore.
- **Fast & Modern**: Built on Vite and React with smooth, responsive, and beautiful UI styling powered by Tailwind CSS.

## Technology Stack

- **Frontend Core**: React 19, Vite
- **Routing**: React Router DOM 
- **Styling**: Tailwind CSS
- **Backend Services**: Firebase (Authentication & Cloud Firestore)
- **AI Intelligence**: Google Generative AI (Gemini), Groq API
- **Parsers**: PDF.js (`pdfjs-dist`) for extracting document text

## Getting Started

### Prerequisites

Ensure you have the following installed to run Flux locally:
- [Node.js](https://nodejs.org/) (v16.x or newer recommended)
- API Keys for Google Gemini (from Google AI Studio) and a Firebase Project set up.

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/Flux.git
cd Flux 
```
2. Install Dependencies
Install the necessary npm packages required to boot the application:

npm install

3. Environment Variables Configuration
To run the application and tap into the AI/Database, you need to set up your environment variables. Create a .env file in the root directory based on the provided template:

cp .env.example .env

Open the newly created .env file and fill in your actual credentials:

# Firebase Config 
# Get these from: Firebase Console → Project Settings → Your Apps → Web App
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini API 
# Get this from: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your_gemini_api_key

4. Run the Development Server
Start the local development server:

npm run dev

Navigate to http://localhost:5173 in your browser to start studying with Flux!

Deployment:

Flux is configured for quick deployments on platforms like Vercel. To deploy, push your code to your GitHub repository and link it to Vercel. (Make sure not to remove the vercel.json included in the root, it handles necessary client-side routing properties!) Don't forget to include all the raw Environment Variables in the Vercel deployment settings under the "Environment Variables" tab.
