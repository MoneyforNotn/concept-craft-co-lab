import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Session } from "@supabase/supabase-js";
import { ArrowLeft, LogOut, Mail, Calendar, Trophy, Lock, Award, Medal, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Achievement {
  id: string;
  milestone_days: number;
  achieved_at: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const milestones = [5, 10, 20, 40, 80, 160, 365];

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

  const loadUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Load achievements
      const { data: achievementsData } = await supabase
        .from('milestone_achievements')
        .select('id, milestone_days, achieved_at')
        .eq('user_id', userId)
        .order('milestone_days', { ascending: true });

      if (achievementsData) {
        setAchievements(achievementsData);
      }

      // Get total unique days
      const { data: allAlignments } = await supabase
        .from('daily_alignments')
        .select('date')
        .eq('user_id', userId);

      const uniqueDates = new Set(allAlignments?.map(a => a.date) || []);
      setTotalDays(uniqueDates.size);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getTierInfo = (days: number) => {
    if (days === 365) {
      return {
        tier: 'Platinum',
        icon: Crown,
        color: 'from-purple-500 to-pink-500',
        badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      };
    } else if (days >= 160) {
      return {
        tier: 'Diamond',
        icon: Award,
        color: 'from-cyan-400 to-blue-500',
        badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
      };
    } else if (days >= 80) {
      return {
        tier: 'Gold',
        icon: Award,
        color: 'from-yellow-500 to-amber-500',
        badgeColor: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
      };
    } else if (days >= 40) {
      return {
        tier: 'Emerald',
        icon: Trophy,
        color: 'from-emerald-500 to-green-500',
        badgeColor: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white',
      };
    } else if (days >= 20) {
      return {
        tier: 'Silver',
        icon: Medal,
        color: 'from-slate-400 to-slate-300',
        badgeColor: 'bg-gradient-to-r from-slate-400 to-slate-300 text-white',
      };
    } else if (days === 10) {
      return {
        tier: 'Copper',
        icon: Trophy,
        color: 'from-orange-500 to-amber-600',
        badgeColor: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white',
      };
    } else {
      return {
        tier: 'Bronze',
        icon: Trophy,
        color: 'from-amber-700 to-amber-600',
        badgeColor: 'bg-gradient-to-r from-amber-700 to-amber-600 text-white',
      };
    }
  };

  const getMilestoneMessage = (days: number) => {
    const messages: Record<number, string> = {
      5: "First Steps",
      10: "Building Momentum",
      20: "Habit Former",
      40: "Dedicated Practitioner",
      80: "Mindfulness Master",
      160: "Living Legend",
      365: "Year of Presence"
    };
    return messages[days] || `${days} Days`;
  };

  const isAchievementUnlocked = (milestone: number) => {
    return achievements.some(a => a.milestone_days === milestone);
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4 pt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Profile
          </h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">Account Information</CardTitle>
            <CardDescription>
              Your profile details and account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Member since</p>
                  <p className="font-medium">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Achievements</CardTitle>
            <CardDescription>
              Your mindfulness journey milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {milestones.map((milestone) => {
                const unlocked = isAchievementUnlocked(milestone);
                const tierInfo = getTierInfo(milestone);
                const Icon = unlocked ? tierInfo.icon : Lock;
                
                return (
                  <div
                    key={milestone}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      unlocked
                        ? 'bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30'
                        : 'bg-muted/30 border-muted opacity-50'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Icon className={`h-8 w-8 ${unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`font-semibold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {milestone} Days
                        </p>
                        <p className={`text-xs ${unlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                          {getMilestoneMessage(milestone)}
                        </p>
                      </div>
                      {unlocked && (
                        <Badge className={tierInfo.badgeColor}>
                          {tierInfo.tier}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                  <p className="text-2xl font-bold text-primary">{totalDays}</p>
                </div>
                <Trophy className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
