import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Alignment {
  id: string;
  date: string;
  intention: string;
  emotion: string;
  is_bookmarked: boolean;
}

export default function SelectMilestoneAlignment() {
  const { milestone } = useParams<{ milestone: string }>();
  const [alignments, setAlignments] = useState<Alignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAlignments();
  }, []);

  const loadAlignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('daily_alignments')
        .select('id, date, intention, emotion, is_bookmarked')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      setAlignments(data || []);
    } catch (error) {
      console.error('Error loading alignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (alignmentId: string) => {
    if (!milestone) return;

    // Toggle off if clicking the same one
    if (selectedId === alignmentId) {
      setSelectedId(null);
      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
          .from('milestone_achievements')
          .update({ alignment_id: null })
          .eq('user_id', user.id)
          .eq('milestone_days', parseInt(milestone));

        if (error) throw error;

        toast({
          title: "Featured alignment removed",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // Select new alignment
    setSelectedId(alignmentId);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('milestone_achievements')
        .upsert({
          user_id: user.id,
          milestone_days: parseInt(milestone),
          alignment_id: alignmentId,
        }, {
          onConflict: 'user_id,milestone_days'
        });

      if (error) throw error;

      toast({
        title: "Featured alignment saved!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/achievements")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            Select Your Featured Alignment
          </h1>
          <p className="text-muted-foreground">
            Choose a meaningful alignment to showcase with your {milestone}-day milestone
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {alignments.map((alignment) => (
            <Card
              key={alignment.id}
              className={`cursor-pointer transition-all ${
                selectedId === alignment.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelect(alignment.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {new Date(alignment.date + 'T12:00:00').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </CardTitle>
                  </div>
                  {selectedId === alignment.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Intention</p>
                  <p className="font-medium">{alignment.intention}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emotion</p>
                  <p className="font-medium">{alignment.emotion}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {saving && (
          <p className="text-center text-sm text-muted-foreground">Saving...</p>
        )}
      </div>
    </div>
  );
}
