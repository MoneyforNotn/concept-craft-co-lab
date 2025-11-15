import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User as UserType, Session } from "@supabase/supabase-js";
import { Sparkles, Book, Settings, Plus, User as UserIcon, Bell, BellOff, Trophy, Award, Medal, Crown, Sparkles as SparklesIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { getCurrentDate } from "@/lib/timezoneUtils";

export default function Dashboard() {
  const [user, setUser] = useState<UserType | null>(null);
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

    const checkDateChange = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single();

      const userTimezone = profileData?.timezone || 'local';
      let currentDate = getCurrentDate(userTimezone);
      
      const interval = setInterval(() => {
        const newDate = getCurrentDate(userTimezone);
        if (newDate !== currentDate) {
          currentDate = newDate;
          loadUserData(user.id);
        }
      }, 60000); // Check every minute

      return interval;
    };

    const setupInterval = async () => {
      const interval = await checkDateChange();
      return () => clearInterval(interval);
    };

    setupInterval();
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

      const userTimezone = profileData?.timezone || 'local';
      const today = getCurrentDate(userTimezone);
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

  const getTierInfo = (days: number) => {
    if (days >= 365) {
      return { tier: 'Platinum', icon: Crown, color: 'from-purple-500 to-pink-500' };
    } else if (days >= 80) {
      return { tier: 'Gold', icon: Award, color: 'from-yellow-500 to-amber-500' };
    } else if (days >= 20) {
      return { tier: 'Silver', icon: Medal, color: 'from-slate-400 to-slate-300' };
    } else if (days >= 5) {
      return { tier: 'Bronze', icon: SparklesIcon, color: 'from-orange-600 to-amber-700' };
    }
    return { tier: 'Trainee', icon: Trophy, color: 'from-primary to-primary/60' };
  };

  const getNextMilestone = (current: number) => {
    const milestones = [5, 10, 20, 40, 80, 160, 365];
    return milestones.find(m => m > current) || 365;
  };

  const getPreviousMilestone = (current: number) => {
    const milestones = [0, 5, 10, 20, 40, 80, 160];
    return [...milestones].reverse().find(m => m <= current) || 0;
  };

  const calculateProgress = () => {
    const next = getNextMilestone(streakCount);
    const prev = getPreviousMilestone(streakCount);
    const range = next - prev;
    const progress = streakCount - prev;
    return (progress / range) * 100;
  };


  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center pt-6">
          <h1 
            className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/guide")}
          >
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <UserIcon className="h-5 w-5" />
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
                {getNextMilestone(streakCount)}
              </div>
              <p className="text-xs text-muted-foreground">days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tier Progress</CardTitle>
              <Badge className={`bg-gradient-to-r ${getTierInfo(streakCount).color} text-white`}>
                {getTierInfo(streakCount).tier}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={calculateProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{getPreviousMilestone(streakCount)} days</span>
              <span>{streakCount} / {getNextMilestone(streakCount)} days</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 pb-6">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/achievements")}
          >
            <Trophy className="h-6 w-6" />
            <span>Achievements</span>
          </Button>
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
        </div>

        <Button
          variant="outline"
          className="w-full mb-6"
          onClick={() => navigate("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
