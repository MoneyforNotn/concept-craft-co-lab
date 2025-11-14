import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Lock, Star, Award, Medal, Crown, Sparkles as SparklesIcon } from "lucide-react";
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
        color: 'from-purple-500 to-pink-500',
        badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        borderColor: 'border-purple-500/50'
      };
    } else if (days >= 80) {
      return {
        tier: 'Gold',
        icon: Award,
        color: 'from-yellow-500 to-amber-500',
        badgeColor: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
        borderColor: 'border-yellow-500/50'
      };
    } else if (days >= 20) {
      return {
        tier: 'Silver',
        icon: Medal,
        color: 'from-slate-400 to-slate-300',
        badgeColor: 'bg-gradient-to-r from-slate-400 to-slate-300 text-white',
        borderColor: 'border-slate-400/50'
      };
    } else {
      return {
        tier: 'Bronze',
        icon: SparklesIcon,
        color: 'from-orange-600 to-amber-700',
        badgeColor: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white',
        borderColor: 'border-orange-600/50'
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
                className={`transition-all ${
                  unlocked 
                    ? `${tierInfo.borderColor} bg-gradient-to-br from-primary/5 to-transparent` 
                    : 'opacity-60 border-dashed'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {unlocked ? (
                        <div className={`p-2 rounded-full bg-gradient-to-br ${tierInfo.color}`}>
                          <TierIcon className="h-6 w-6 text-white" />
                        </div>
                      ) : (
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle>{milestone} Days</CardTitle>
                          {unlocked && (
                            <Badge className={tierInfo.badgeColor}>
                              {tierInfo.tier}
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {getMilestoneMessage(milestone)}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {unlocked && achievement?.alignment && (
                  <CardContent>
                    <div className="rounded-lg bg-secondary/20 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span>Featured Alignment</span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Intention</p>
                        <p className="font-medium">{achievement.alignment.intention}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Emotion</p>
                        <p className="font-medium">{achievement.alignment.emotion}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Achieved on {new Date(achievement.achieved_at).toLocaleDateString()}
                      </p>
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
