import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bookmark, Calendar, Filter, Loader2, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import StarRating from "@/components/StarRating";
import { User, Session } from "@supabase/supabase-js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function History() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [alignments, setAlignments] = useState<any[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [reflections, setReflections] = useState<Record<string, any[]>>({});
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const navigate = useNavigate();

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

  useEffect(() => {
    if (user) {
      loadAlignments();
    }
  }, [showBookmarkedOnly, user]);

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
  const availableYears = useMemo(() => {
    const years = new Set(alignments.map(a => new Date(a.created_at).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [alignments]);

  const monthOptions = [
    { value: "0", label: "January" }, { value: "1", label: "February" },
    { value: "2", label: "March" }, { value: "3", label: "April" },
    { value: "4", label: "May" }, { value: "5", label: "June" },
    { value: "6", label: "July" }, { value: "7", label: "August" },
    { value: "8", label: "September" }, { value: "9", label: "October" },
    { value: "10", label: "November" }, { value: "11", label: "December" },
  ];

  const filteredAlignments = useMemo(() => {
    return alignments.filter(a => {
      const date = new Date(a.created_at);
      if (filterYear !== "all" && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== "all" && date.getMonth().toString() !== filterMonth) return false;
      return true;
    });
  }, [alignments, filterYear, filterMonth]);

  const isFilterActive = filterYear !== "all" || filterMonth !== "all";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const loadAlignments = async () => {
    try {
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
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-blue-500/10 via-70% to-secondary/20 p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6 pt-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`fixed top-10 left-4 z-50 transition-all duration-300 ${
              showBackButton ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant={showBookmarkedOnly ? "default" : "outline"}
              onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
              className="gap-2"
            >
              <Bookmark className={showBookmarkedOnly ? "fill-current" : ""} />
              {showBookmarkedOnly ? "Show All" : "Bookmarked Only"}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant={isFilterActive ? "default" : "outline"} size="icon" className="relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {isFilterActive && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-4" align="end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); if (v === "all") setFilterMonth("all"); }}>
                    <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filterYear !== "all" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger><SelectValue placeholder="All Months" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {monthOptions.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isFilterActive && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { setFilterYear("all"); setFilterMonth("all"); }}>
                    Clear Filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
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
              {(showBookmarkedOnly || isFilterActive) && (
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
        ) : filteredAlignments.length === 0 ? (
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
            {filteredAlignments.map((alignment) => (
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
