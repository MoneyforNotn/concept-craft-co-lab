import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bookmark, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const [alignments, setAlignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlignments();
  }, []);

  const loadAlignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setAlignments(data || []);
    } catch (error) {
      console.error('Error loading alignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_alignments')
        .update({ is_bookmarked: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadAlignments();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Your Journey</CardTitle>
            <CardDescription>
              Reflect on your past alignments
            </CardDescription>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : alignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No alignments yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first alignment to start your journey
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alignments.map((alignment) => (
              <Card
                key={alignment.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/alignment/${alignment.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(alignment.date), 'MMMM d, yyyy')}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(alignment.id, alignment.is_bookmarked);
                      }}
                    >
                      <Bookmark
                        className={`h-5 w-5 ${
                          alignment.is_bookmarked ? 'fill-primary text-primary' : ''
                        }`}
                      />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Intention: </span>
                      <span className="font-medium">{alignment.intention}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Emotion: </span>
                      <span className="font-medium">{alignment.emotion}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
