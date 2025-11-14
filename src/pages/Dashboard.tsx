import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Session } from "@supabase/supabase-js";
import { Sparkles, Book, Settings, Plus, LogOut, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [todayAlignments, setTodayAlignments] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAllPendingNotifications } = useNotifications();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        } else {
          setTimeout(() => {
            loadUserData(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let currentDate = new Date().toISOString().split('T')[0];
    
    const checkDateChange = setInterval(() => {
      const newDate = new Date().toISOString().split('T')[0];
      if (newDate !== currentDate) {
        currentDate = newDate;
        loadUserData(user.id);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDateChange);
  }, [user]);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settings } = await supabase
          .from('notification_settings')
          .select('frequency_count')
          .eq('user_id', user.id)
          .maybeSingle();

        setHasNotifications(settings && settings.frequency_count > 0);
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    checkNotifications();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      if (profileData && !profileData.onboarding_completed) {
        navigate("/onboarding");
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: alignmentData } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: true });

      setTodayAlignments(alignmentData || []);

      const { data: alignments } = await supabase
        .from('daily_alignments')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (alignments) {
        setStreakCount(alignments.length);
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
    }
  };

  const handleResetAlignment = async (alignmentId: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('daily_alignments')
      .update({ date: yesterdayDate })
      .eq('id', alignmentId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to reset alignment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Alignment reset",
        description: "Alignment moved to history",
      });
      if (user) loadUserData(user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center pt-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Mindful Presence
          </h1>
          <div className="flex items-center gap-2">
            {hasNotifications && (
              <Badge 
                variant="secondary" 
                className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => navigate("/settings")}
              >
                <Bell className="h-3 w-3" />
                Active
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Your Personal Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed italic">{profile.personal_mission}</p>
          </CardContent>
        </Card>

        {todayAlignments.length > 0 && todayAlignments.map((alignment, index) => (
          <Card key={alignment.id}>
            <CardHeader>
              <CardTitle>Today's Alignment {todayAlignments.length > 1 ? `#${index + 1}` : ''}</CardTitle>
              <CardDescription>
                Created at {new Date(alignment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Intention</p>
                <p className="text-xl font-medium">{alignment.intention}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emotion</p>
                <p className="text-xl font-medium">{alignment.emotion}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/alignment/${alignment.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleResetAlignment(alignment.id)}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {todayAlignments.length === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Create Today's Alignment</CardTitle>
              <CardDescription>
                Set your intention and emotion for the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/create-alignment")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Alignment
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{streakCount}</div>
              <p className="text-xs text-muted-foreground">days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Next Milestone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {[5, 10, 20, 40, 80].find(m => m > streakCount) || 80}
              </div>
              <p className="text-xs text-muted-foreground">days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 pb-6">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/history")}
          >
            <Book className="h-6 w-6" />
            <span>History</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/guide")}
          >
            <Sparkles className="h-6 w-6" />
            <span>Guide</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-6 w-6" />
            <span>Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
