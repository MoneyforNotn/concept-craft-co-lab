import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Heart, Sparkles, CheckSquare, Star, TrendingUp, Award, History, Bell, Settings } from "lucide-react";

export default function Guide() {
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4 pb-20">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-4 pt-8 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className={`fixed top-10 left-4 z-50 transition-all duration-300 ${
              showBackButton ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Welcome Guide</h1>
            <p className="text-sm text-muted-foreground">Learn how to practice mindful alignment</p>
          </div>
        </div>

        {/* What Are Daily Alignments */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              What Are Daily Alignments?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/90 space-y-2">
            <p>
              Daily alignments connect your life goals with everyday actions through two components: 
              an <strong>intention</strong> (what you'll practice) and an <strong>emotion</strong> (how you'll embody it).
            </p>
          </CardContent>
        </Card>

        {/* Intentions & Emotions */}
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Intentions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-foreground/90">A statement of how you want to act throughout the day.</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• "Make sure everyone you talk to feels valued and respected"</li>
                <li>• "Live the day without fear of negative judgement"</li>
                <li>• "Keep a straight and confident posture"</li>
                <li>• "Notice what makes you smile"</li>
                <li>• "Create a plan for the day and stick to it"</li>
                <li>• "Notice others' emotions and respond to them"</li>
                <li>• "Treat every task with maximum focus"</li>
                <li>• "Empower others by showing you have faith and confidence in them"</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-secondary" />
                Emotions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-foreground/90">The feeling or energy you'll bring to your intention.</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Attentive</li>
                <li>• Honest</li>
                <li>• Compassionate</li>
                <li>• Patient</li>
                <li>• Confident</li>
                <li>• Grateful</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* App Features */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">App Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <div className="flex gap-3 items-start">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">AI Intention Generator</p>
                  <p className="text-xs text-muted-foreground">Get personalized intention ideas based on your Personal Mission. Provide feedback to refine suggestions.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <CheckSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Daily Checklist</p>
                  <p className="text-xs text-muted-foreground">Add tasks to your alignment and check them off throughout the day.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Star className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Reflections</p>
                  <p className="text-xs text-muted-foreground">Rate your day and add notes to capture insights about how well you lived your intention.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Streaks & Tier Progress</p>
                  <p className="text-xs text-muted-foreground">Track your consistency with streaks and progress through tiers from Bronze to Platinum.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Award className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Achievements</p>
                  <p className="text-xs text-muted-foreground">Unlock badges at milestones (5, 10, 20, 40, 80, 160, 365 days) and select a featured alignment.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <History className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">History & Bookmarks</p>
                  <p className="text-xs text-muted-foreground">Review past alignments, search by date, and bookmark meaningful entries.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Bell className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive reminders throughout the day to reconnect with your intention.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Settings className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Personal Mission</p>
                  <p className="text-xs text-muted-foreground">Define your broader life purpose through guided questions. Your mission shapes your daily intentions.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Practice */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Daily Practice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="space-y-2 text-foreground/90">
              <li><strong className="text-primary">1.</strong> Morning: Create an alignment with your intention, emotion, and optional checklist.</li>
              <li><strong className="text-primary">2.</strong> Throughout the day: Pause when reminded to reconnect with your intention.</li>
              <li><strong className="text-primary">3.</strong> Evening: Add a reflection with a star rating and notes about your day.</li>
            </ol>
            <div className="p-3 bg-accent/50 rounded-lg border border-primary/10 mt-3">
              <p className="text-xs italic text-foreground/90">
                Remember: There's no failure in this practice. Each moment is an opportunity to reconnect. Be kind to yourself.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-4">
          <Button onClick={() => navigate("/")} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Begin Your Practice
          </Button>
        </div>
      </div>
    </div>
  );
}
