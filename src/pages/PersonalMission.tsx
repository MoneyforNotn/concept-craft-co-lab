import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-blue-500/10 via-70% to-secondary/20">
      <div className="container max-w-6xl mx-auto p-4 pt-16">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Your Personal Mission</h1>
        </div>

        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="space-y-4">
            <p className="text-muted-foreground text-center">
              Edit your personal mission or retake the questions to generate a new one
            </p>
            <div className="space-y-2">
              <Label htmlFor="mission" className="sr-only">Personal Mission</Label>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background pointer-events-none z-10 rounded-md"></div>
                <Textarea
                  id="mission"
                  value={personalMission}
                  onChange={(e) => setPersonalMission(e.target.value)}
                  placeholder="Your personal mission..."
                  className="min-h-[300px] text-lg leading-relaxed border-none bg-background/60 backdrop-blur-sm shadow-none font-serif px-12 py-8"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleSaveMission} 
                disabled={savingMission}
                className="w-full"
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
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake Questions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
