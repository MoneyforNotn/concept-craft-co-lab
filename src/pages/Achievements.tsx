import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Lock, Star, Award, Medal, Crown, Sparkles as SparklesIcon, Gem, Zap, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  milestone_days: number;
  alignment_id: string | null;
  achieved_at: string;
  alignment?: {
    intention: string;
    emotion: string;
    date: string;
  };
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const milestones = [5, 10, 20, 40, 80, 160, 365];

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total unique days
      const { data: allAlignments } = await supabase
        .from('daily_alignments')
        .select('date')
        .eq('user_id', user.id);

      const uniqueDates = new Set(allAlignments?.map(a => a.date) || []);
      setTotalDays(uniqueDates.size);

      // Get achievements with alignment details
      const { data: achievementsData } = await supabase
        .from('milestone_achievements')
        .select(`
          id,
          milestone_days,
          alignment_id,
          achieved_at,
          daily_alignments:alignment_id (
            intention,
            emotion,
            date
          )
        `)
        .eq('user_id', user.id)
        .order('milestone_days', { ascending: true });

      if (achievementsData) {
        const formatted = achievementsData.map(a => ({
          ...a,
          alignment: Array.isArray(a.daily_alignments) 
            ? a.daily_alignments[0] 
            : a.daily_alignments
        }));
        setAchievements(formatted);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneMessage = (days: number) => {
    const messages: Record<number, string> = {
      5: "First Steps - You've begun your journey!",
      10: "Building Momentum - Consistency is key!",
      20: "Habit Former - You're making this a lifestyle!",
      40: "Dedicated Practitioner - Your commitment shines!",
      80: "Mindfulness Master - Incredible dedication!",
      160: "Living Legend - Your practice inspires!",
      365: "Year of Presence - A full year of mindfulness! 🌟"
    };
    return messages[days] || `${days} Days of Alignment`;
  };

  const getTierInfo = (days: number) => {
    if (days === 365) {
      return {
        tier: 'Platinum',
        icon: Crown,
        color: 'from-purple-600 via-purple-500 to-pink-500',
        badgeColor: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white',
        borderColor: 'border-purple-400/50',
        glowColor: 'shadow-purple-500/20',
        iconSize: 'h-8 w-8'
      };
    } else if (days === 160) {
      return {
        tier: 'Diamond',
        icon: Gem,
        color: 'from-cyan-400 via-blue-500 to-indigo-600',
        badgeColor: 'bg-gradient-to-r from-cyan-400 to-indigo-600 text-white',
        borderColor: 'border-cyan-400/50',
        glowColor: 'shadow-cyan-400/20',
        iconSize: 'h-7 w-7'
      };
    } else if (days === 80) {
      return {
        tier: 'Gold',
        icon: Award,
        color: 'from-yellow-400 via-yellow-500 to-amber-600',
        badgeColor: 'bg-gradient-to-r from-yellow-400 to-amber-600 text-white',
        borderColor: 'border-yellow-400/50',
        glowColor: 'shadow-yellow-400/20',
        iconSize: 'h-7 w-7'
      };
    } else if (days === 40) {
      return {
        tier: 'Silver',
        icon: Medal,
        color: 'from-slate-300 via-slate-400 to-slate-500',
        badgeColor: 'bg-gradient-to-r from-slate-300 to-slate-500 text-white',
        borderColor: 'border-slate-400/50',
        glowColor: 'shadow-slate-400/20',
        iconSize: 'h-6 w-6'
      };
    } else if (days === 20) {
      return {
        tier: 'Bronze',
        icon: Trophy,
        color: 'from-orange-500 via-amber-600 to-orange-700',
        badgeColor: 'bg-gradient-to-r from-orange-500 to-orange-700 text-white',
        borderColor: 'border-orange-500/50',
        glowColor: 'shadow-orange-500/20',
        iconSize: 'h-6 w-6'
      };
    } else if (days === 10) {
      return {
        tier: 'Rising Star',
        icon: Zap,
        color: 'from-green-400 via-emerald-500 to-teal-600',
        badgeColor: 'bg-gradient-to-r from-green-400 to-teal-600 text-white',
        borderColor: 'border-green-400/50',
        glowColor: 'shadow-green-400/20',
        iconSize: 'h-6 w-6'
      };
    } else {
      return {
        tier: 'Beginner',
        icon: Target,
        color: 'from-blue-400 via-blue-500 to-blue-600',
        badgeColor: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
        borderColor: 'border-blue-400/50',
        glowColor: 'shadow-blue-400/20',
        iconSize: 'h-5 w-5'
      };
    }
  };

  const isUnlocked = (milestone: number) => totalDays >= milestone;
  const getAchievement = (milestone: number) => 
    achievements.find(a => a.milestone_days === milestone);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Achievements</h1>
          <p className="text-muted-foreground">
            {totalDays} days of mindful alignment and counting!
          </p>
        </div>

        <div className="grid gap-4">
          {milestones.map((milestone) => {
            const unlocked = isUnlocked(milestone);
            const achievement = getAchievement(milestone);
            const tierInfo = getTierInfo(milestone);
            const TierIcon = tierInfo.icon;

            return (
              <Card 
                key={milestone}
                className={`transition-all duration-300 ${
                  unlocked 
                    ? `${tierInfo.borderColor} ${tierInfo.glowColor} shadow-lg bg-gradient-to-br from-primary/5 to-transparent hover:shadow-xl hover:scale-[1.02]` 
                    : 'opacity-50 border-dashed grayscale'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {unlocked ? (
                        <div className={`relative p-3 rounded-xl bg-gradient-to-br ${tierInfo.color} shadow-lg ${tierInfo.glowColor} animate-scale-in`}>
                          <TierIcon className={`${tierInfo.iconSize} text-white drop-shadow-lg`} />
                          {milestone === 365 && (
                            <div className="absolute -top-1 -right-1">
                              <Star className="h-4 w-4 text-yellow-300 fill-yellow-300 animate-pulse" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-muted/50">
                          <Lock className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className={unlocked ? 'text-2xl' : 'text-xl'}>{milestone} Days</CardTitle>
                          {unlocked && (
                            <Badge className={`${tierInfo.badgeColor} shadow-md`}>
                              {tierInfo.tier}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className={unlocked ? 'font-medium' : ''}>
                          {getMilestoneMessage(milestone)}
                        </CardDescription>
                        {!unlocked && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {milestone - totalDays} more days to unlock
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {unlocked && achievement?.alignment && (
                  <CardContent>
                    <div className="rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 p-4 space-y-3 border border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-primary text-primary animate-pulse" />
                        <span className="font-semibold">Featured Alignment</span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Intention</p>
                        <p className="font-medium text-lg">{achievement.alignment.intention}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Emotion</p>
                        <p className="font-medium text-lg">{achievement.alignment.emotion}</p>
                      </div>
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          Achieved on {new Date(achievement.achieved_at).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}

                {unlocked && !achievement?.alignment && (
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate(`/select-milestone-alignment/${milestone}`)}
                    >
                      Select Featured Alignment
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
