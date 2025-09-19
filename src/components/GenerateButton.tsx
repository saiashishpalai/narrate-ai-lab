import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export const GenerateButton = ({ onClick, isGenerating, disabled }: GenerateButtonProps) => {
  return (
    <div className="relative">
      <Button
        onClick={onClick}
        disabled={disabled || isGenerating}
        size="lg"
        className={`
          px-12 py-6 text-lg font-semibold rounded-2xl
          bg-gradient-to-r from-primary to-secondary
          hover:from-primary-glow hover:to-secondary-glow
          transition-all duration-300
          ${isGenerating ? "animate-pulse-glow" : ""}
          ${!disabled && !isGenerating ? "hover:scale-105 hover:shadow-2xl" : ""}
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            Generating Audio...
          </>
        ) : (
          <>
            <Wand2 className="w-6 h-6 mr-3" />
            Generate Audio
          </>
        )}
      </Button>
      
      {isGenerating && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
            <span className="ml-2">Processing with AI...</span>
          </div>
        </div>
      )}
      
      {disabled && !isGenerating && (
        <p className="mt-3 text-sm text-muted-foreground">
          Upload voice sample and add story text to generate
        </p>
      )}
    </div>
  );
};