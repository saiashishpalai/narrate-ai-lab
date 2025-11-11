import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse-fork";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 8787);
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY ?? process.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID ?? "eleven_monolingual_v1";
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://qdtgolqqrvtqfknrgqye.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;
const GENERATED_AUDIO_BUCKET =
  process.env.SUPABASE_GENERATED_AUDIO_BUCKET ?? "generated-audio";

if (!ELEVENLABS_API_KEY) {
  throw new Error(
    "Missing ELEVENLABS_API_KEY environment variable. Set it in your .env file."
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Set it in your .env file."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.post("/api/generate-audio", async (req, res) => {
  const { voiceUrl, text, pdfUrl, sessionId } = req.body ?? {};

  if (!voiceUrl) {
    return res.status(400).json({
      error: "voiceUrl is required",
    });
  }

  const numericSessionId =
    typeof sessionId === "number"
      ? sessionId
      : typeof sessionId === "string"
      ? parseInt(sessionId, 10)
      : null;

  let storyText: string =
    typeof text === "string" ? text.trim() : "";

  try {
    if (!storyText && pdfUrl) {
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(
          `Failed to fetch PDF file. Status: ${pdfResponse.status}`
        );
      }
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      const parsed = await pdfParse(pdfBuffer);
      storyText = parsed.text?.trim() ?? "";
    }

    if (!storyText) {
      return res.status(400).json({
        error: "No story text provided. Please type text or upload a PDF with extractable content.",
      });
    }

    if (numericSessionId) {
      await supabase
        .from("sessions")
        .update({ status: "processing" })
        .eq("id", numericSessionId);
    }

    const voiceResponse = await fetch(voiceUrl);
    if (!voiceResponse.ok) {
      throw new Error(
        `Failed to fetch voice sample. Status: ${voiceResponse.status}`
      );
    }
    const voiceArrayBuffer = await voiceResponse.arrayBuffer();
    const voiceBuffer = Buffer.from(voiceArrayBuffer);

    const voiceForm = new FormData();
    const voiceFilename =
      (() => {
        try {
          const url = new URL(voiceUrl);
          return url.pathname.split("/").pop() ?? "voice-sample.webm";
        } catch {
          return "voice-sample.webm";
        }
      })() || "voice-sample.webm";

    voiceForm.append("name", `session-${numericSessionId ?? Date.now()}`);
    voiceForm.append("files", voiceBuffer, {
      filename: voiceFilename,
      contentType:
        voiceResponse.headers.get("content-type") ?? "audio/mpeg",
    });

    const voiceCloneResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          ...voiceForm.getHeaders(),
        },
        body: voiceForm as unknown as any,
      }
    );

    if (!voiceCloneResponse.ok) {
      const errorText = await voiceCloneResponse.text();
      throw new Error(
        `ElevenLabs voice clone failed (${voiceCloneResponse.status}): ${errorText}`
      );
    }

    const voiceCloneData = (await voiceCloneResponse.json()) as {
      voice_id?: string;
    };

    const voiceId = voiceCloneData.voice_id;
    if (!voiceId) {
      throw new Error("ElevenLabs did not return a voice_id");
    }

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          accept: "audio/mpeg",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: storyText,
          model_id: ELEVENLABS_MODEL_ID,
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      throw new Error(
        `ElevenLabs TTS failed (${ttsResponse.status}): ${errorText}`
      );
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    const audioPath = `session-${numericSessionId ?? Date.now()}-${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from(GENERATED_AUDIO_BUCKET)
      .upload(audioPath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio to Supabase: ${uploadError.message}`);
    }

    const {
      data: { publicUrl: audioPublicUrl },
    } = supabase.storage
      .from(GENERATED_AUDIO_BUCKET)
      .getPublicUrl(audioPath);

    if (numericSessionId) {
      await supabase
        .from("sessions")
        .update({
          generated_audio_path: audioPublicUrl,
          status: "completed",
          story_text: storyText,
          pdf_path: pdfUrl ?? null,
        })
        .eq("id", numericSessionId);
    }

    // Clean up the temporary voice asynchronously
    fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    }).catch((deleteError) => {
      console.error("Failed to delete ElevenLabs voice:", deleteError);
    });

    return res.json({
      audioUrl: audioPublicUrl,
      voiceId,
    });
  } catch (error) {
    console.error("Generate audio error:", error);

    if (numericSessionId) {
      await supabase
        .from("sessions")
        .update({ status: "failed" })
        .eq("id", numericSessionId);
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate audio",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Voice generation server running on http://localhost:${PORT}`);
});

