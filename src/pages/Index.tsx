import { useState } from "react";
import { VoiceUpload } from "@/components/VoiceUpload";
import { TextUpload } from "@/components/TextUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { GenerateButton } from "@/components/GenerateButton";
import { toast } from "sonner";
import supabase from "@/lib/SupabaseClient";

const Index = () => {
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string>("");
  const [storyText, setStoryText] = useState<string>("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // Feature flag for new flow - set to true to test new architecture
  const USE_NEW_FLOW = false; //IMPORTANT: Set to true to test new architecture

  // Upload voice file to Supabase Storage and store public URL
  const handleVoiceFileSelect = async (file: File | null) => {
    setVoiceFile(file);
    setVoiceUrl("");
    setSessionId(null);

    if (!file) return;

    try {
      // FIX 1: Remove the "voices/" prefix to avoid double "voices/voices/" path
      const filePath = `${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from("voice-samples")
        .upload(filePath, file);

      if (error) {
        toast.error("Failed to upload voice file");
        console.error("Upload error:", error);
        return;
      }

      // FIX 2: Use the correct destructuring syntax for getPublicUrl
      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-samples").getPublicUrl(filePath);

      setVoiceUrl(publicUrl);

      // NEW FLOW: Don't create session until user clicks Generate
      if (!USE_NEW_FLOW) {
        // OLD FLOW: Create session immediately on voice upload
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert([
            {
              voice_path: filePath, // Store path, not full URL
              status: "uploaded",
            },
          ])
          .select("id")
          .single();

        if (sessionError) {
          toast.error("Failed to create session");
          console.error("Session error:", sessionError);
        } else if (sessionData && sessionData.id) {
          setSessionId(
            typeof sessionData.id === "string"
              ? parseInt(sessionData.id, 10)
              : sessionData.id
          );
          toast.success("Voice file uploaded successfully!");
        }
      } else {
        // NEW FLOW: Just store file path, no session creation yet
        setVoiceFile(file);
        toast.success("Voice file uploaded successfully! Now add your text and click Generate.");
      }
    } catch (err) {
      toast.error("Failed to upload voice file");
      console.error("Upload exception:", err);
    }
  };

  const handleGenerate = async () => {
    if (!voiceUrl || !storyText.trim()) {
      toast.error("Please upload a voice sample and provide story text");
      return;
    }

    if (!USE_NEW_FLOW && !sessionId) {
      toast.error("No active session found");
      return;
    }

    setIsGenerating(true);
    let currentSessionId = sessionId;
    try {

      if (USE_NEW_FLOW) {
        // NEW FLOW: Create session only when generating
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert([
            {
              voice_path: voiceFile?.name ? `${Date.now()}-${voiceFile.name}` : null,
              story_text: storyText,
              status: "processing",
            },
          ])
          .select("id")
          .single();

        if (sessionError) {
          toast.error("Failed to create session");
          console.error("Session creation error:", sessionError);
          return;
        }

        currentSessionId = sessionData.id;
        setSessionId(currentSessionId);
      } else {
        // OLD FLOW: Update existing session status to processing
        await supabase
          .from("sessions")
          .update({
            status: "processing",
            story_text: storyText,
          })
          .eq("id", sessionId);
      }

      // Use the public URL from Supabase Storage
      const n8nWebhookUrl =
        import.meta.env.VITE_N8N_WEBHOOK_URL ||
        "http://localhost:5678/webhook-test/generate-audio";

      const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceUrl, // this is the public URL from Supabase
            text: storyText,
            sessionId: currentSessionId, // Include sessionId for both flows
          }),
        });

      if (!response.ok) throw new Error("Failed to generate audio");

      const result = await response.json();
      const audioUrl = result.audioUrl || "";

      setGeneratedAudio(audioUrl);

      // Update session with generated audio and completion status
      await supabase
        .from("sessions")
        .update({
          generated_audio_path: audioUrl,
          status: "completed",
        })
        .eq("id", currentSessionId);

      toast.success("Audio generated successfully!");
    } catch (err) {
      // Update session status to failed on error
      if (currentSessionId) {
        await supabase
          .from("sessions")
          .update({ status: "failed" })
          .eq("id", currentSessionId);
      }

      toast.error("Failed to generate audio");
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-up pt-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary-glow to-secondary-glow bg-clip-text text-transparent mb-4 leading-[1.7] pb-2">
            Voice Cloning Studio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Turn your storybooks into audio in your own voice.
          </p>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <div className="grid md:grid-cols-2 gap-8">
            <VoiceUpload
              onFileSelect={handleVoiceFileSelect}
              selectedFile={voiceFile}
              onSessionCreated={setSessionId}
            />
            <TextUpload
              onTextChange={setStoryText}
              text={storyText}
              sessionId={sessionId}
            />
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <GenerateButton
              onClick={handleGenerate}
              isGenerating={isGenerating}
              disabled={!voiceFile || !storyText.trim()}
            />
          </div>

          {/* Audio Player */}
          {generatedAudio && (
            <div className="animate-fade-up">
              <AudioPlayer audioUrl={generatedAudio} />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-20 text-muted-foreground">
          <p className="text-sm">
            Built using modern AI tech stacks — A Portfolio MVP by Sai Ashish
            Palai
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
