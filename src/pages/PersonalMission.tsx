import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Pencil, RefreshCw } from "lucide-react";
import { z } from "zod";

const missionSchema = z.object({
  mission: z.string().trim().max(5000, "Personal mission must be less than 5000 characters"),
});

export default function PersonalMission() {
  const [personalMission, setPersonalMission] = useState("");
  const [savingMission, setSavingMission] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPersonalMission();
  }, []);

  const loadPersonalMission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('personal_mission')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPersonalMission(profileData.personal_mission || "");
      }
    } catch (error) {
      console.error('Error loading personal mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMission = async () => {
    setSavingMission(true);
    try {
      const validation = missionSchema.safeParse({ mission: personalMission });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({
          personal_mission: validation.data.mission,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Personal mission updated",
        description: "Your personal mission has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating mission",
        description: error.message,
      });
    } finally {
      setSavingMission(false);
    }
  };

  const handleRetakeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Onboarding reset",
        description: "Taking you back to the onboarding process.",
      });

      navigate("/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting onboarding",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/20 via-purple-400/10 via-50% to-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-purple-500/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Your Personal Mission
          </h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Textarea - Takes 2/3 of space */}
          <div className="lg:col-span-2">
            <Card className="h-full bg-gradient-to-br from-purple-500/5 to-background border-purple-500/20 shadow-lg shadow-purple-500/5">
              <CardHeader>
                <CardTitle className="text-2xl text-purple-600">Your Personal Mission</CardTitle>
                <CardDescription>
                  This is your guiding light - the core purpose that drives your daily alignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="mission"
                  value={personalMission}
                  onChange={(e) => setPersonalMission(e.target.value)}
                  placeholder="Your personal mission..."
                  className="min-h-[500px] text-lg leading-relaxed resize-none bg-background/50 border-purple-500/20 focus:border-purple-500/40 focus:ring-purple-500/20"
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions Panel - Takes 1/3 of space */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 shadow-lg shadow-purple-500/5">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleSaveMission} 
                  disabled={savingMission}
                  className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                >
                  {savingMission ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleRetakeOnboarding}
                  className="w-full border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all duration-300"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake Questions
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/5 to-background border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Be authentic and specific</p>
                <p>• Focus on your core values</p>
                <p>• Think long-term impact</p>
                <p>• Make it actionable</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
