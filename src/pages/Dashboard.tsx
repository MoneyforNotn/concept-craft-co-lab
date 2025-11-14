import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Session } from "@supabase/supabase-js";
import { Sparkles, Book, Settings, Plus, LogOut, Bell, Trophy, Award, Medal, Crown, Sparkles as SparklesIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import TutorialWalkthrough from "@/components/TutorialWalkthrough";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [todayAlignments, setTodayAlignments] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
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
    }, 60000);

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

      const todayDate = new Date().toISOString().split('T')[0];
      const { data: alignmentsData } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', userId);

      if (alignmentsData && alignmentsData.length === 0 && profileData && !profileData.tutorial_completed) {
        setShowTutorial(true);
      }

      const { data: todayData } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayDate)
        .order('created_at', { ascending: false });

      setTodayAlignments(todayData || []);

      const { data: allAlignments } = await supabase
        .from('daily_alignments')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (allAlignments && allAlignments.length > 0) {
        const uniqueDates = [...new Set(allAlignments.map(a => a.date))].sort().reverse();
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < uniqueDates.length; i++) {
          const alignmentDate = new Date(uniqueDates[i]);
          alignmentDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor((currentDate.getTime() - alignmentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === i) {
            streak++;
          } else {
            break;
          }
        }
        
        setStreakCount(streak);
      } else {
        setStreakCount(0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleAddAlignment = () => {
    navigate("/create-alignment");
    if (user) loadUserData(user.id);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user || !profile) {
    return null;
  }

  const tierInfo = getTierInfo(streakCount);
  const TierIcon = tierInfo.icon;

  return (
    <>
      <TutorialWalkthrough 
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => {
          setShowTutorial(false);
          if (user) loadUserData(user.id);
        }}
      />
      
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
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  Current Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-accent">{streakCount}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {streakCount === 1 ? 'day' : 'days'} in a row
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Next Milestone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">{getNextMilestone(streakCount)}</div>
                <p className="text-sm text-muted-foreground mt-1">days</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TierIcon className="h-5 w-5" />
                Tier Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={`bg-gradient-to-r ${tierInfo.tier}`}>
                  {tierInfo.tier}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {streakCount} / {getNextMilestone(streakCount)} days
                </span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/guide">
              <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Book className="h-5 w-5" />
                    Guide
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/history">
              <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Book className="h-5 w-5" />
                    History
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/achievements">
              <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          </div>

          <Button
            onClick={handleAddAlignment}
            size="lg"
            className="w-full"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Alignment
          </Button>

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
    </>
  );
}
