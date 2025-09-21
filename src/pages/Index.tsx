import { useState } from "react";
import { VoiceUpload } from "@/components/VoiceUpload";
import { TextUpload } from "@/components/TextUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { GenerateButton } from "@/components/GenerateButton";
import { toast } from "sonner";

const Index = () => {
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [storyText, setStoryText] = useState<string>("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!voiceFile || !storyText.trim()) {
      toast.error("Please upload a voice sample and provide story text");
      return;
    }

    setIsGenerating(true);

    // Simulate AI processing time
    setTimeout(() => {
      // Mock generated audio URL - in real app this would come from your AI service
      const mockAudioUrl =
        "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav";
      setGeneratedAudio(mockAudioUrl);
      setIsGenerating(false);
      toast.success("Audio generated successfully!");
    }, 3000);
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
            <VoiceUpload onFileSelect={setVoiceFile} selectedFile={voiceFile} />
            <TextUpload onTextChange={setStoryText} text={storyText} />
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
