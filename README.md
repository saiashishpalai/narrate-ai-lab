Voice Cloning Studio – MVP
Turn your storybooks into audio in your own voice.
A modern AI-powered web app for personalized story narration!

Voice Cloning Studio lets users upload a sample of their voice and instantly convert story text (or a PDF!) to audio that sounds just like them.
Built as a full-stack MVP, it integrates a React (Lovable) frontend, n8n as the backend orchestrator, Supabase for file and database storage, 11Labs for neural TTS, and third-party PDF extraction.

🚀 Overview
Voice Cloning Studio lets users upload a sample of their voice and instantly convert story text (or a PDF!) to audio that sounds just like them.

Built as a full-stack MVP, it integrates a React (Lovable) frontend, n8n as the backend orchestrator, Supabase for file and database storage, 11Labs for neural TTS, and third-party PDF extraction.

✨ Features
Voice Upload: Users can submit a short audio sample to clone their unique voiceprint.
Story as Audio: Type or upload story text (or PDF!)—get audio generated in the cloned voice.
PDF to Audio: Seamlessly extract story content from PDFs and process it end-to-end.
Instant Feedback: Simple UI with clear feedback after every step (upload, generation, error).
Secure & Scalable: Uses Supabase cloud storage and structured DB; workflow automation for cost-efficient scaling.

🛠️ Tech Stack
Frontend: React (Lovable)
Backend Automation: n8n (workflow orchestrator)
Voice/Audio Storage: Supabase (storage + DB)
Text-to-Speech: 11Labs API
PDF Extraction: PDF.co/Nanonets (or custom)
Authentication: Supabase Auth (can integrate with OAuth)

⚙️ Architecture
User uploads a voice sample & enters or uploads story text/PDF via the Lovable UI.
Frontend sends files/text to n8n via a secured Webhook or API endpoint.
n8n workflow:
- Uploads files to Supabase.
- Extracts text from PDFs (if needed).
- Calls 11Labs API with text + voice reference.
- Stores generated audio in Supabase storage.
- Records transaction metadata in Supabase DB.
- Frontend gets real-time feedback, allowing the user to listen or download the audio.

🎯 Usage
Go to the app and upload your sample voice (MP3/WAV/M4A).
Paste or upload your story (text or PDF).
Click Generate Audio.
Listen to or download your narrated story!

🛡️ License
Built by Sai Ashish Palai. Powered by n8n, Supabase, and 11Labs.