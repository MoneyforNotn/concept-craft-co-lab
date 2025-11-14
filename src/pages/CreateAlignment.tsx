import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function CreateAlignment() {
  const [intention, setIntention] = useState("");
  const [emotion, setEmotion] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('daily_alignments')
        .insert({
          user_id: user.id,
          date: today,
          intention,
          emotion,
        });

      if (error) throw error;

      toast({
        title: "Alignment created!",
        description: "Your intention for today has been set.",
      });
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
            <CardDescription>
              Set your intention and emotion to guide your day (up to 2 per day)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="intention">Intention</Label>
                <Input
                  id="intention"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder=""
                  required
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  What do I want to manifest with my action & interactions today?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emotion">Emotion</Label>
                <Input
                  id="emotion"
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  placeholder=""
                  required
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  With what energy do I want to embody this intention?
                </p>
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
