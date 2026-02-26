import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getCurrentDate } from "@/lib/timezoneUtils";
import { z } from "zod";
import { User, Session } from "@supabase/supabase-js";

const alignmentSchema = z.object({
  intention: z.string().trim().min(1, "Intention is required").max(500, "Intention must be less than 500 characters"),
  emotion: z.string().trim().min(1, "Emotion is required").max(100, "Emotion must be less than 100 characters"),
});

export default function CreateAlignment() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [intention, setIntention] = useState("");
  const [emotion, setEmotion] = useState("");
  const [checklist, setChecklist] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cancelAllNotifications } = useNotifications();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        } else {
          setAuthLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleChecklistChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const lines = value.split('\n');
    const formattedLines = lines.map((line, index) => {
      // If it's a new line (empty or just starting to type) and not the first line
      if (line === '' && index > 0) return '';
      // If the line doesn't start with "- ", add it
      if (!line.startsWith('- ') && line.trim() !== '') {
        return `- ${line.replace(/^-\s*/, '')}`;
      }
      return line;
    });
    setChecklist(formattedLines.join('\n'));
  };

  const handleChecklistKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setChecklist(prev => prev + '\n- ');
    }
  };

  const parseChecklistItems = (text: string) => {
    if (!text.trim()) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '' && line.trim() !== '-');
    if (lines.length === 0) return null;
    return lines.map(line => ({
      text: line.replace(/^-\s*/, '').trim(),
      checked: false
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validation = alignmentSchema.safeParse({ intention, emotion });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's timezone preference
      const { data: profileData } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single();

      const userTimezone = profileData?.timezone || 'local';
      const today = getCurrentDate(userTimezone);

      // Check if there's already an alignment today
      const { data: existingAlignments } = await supabase
        .from('daily_alignments')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today);

      // If creating the first alignment today, cancel all previous notifications
      if (!existingAlignments || existingAlignments.length === 0) {
        await cancelAllNotifications();
        console.log('Cancelled previous alignment notifications');
      }

      const checklistItems = parseChecklistItems(checklist);
      
      const { error } = await supabase
        .from('daily_alignments')
        .insert({
          user_id: user.id,
          date: today,
          intention: validation.data.intention,
          emotion: validation.data.emotion,
          checklist_items: checklistItems,
        });

      if (error) throw error;

      // Check for milestone achievement
      const { data: allAlignments } = await supabase
        .from('daily_alignments')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      const uniqueDates = new Set(allAlignments?.map(a => a.date) || []);
      const totalDays = uniqueDates.size;
      const milestones = [5, 10, 20, 40, 80, 160, 365];
      
      if (milestones.includes(totalDays)) {
        // Check if this milestone already has an achievement
        const { data: existingAchievement } = await supabase
          .from('milestone_achievements')
          .select('id')
          .eq('user_id', user.id)
          .eq('milestone_days', totalDays)
          .maybeSingle();

        if (!existingAchievement) {
          // Create the achievement without alignment initially
          await supabase
            .from('milestone_achievements')
            .insert({
              user_id: user.id,
              milestone_days: totalDays,
            });
        }

        toast({
          title: "🎉 Milestone Reached!",
          description: `Congratulations on ${totalDays} days of mindful alignment! Your dedication and consistency are inspiring. Visit Achievements to select a featured alignment! 🌟`,
          duration: 8000,
        });
      } else {
        toast({
          title: "Alignment created!",
          description: "Your intention for today has been set.",
        });
      }

      navigate("/");
    } catch (error: any) {
      const errorMessage = error.message?.includes('Maximum of 2 alignments')
        ? "You've already created 2 alignments today. Reset one to create a new alignment."
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Error creating alignment",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Alignment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="intention" className="text-base font-semibold">Intention</Label>
                <p className="text-sm text-muted-foreground">What do I want to manifest today?</p>
                <Input
                  id="intention"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emotion" className="text-base font-semibold">Emotion</Label>
                <p className="text-sm text-muted-foreground">With what energy do I embody this?</p>
                <Input
                  id="emotion"
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checklist" className="text-base font-semibold italic">Daily Checklist</Label>
                <Textarea
                  id="checklist"
                  value={checklist}
                  onChange={handleChecklistChange}
                  onKeyDown={handleChecklistKeyDown}
                  placeholder="- Add items you want to accomplish today (optional)"
                  disabled={loading}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Alignment"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
