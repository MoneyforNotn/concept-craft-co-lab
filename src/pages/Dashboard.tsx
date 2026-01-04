import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { User as UserType, Session } from "@supabase/supabase-js";
import { Sparkles, Book, Settings, Plus, User as UserIcon, Bell, BellOff, Trophy, Award, Medal, Crown, Sparkles as SparklesIcon, BookOpen, ChevronDown, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useDespiaPush } from "@/hooks/useDespiaPush";
import { getCurrentDate } from "@/lib/timezoneUtils";
import ReflectionForm from "@/components/ReflectionForm";
import StarRating from "@/components/StarRating";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTestNotification } from "@/contexts/TestNotificationContext";
import AlignmentHeatmap from "@/components/AlignmentHeatmap";

const quotes = [
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "Know thyself.", author: "Socrates" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "Buddha" },
  { text: "He who knows others is wise; he who knows himself is enlightened.", author: "Lao Tzu" },
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu" },
  { text: "Life is really simple, but we insist on making it complicated.", author: "Confucius" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "What we think, we become.", author: "Buddha" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "The present moment is the only time over which we have dominion.", author: "Thích Nhất Hạnh" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" }
];


export default function Dashboard() {
  const [user, setUser] = useState<UserType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [todayAlignments, setTodayAlignments] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [quote, setQuote] = useState(quotes[0]);
  const [hideStreakProgress, setHideStreakProgress] = useState(false);
  const [hideHeatmap, setHideHeatmap] = useState(false);
  const [reflections, setReflections] = useState<Record<string, any[]>>({});
  const [canAddReflection, setCanAddReflection] = useState<Record<string, boolean>>({});
  const [openReflections, setOpenReflections] = useState<Record<string, boolean>>({});
  const [openAboutNotifications, setOpenAboutNotifications] = useState(false);
  const [allAlignments, setAllAlignments] = useState<Array<{ date: string; hasReflection: boolean }>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAllPendingNotifications } = useNotifications();
  const { playerId } = useDespiaPush();
  const { timer1, timer2 } = useTestNotification();
  
  // Bell icon should be active if either timer is active and not paused
  const isNotificationActive = (timer1.isCountdownActive && !timer1.isPaused) || (timer2.isCountdownActive && !timer2.isPaused);

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

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
          .select('frequency_count, enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        setHasNotifications(settings && settings.frequency_count > 0 && (settings.enabled ?? true));
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
      setHideStreakProgress(profileData?.hide_streak_progress ?? false);
      setHideHeatmap(profileData?.hide_heatmap ?? false);

      // Only force onboarding if the user doesn't have a personal mission yet
      if (
        profileData &&
        !profileData.onboarding_completed &&
        !(profileData.personal_mission && profileData.personal_mission.trim().length > 0)
      ) {
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

      // Load reflections for today's alignments
      if (alignmentData && alignmentData.length > 0) {
        const alignmentIds = alignmentData.map(a => a.id);
        const { data: reflectionsData } = await supabase
          .from('alignment_reflections')
          .select('*')
          .in('alignment_id', alignmentIds)
          .order('created_at', { ascending: false });

        const reflectionsByAlignment: Record<string, any[]> = {};
        const canAddByAlignment: Record<string, boolean> = {};

        alignmentIds.forEach(id => {
          const alignmentReflections = reflectionsData?.filter(r => r.alignment_id === id) || [];
          reflectionsByAlignment[id] = alignmentReflections;

          if (alignmentReflections.length === 0) {
            canAddByAlignment[id] = true;
          } else {
            const lastReflection = alignmentReflections[0];
            const lastReflectionTime = new Date(lastReflection.created_at);
            const oneHourLater = new Date(lastReflectionTime.getTime() + 60 * 60 * 1000);
            canAddByAlignment[id] = Date.now() >= oneHourLater.getTime();
          }
        });

        setReflections(reflectionsByAlignment);
        setCanAddReflection(canAddByAlignment);
      }

      const { data: alignments } = await supabase
        .from('daily_alignments')
        .select(`
          date,
          alignment_reflections (id)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (alignments) {
        // Count unique days with alignments, not consecutive days
        const uniqueDates = [...new Set(alignments.map(a => a.date))];
        setStreakCount(uniqueDates.length);
        setAllAlignments(alignments.map(a => ({
          date: a.date,
          hasReflection: a.alignment_reflections && a.alignment_reflections.length > 0
        })));
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

  const handleReflectionAdded = () => {
    if (user) loadUserData(user.id);
  };

  const handleChecklistToggle = async (alignmentId: string, itemIndex: number) => {
    const alignment = todayAlignments.find(a => a.id === alignmentId);
    if (!alignment || !alignment.checklist_items) return;

    const updatedItems = [...alignment.checklist_items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      checked: !updatedItems[itemIndex].checked
    };

    const { error } = await supabase
      .from('daily_alignments')
      .update({ checklist_items: updatedItems })
      .eq('id', alignmentId);

    if (!error) {
      setTodayAlignments(prev => prev.map(a => 
        a.id === alignmentId ? { ...a, checklist_items: updatedItems } : a
      ));
    }
  };

  const getNextReflectionTime = (alignmentId: string): Date | undefined => {
    const alignmentReflections = reflections[alignmentId] || [];
    if (alignmentReflections.length === 0) return undefined;
    
    const lastReflection = alignmentReflections[0];
    const lastReflectionTime = new Date(lastReflection.created_at);
    return new Date(lastReflectionTime.getTime() + 60 * 60 * 1000);
  };

  const getTierInfo = (days: number) => {
    if (days >= 365) {
      return { tier: 'Platinum', icon: Crown, color: 'from-purple-500 to-pink-500' };
    } else if (days >= 160) {
      return { tier: 'Diamond', icon: Award, color: 'from-cyan-400 to-blue-500' };
    } else if (days >= 80) {
      return { tier: 'Ruby', icon: SparklesIcon, color: 'from-red-500 to-pink-600' };
    } else if (days >= 40) {
      return { tier: 'Emerald', icon: SparklesIcon, color: 'from-emerald-500 to-green-500' };
    } else if (days >= 20) {
      return { tier: 'Gold', icon: Award, color: 'from-yellow-500 to-amber-500' };
    } else if (days >= 10) {
      return { tier: 'Silver', icon: Medal, color: 'from-slate-300 to-slate-100' };
    } else if (days >= 5) {
      return { tier: 'Bronze', icon: Trophy, color: 'from-amber-700 to-amber-600' };
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
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Checking your session…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 bg-primary/60 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {profile.show_quotes !== false && (
          <div className="pt-12 text-center">
            <p className="text-sm italic text-muted-foreground">
              "{quote.text}" — {quote.author}
            </p>
          </div>
        )}
        
        <div className={`flex justify-between items-center ${profile.show_quotes === false ? 'pt-4' : ''}`}>
          <h1 
            className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/guide")}
          >
            Mindful Presence
          </h1>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isNotificationActive ? "secondary" : "outline"}
              className={`gap-1 cursor-pointer transition-colors ${
                isNotificationActive 
                  ? 'hover:bg-secondary/80' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => navigate("/settings")}
            >
              {isNotificationActive ? (
                <>
                  <Bell className="h-3 w-3" />
                  Active
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3" />
                  Paused
                </>
              )}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <UserIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card 
          className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/personal-mission")}
        >
          <CardHeader>
            <CardTitle className="text-2xl">Your Personal Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed italic">{profile.personal_mission}</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-purple-500/15 via-background via-70% to-purple-600/15 border-white cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/generate-intentions")}
        >
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path
                  fillRule="evenodd"
                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                  clipRule="evenodd"
                />
              </svg>
              Generate Intentions with AI
            </CardTitle>
          </CardHeader>
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
              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/alignment/${alignment.id}`)}
                >
                  View Details
                </Button>
              </div>

              {/* Reflection Dropdown */}
              <div className="mt-4 pt-4 border-t">
                <Collapsible
                  open={openReflections[alignment.id] ?? false}
                  onOpenChange={(open) => 
                    setOpenReflections(prev => ({ ...prev, [alignment.id]: open }))
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                    >
                      Add Reflection
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform duration-200 ${
                          openReflections[alignment.id] ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <ReflectionForm
                      alignmentId={alignment.id}
                      onReflectionAdded={handleReflectionAdded}
                      canAddReflection={canAddReflection[alignment.id] ?? true}
                      nextReflectionTime={getNextReflectionTime(alignment.id)}
                    />
                  </CollapsibleContent>
                </Collapsible>
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

        {/* Daily Checklist Card */}
        {todayAlignments.some(a => a.checklist_items && a.checklist_items.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Daily Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayAlignments.map(alignment => 
                alignment.checklist_items?.map((item: { text: string; checked: boolean }, index: number) => (
                  <div 
                    key={`${alignment.id}-${index}`} 
                    className="flex items-start gap-3"
                  >
                    <Checkbox
                      id={`checklist-${alignment.id}-${index}`}
                      checked={item.checked}
                      onCheckedChange={() => handleChecklistToggle(alignment.id, index)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`checklist-${alignment.id}-${index}`}
                      className={`text-sm cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.text}
                    </label>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!hideStreakProgress && (
          <>
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
                  <Badge className={`bg-gradient-to-r ${getTierInfo(streakCount).color} border-0 ${
                    streakCount >= 10 && streakCount < 20 ? 'text-gray-800' : 'text-white'
                  }`}>
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
          </>
        )}

        {!hideHeatmap && <AlignmentHeatmap alignments={allAlignments} timezone={profile?.timezone} />}

        <div className="grid grid-cols-3 gap-4 pb-3">
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
          className="w-full"
          onClick={() => navigate("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>

        <Button
          variant="outline"
          className="w-full mb-6"
          onClick={() => navigate("/learn-more")}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Learn More
        </Button>

        <div className="pt-4 pb-8 text-center">
          <p className="text-sm italic text-muted-foreground">
            "Wholeness is not something you create, it is something you notice. It's the quiet realization that nothing is actually missing, now."
          </p>
        </div>
      </div>
    </div>
  );
}
