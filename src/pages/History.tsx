import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bookmark, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import StarRating from "@/components/StarRating";

export default function History() {
  const [alignments, setAlignments] = useState<any[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reflections, setReflections] = useState<Record<string, any[]>>({});
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlignments();
  }, [showBookmarkedOnly]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowBackButton(true);
      } else {
        setShowBackButton(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const loadAlignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', user.id);

      if (showBookmarkedOnly) {
        query = query.eq('is_bookmarked', true);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      setAlignments(data || []);

      // Load reflections for all alignments
      if (data && data.length > 0) {
        const alignmentIds = data.map(a => a.id);
        const { data: reflectionsData } = await supabase
          .from('alignment_reflections')
          .select('*')
          .in('alignment_id', alignmentIds)
          .order('created_at', { ascending: false });

        const reflectionsByAlignment: Record<string, any[]> = {};
        alignmentIds.forEach(id => {
          reflectionsByAlignment[id] = reflectionsData?.filter(r => r.alignment_id === id) || [];
        });

        setReflections(reflectionsByAlignment);
      }
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

  const getAverageRating = (alignmentId: string): number => {
    const alignmentReflections = reflections[alignmentId] || [];
    if (alignmentReflections.length === 0) return 0;
    
    const sum = alignmentReflections.reduce((acc, r) => acc + r.star_rating, 0);
    return sum / alignmentReflections.length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-4xl mx-auto pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`fixed top-6 left-6 z-50 transition-all duration-300 ${
              showBackButton ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Button
            variant={showBookmarkedOnly ? "default" : "outline"}
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className="gap-2"
          >
            <Bookmark className={showBookmarkedOnly ? "fill-current" : ""} />
            {showBookmarkedOnly ? "Show All" : "Bookmarked Only"}
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Your Journey</CardTitle>
                <CardDescription>
                  {showBookmarkedOnly ? "Your bookmarked alignments" : "Reflect on your past alignments"}
                </CardDescription>
              </div>
              {showBookmarkedOnly && (
                <Badge variant="secondary" className="gap-1">
                  <Filter className="h-3 w-3" />
                  Filtered
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : alignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {showBookmarkedOnly ? "No bookmarked alignments yet" : "No alignments yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {showBookmarkedOnly 
                  ? "Bookmark alignments to see them here" 
                  : "Create your first alignment to start your journey"}
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
                      {format(new Date(alignment.created_at), 'MMMM d, yyyy')}
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

                  {/* Average Star Rating */}
                  {reflections[alignment.id]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Reflection:</span>
                      <StarRating rating={Math.round(getAverageRating(alignment.id))} readonly size={16} />
                      {reflections[alignment.id].length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          (avg of {reflections[alignment.id].length})
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
