import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Heart, BookOpen, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Daily Alignments",
    description: "Let's create your first alignment together! This quick tutorial will show you how to set a daily intention and emotion that connects to your personal mission.",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
  },
  {
    id: 2,
    title: "Set Your Intention",
    description: "An intention is how you want to show up today. It's a simple action or way of being that aligns with your values. Examples: 'Practice patience', 'Lead by example', or 'Show genuine curiosity'.",
    icon: <Target className="h-8 w-8 text-primary" />,
    action: "Think of one way you want to act today",
  },
  {
    id: 3,
    title: "Choose Your Emotion",
    description: "Select an emotion that will support your intention. This is the feeling you want to embody. Examples: 'Calm', 'Confident', 'Grateful', or 'Energized'.",
    icon: <Heart className="h-8 w-8 text-secondary" />,
    action: "Pick an emotion that resonates with you",
  },
  {
    id: 4,
    title: "Add Notes (Optional)",
    description: "You can add reflections, thoughts, or context to your alignment. This becomes especially powerful when you review your journey later.",
    icon: <BookOpen className="h-8 w-8 text-accent" />,
    action: "Add any thoughts or context",
  },
  {
    id: 5,
    title: "You're Ready!",
    description: "That's it! Create your alignment and you'll receive gentle reminders throughout the day to stay connected to your intention and emotion. Let's begin your practice.",
    icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
    action: "Start creating your first alignment",
  },
];

interface TutorialWalkthroughProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function TutorialWalkthrough({ open, onClose, onComplete }: TutorialWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Mark tutorial as completed in user profile
        await supabase
          .from('profiles')
          .update({ tutorial_completed: true })
          .eq('id', user.id);
      }

      toast({
        title: "Tutorial Complete!",
        description: "You're ready to create your first alignment.",
      });

      onComplete();
      navigate('/create-alignment');
    } catch (error) {
      console.error('Error completing tutorial:', error);
      toast({
        title: "Tutorial Complete!",
        description: "You're ready to create your first alignment.",
      });
      onComplete();
      navigate('/create-alignment');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ tutorial_completed: true })
        .eq('id', user.id);
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Getting Started</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {tutorialSteps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Progress value={progress} className="h-2" />

          <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-background animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10 animate-scale-in">
                  {currentStepData.icon}
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">{currentStepData.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {currentStepData.action && (
                <div className="mt-4 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                  <p className="text-sm font-medium text-center">
                    ✨ {currentStepData.action}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tutorial
            </Button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={isCompleting}
                className="gap-2"
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  <>
                    {isCompleting ? "Starting..." : "Begin Practice"}
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
