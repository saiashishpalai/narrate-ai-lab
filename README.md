Voice Cloning Studio – MVP
Turn your storybooks into audio in your own voice.
A modern AI-powered web app for personalized story narration!

Voice Cloning Studio lets users upload a sample of their voice and instantly convert story text (or a PDF!) to audio that sounds just like them.
The current stack is a React (Lovable) frontend paired with a lightweight Express backend for ElevenLabs orchestration, Supabase for file/database storage, ElevenLabs for neural TTS, and optional third-party PDF extraction.

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
Backend API: Express + Supabase + ElevenLabs SDKs
Voice/Audio Storage: Supabase (storage + DB)
Text-to-Speech: 11Labs API
PDF Extraction: PDF.co/Nanonets (or custom)
Authentication: Supabase Auth (can integrate with OAuth)

⚙️ Architecture
User uploads a voice sample & enters or uploads story text/PDF via the Lovable UI.
Frontend stores the input files/text in Supabase and calls the Express backend (`/api/generate-audio`).
Backend pipeline:
- Downloads the uploaded voice sample from Supabase Storage.
- Creates a temporary cloned voice in ElevenLabs for the uploaded sample.
- Runs text-to-speech for the user’s story text with that cloned voice.
- Stores the generated audio in Supabase Storage and updates the corresponding Supabase session record.
- Cleans up the temporary ElevenLabs voice.
Frontend receives the generated audio URL and instantly plays it.

🧩 Environment Variables
Create a `.env` file in the project root with:

```
ELEVENLABS_API_KEY=your_elevenlabs_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_GENERATED_AUDIO_BUCKET=generated-audio # optional override
SERVER_PORT=8787                              # optional override

# Frontend-facing variables
VITE_API_BASE_URL=http://localhost:8787       # Express backend URL
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key # if you convert Supabase client to use envs
```

🧪 Local Development

```
npm install
npm run server:dev     # starts Express backend on http://localhost:8787
npm run dev            # starts Vite frontend on http://localhost:5173 (or next free port)
# or run both at once:
npm run dev:full
```

Ensure Supabase Storage has buckets named `voice-samples`, `pdf-samples`, and `generated-audio` with appropriate policies:
- Anonymous insert/select/update on `sessions`.
- Service role (backend) has unrestricted access via `SUPABASE_SERVICE_ROLE_KEY`.
- Storage bucket policies allow the backend upload and public read of generated audio.

🎯 Usage
Go to the app and upload your sample voice (MP3/WAV/M4A).
Paste or upload your story (text or PDF).
Click Generate Audio.
Listen to or download your narrated story!

🛡️ License
Built by Sai Ashish Palai. Powered by n8n, Supabase, and 11Labs.