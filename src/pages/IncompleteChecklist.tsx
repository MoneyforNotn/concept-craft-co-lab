import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, CheckSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { User, Session } from "@supabase/supabase-js";

interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface AlignmentWithChecklist {
  id: string;
  date: string;
  intention: string;
  emotion: string;
  created_at: string;
  checklist_items: ChecklistItem[];
}

export default function IncompleteChecklist() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [alignments, setAlignments] = useState<AlignmentWithChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) navigate("/auth");
        else setAuthLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
      else setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) loadIncompleteItems();
  }, [user]);

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

  const loadIncompleteItems = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', user.id)
        .not('checklist_items', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;

      // Filter to only alignments that have at least one unchecked item
      const filtered = (data || []).filter((a: any) => {
        const items = a.checklist_items as any[];
        return items && items.length > 0 && items.some((item: any) => !item.checked);
      }).map((a: any) => ({
        ...a,
        checklist_items: a.checklist_items as unknown as ChecklistItem[],
      }));

      setAlignments(filtered);
    } catch (error) {
      console.error('Error loading incomplete checklist items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistToggle = async (alignmentId: string, itemIndex: number) => {
    const alignment = alignments.find(a => a.id === alignmentId);
    if (!alignment || !alignment.checklist_items) return;

    const updatedItems = [...alignment.checklist_items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      checked: !updatedItems[itemIndex].checked,
    };

    const { error } = await supabase
      .from('daily_alignments')
      .update({ checklist_items: updatedItems as unknown as any })
      .eq('id', alignmentId);

    if (!error) {
      setAlignments(prev => {
        const updated = prev.map(a =>
          a.id === alignmentId ? { ...a, checklist_items: updatedItems } : a
        );
        // Remove alignments where all items are now checked
        return updated.filter(a => a.checklist_items.some(item => !item.checked));
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalIncomplete = alignments.reduce(
    (sum, a) => sum + a.checklist_items.filter(i => !i.checked).length,
    0
  );

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
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckSquare className="h-6 w-6" />
                  Incomplete Tasks
                </CardTitle>
                <CardDescription>
                  {totalIncomplete} uncompleted checklist {totalIncomplete === 1 ? 'item' : 'items'} across past alignments
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        ) : alignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-2">
                No incomplete checklist items remaining
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alignments.map((alignment) => (
              <Card key={alignment.id}>
                <CardContent className="p-6">
                  <div
                    className="flex items-center gap-2 text-sm text-muted-foreground mb-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => navigate(`/alignment/${alignment.id}`)}
                  >
                    <Calendar className="h-4 w-4" />
                    {format(new Date(alignment.created_at), 'MMMM d, yyyy')}
                    <span className="text-xs">·</span>
                    <span className="font-medium text-foreground truncate">{alignment.intention}</span>
                  </div>
                  <div className="space-y-2">
                    {alignment.checklist_items.map((item, index) => (
                      <div
                        key={`${alignment.id}-${index}`}
                        className="flex items-start gap-3"
                      >
                        <Checkbox
                          id={`incomplete-${alignment.id}-${index}`}
                          checked={item.checked}
                          onCheckedChange={() => handleChecklistToggle(alignment.id, index)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`incomplete-${alignment.id}-${index}`}
                          className={`text-sm cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {item.text}
                        </label>
                      </div>
                    ))}
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
