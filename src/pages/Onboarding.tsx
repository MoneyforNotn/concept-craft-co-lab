import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { z } from "zod";

const responseSchema = z.object({
  answer: z.string().trim().min(1, "Answer is required").max(5000, "Answer must be less than 5000 characters"),
});

const missionSchema = z.object({
  mission: z.string().trim().min(1, "Personal mission cannot be empty").max(5000, "Personal mission must be less than 5000 characters"),
});

const QUESTIONS = [
  { key: "cant_live_without", question: "What is something I can't live without?" },
  { key: "admirable", question: "What would the best version of myself be admirable for?" },
  { key: "important", question: "What is, above all else, important in this world?" },
  { key: "give_to_others", question: "What can I give to others?" },
  { key: "success", question: "How would I describe success?" },
  { key: "joy", question: "What brings me joy?" },
  { key: "improve", question: "What do I want to improve about myself?" },
  { key: "failure", question: "What would a potential failure look like?" },
  { key: "hardships", question: "How does your ideal future self approach hardships?" },
  { key: "curious", question: "What am I still deeply curious about?" },
];

export default function Onboarding() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [personalMission, setPersonalMission] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentAnswer = responses[QUESTIONS[currentQuestion]?.key] || "";

  const handleNext = () => {
    // Validate current answer
    const validation = responseSchema.safeParse({ answer: currentAnswer });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: validation.error.errors[0].message,
      });
      return;
    }
    
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      generatePersonalMission();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const generatePersonalMission = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-personal-mission', {
        body: { responses }
      });

      if (error) throw error;
      setPersonalMission(data.personalMission);
      setEditing(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error generating mission",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveOnboarding = async () => {
    setLoading(true);
    try {
      // Validate personal mission before saving
      const validation = missionSchema.safeParse({ mission: personalMission });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save responses
      const responseData = Object.entries(responses).map(([key, answer]) => ({
        user_id: user.id,
        question_key: key,
        answer,
      }));

      const { error: responsesError } = await supabase
        .from('onboarding_responses')
        .insert(responseData);

      if (responsesError) throw responsesError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          personal_mission: validation.data.mission,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Welcome!",
        description: "Your personal mission has been saved.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg font-medium text-center">
              Crafting your personal mission...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (personalMission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Your Personal Mission</CardTitle>
            <CardDescription>
              This mission statement reflects your values and aspirations. You can edit it if you'd like.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <Textarea
                value={personalMission}
                onChange={(e) => setPersonalMission(e.target.value)}
                className="min-h-32"
              />
            ) : (
              <div className="p-6 bg-accent/50 rounded-lg">
                <p className="text-lg leading-relaxed italic">{personalMission}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => setEditing(!editing)}
                variant="outline"
                className="flex-1"
              >
                {editing ? "Cancel" : "Edit"}
              </Button>
              {editing ? (
                <Button onClick={() => setEditing(false)} className="flex-1">
                  Save Changes
                </Button>
              ) : (
                <Button onClick={saveOnboarding} disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4 relative">
      <button
        onClick={() => navigate("/personal-mission")}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Back to Personal Mission"
      >
        <ArrowLeft className="h-6 w-6 text-foreground" />
      </button>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </span>
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>
          <CardTitle className="text-2xl">{QUESTIONS[currentQuestion].question}</CardTitle>
          <CardDescription>
            Take your time to reflect on this question. There are no wrong answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={currentAnswer}
            onChange={(e) =>
              setResponses({ ...responses, [QUESTIONS[currentQuestion].key]: e.target.value })
            }
            placeholder="Your thoughts..."
            className="min-h-32"
          />
          <div className="flex gap-2">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {currentQuestion === QUESTIONS.length - 1 ? "Generate My Mission" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
