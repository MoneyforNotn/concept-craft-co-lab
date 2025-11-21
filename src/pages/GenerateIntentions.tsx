import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GenerateIntentions() {
  const navigate = useNavigate();
  const [intentions, setIntentions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [personalMission, setPersonalMission] = useState("");
  const [userFeedback, setUserFeedback] = useState("");
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonalMissionAndGenerateIntentions();
  }, []);

  const fetchPersonalMissionAndGenerateIntentions = async (feedback?: string) => {
    try {
      setIsLoading(true);
      
      // Fetch user's personal mission
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to generate intentions");
        navigate("/auth");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("personal_mission")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.personal_mission) {
        toast.error("Please set your personal mission first");
        navigate("/settings");
        return;
      }

      setPersonalMission(profile.personal_mission);

      // Generate intentions
      const { data, error } = await supabase.functions.invoke('generate-intentions', {
        body: { 
          personalMission: profile.personal_mission,
          userFeedback: feedback || null
        }
      });

      if (error) throw error;

      if (data?.intentions) {
        setIntentions(Array.isArray(data.intentions) ? data.intentions : [data.intentions]);
      } else {
        throw new Error("No intentions generated");
      }
    } catch (error) {
      console.error("Error generating intentions:", error);
      toast.error("Failed to generate intentions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFeedback = () => {
    if (userFeedback.trim()) {
      setLastFeedback(userFeedback);
      fetchPersonalMissionAndGenerateIntentions(userFeedback);
      setUserFeedback("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/20 via-purple-400/10 to-purple-600/20">
      <div className="container max-w-4xl mx-auto p-4 pt-16">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Generate Intentions with AI</h1>
        </div>

        <div className="space-y-6">
          {/* User Prompt - Right Side */}
          <div className="flex justify-end">
            <Card className="max-w-[80%] bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <p className="text-base">
                  Create Daily Alignments tailored for My Personal Mission
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AI Response - Left Side */}
          <div className="flex justify-start">
            <Card className="max-w-[80%] bg-secondary/10 border-secondary/20">
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-muted-foreground">Generating intentions...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold mb-1">Here are 3 intention ideas for you:</p>
                      {lastFeedback && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Based on your request: "{lastFeedback}"
                        </p>
                      )}
                    </div>
                    <ol className="space-y-3 list-decimal list-inside">
                      {intentions.map((intention, index) => (
                        <li key={index} className="text-base leading-relaxed pl-2">
                          {intention}
                        </li>
                      ))}
                    </ol>

                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-3">
                        How shall we improve these?
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={userFeedback}
                          onChange={(e) => setUserFeedback(e.target.value)}
                          placeholder="Type your feedback here..."
                          onKeyDown={(e) => e.key === "Enter" && handleSendFeedback()}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSendFeedback}
                          size="icon"
                          disabled={!userFeedback.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
