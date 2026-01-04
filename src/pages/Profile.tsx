import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Session } from "@supabase/supabase-js";
import { ArrowLeft, LogOut, Mail, Calendar, Trophy, Lock, Award, Medal, Crown, Zap, Target, Gem, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

  const handleDeleteAccount = async () => {
    try {
      const userId = user?.id;
      if (!userId) return;

      // First get the user's alignment IDs
      const { data: alignments } = await supabase
        .from('daily_alignments')
        .select('id')
        .eq('user_id', userId);

      const alignmentIds = alignments?.map(a => a.id) || [];

      // Delete user data from all tables (order matters for foreign keys)
      if (alignmentIds.length > 0) {
        await supabase.from('alignment_reflections').delete().in('alignment_id', alignmentIds);
        await supabase.from('alignment_images').delete().in('alignment_id', alignmentIds);
      }
      await supabase.from('milestone_achievements').delete().eq('user_id', userId);
      await supabase.from('daily_alignments').delete().eq('user_id', userId);
      await supabase.from('notification_settings').delete().eq('user_id', userId);
      await supabase.from('notification_logs').delete().eq('user_id', userId);
      await supabase.from('onboarding_responses').delete().eq('user_id', userId);
      await supabase.from('test_notification_timers').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      // Call edge function to delete user from auth.users
      const { error: deleteAuthError } = await supabase.functions.invoke('delete-user');
      
      if (deleteAuthError) {
        throw new Error(deleteAuthError.message);
      }

      // Sign out and go back to auth (SPA navigation works reliably on mobile)
      await supabase.auth.signOut();

      // Clear local state immediately to avoid blank screens
      setSession(null);
      setUser(null);
      setProfile(null);

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });

      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting account",
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

  const getUnlockedMilestoneIcon = (days: number) => {
    if (days === 365) return { icon: Crown, color: 'from-purple-600 via-purple-500 to-pink-500' };
    if (days === 160) return { icon: Gem, color: 'from-cyan-400 via-blue-500 to-indigo-600' };
    if (days === 80) return { icon: Award, color: 'from-yellow-400 via-yellow-500 to-amber-600' };
    if (days === 40) return { icon: Medal, color: 'from-slate-300 via-slate-400 to-slate-500' };
    if (days === 20) return { icon: Trophy, color: 'from-orange-500 via-amber-600 to-orange-700' };
    if (days === 10) return { icon: Zap, color: 'from-green-400 via-emerald-500 to-teal-600' };
    return { icon: Target, color: 'from-blue-400 via-blue-500 to-blue-600' };
  };

  const getTierInfo = (days: number) => {
    if (days === 365) {
      return {
        tier: 'Platinum',
        icon: Crown,
        color: 'from-purple-600 via-purple-500 to-pink-500',
        badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      };
    } else if (days === 160) {
      return {
        tier: 'Diamond',
        icon: Award,
        color: 'from-cyan-400 via-blue-500 to-indigo-600',
        badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
      };
    } else if (days === 80) {
      return {
        tier: 'Ruby',
        icon: Award,
        color: 'from-yellow-400 via-yellow-500 to-amber-600',
        badgeColor: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
      };
    } else if (days === 40) {
      return {
        tier: 'Emerald',
        icon: Medal,
        color: 'from-slate-300 via-slate-400 to-slate-500',
        badgeColor: 'bg-gradient-to-r from-slate-300 to-slate-100 text-gray-800',
      };
    } else if (days === 20) {
      return {
        tier: 'Gold',
        icon: Trophy,
        color: 'from-orange-500 via-amber-600 to-orange-700',
        badgeColor: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
      };
    } else if (days === 10) {
      return {
        tier: 'Silver',
        icon: Medal,
        color: 'from-green-400 via-emerald-500 to-teal-600',
        badgeColor: 'bg-gradient-to-r from-slate-300 to-slate-100 text-gray-800',
      };
    } else {
      return {
        tier: 'Bronze',
        icon: Trophy,
        color: 'from-blue-400 via-blue-500 to-blue-600',
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
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Preparing your profile…</CardDescription>
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

              {/* Unlocked Achievement Icons */}
              {achievements.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Achievements</p>
                    <div className="flex flex-wrap gap-2">
                      {achievements.map((achievement) => {
                        const iconInfo = getUnlockedMilestoneIcon(achievement.milestone_days);
                        const tierInfo = getTierInfo(achievement.milestone_days);
                        const Icon = iconInfo.icon;
                        return (
                          <div
                            key={achievement.id}
                            className={`p-2.5 rounded-xl bg-gradient-to-br ${iconInfo.color} shadow-md`}
                            title={`${achievement.milestone_days} Days - ${tierInfo.tier}`}
                          >
                            <Icon className="h-5 w-5 text-white drop-shadow-lg" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Milestones</CardTitle>
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

            <div className="pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data including alignments, achievements, and settings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
