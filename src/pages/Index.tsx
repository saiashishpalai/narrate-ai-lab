import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VoiceUpload } from "@/components/VoiceUpload";
import { TextUpload } from "@/components/TextUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { GenerateButton } from "@/components/GenerateButton";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

const Index = () => {
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string>("");
  const [storyText, setStoryText] = useState<string>("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Authentication effect
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session) {
        navigate('/auth');
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate('/auth');
    } catch (error: any) {
      toast.error("Error signing out: " + error.message);
    }
  };

  // Upload voice file to Supabase Storage and store public URL
  const handleVoiceFileSelect = async (file: File | null) => {
    setVoiceFile(file);
    setVoiceUrl("");
    setSessionId(null);

    if (!file || !user) return;

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

      // Store the file path with user_id for security
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert([
          {
            voice_path: filePath, // Store path, not full URL
            status: "uploaded",
            user_id: user.id,
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
    } catch (err) {
      toast.error("Failed to upload voice file");
      console.error("Upload exception:", err);
    }
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background flex items-center justify-center">
        <div className="text-foreground text-lg">Loading...</div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!voiceUrl || !storyText.trim()) {
      toast.error("Please upload a voice sample and provide story text");
      return;
    }

    if (!sessionId) {
      toast.error("No active session found");
      return;
    }

    setIsGenerating(true);

    try {
      // FIX 4: Update session status to processing
      await supabase
        .from("sessions")
        .update({
          status: "processing",
          story_text: storyText,
        })
        .eq("id", sessionId);

      // Use the public URL from Supabase Storage
      const response = await fetch(
        "https://saiashish.app.n8n.cloud/webhook-test/generate-audio",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceUrl, // this is the public URL from Supabase
            text: storyText,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate audio");

      const result = await response.json();
      const audioUrl = result.audioUrl || "";

      setGeneratedAudio(audioUrl);

      // FIX 5: Update session with generated audio and completion status
      await supabase
        .from("sessions")
        .update({
          generated_audio_path: audioUrl,
          status: "completed",
        })
        .eq("id", sessionId);

      toast.success("Audio generated successfully!");
    } catch (err) {
      // FIX 6: Update session status to failed on error
      if (sessionId) {
        await supabase
          .from("sessions")
          .update({ status: "failed" })
          .eq("id", sessionId);
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
        <header className="flex items-center justify-between mb-16 animate-fade-up pt-4">
          <div className="text-center flex-1">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary-glow to-secondary-glow bg-clip-text text-transparent mb-4 leading-[1.7] pb-2">
              Voice Cloning Studio
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Turn your storybooks into audio in your own voice.
            </p>
          </div>
          <div className="flex items-center space-x-4 absolute top-6 right-6">
            <div className="flex items-center text-muted-foreground text-sm">
              <User className="w-4 h-4 mr-2" />
              {user?.email}
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-accent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
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
