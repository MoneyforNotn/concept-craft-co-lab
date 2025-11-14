import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Target, Bell, BookOpen, Sparkles, Award, History, Bookmark, Settings, TrendingUp, PlayCircle } from "lucide-react";
import TutorialWalkthrough from "@/components/TutorialWalkthrough";

export default function Guide() {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <TutorialWalkthrough 
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => setShowTutorial(false)}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 pt-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Welcome Guide</h1>
              <p className="text-muted-foreground">Learn how to practice mindful alignment</p>
            </div>
            <Button onClick={() => setShowTutorial(true)} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Start Tutorial
            </Button>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>What Are Daily Alignments?</CardTitle>
                  <CardDescription>The foundation of mindful living</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Daily alignments are a simple yet powerful practice that connects your broader life goals 
                with everyday actions. They consist of two components: an <strong>intention</strong> and 
                an <strong>emotion</strong>.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                By setting these each morning, you create a compass for your day—a gentle reminder of who 
                you want to be and how you want to show up in the world.
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Intentions</CardTitle>
                    <CardDescription>Your daily focus</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  An intention is a simple statement of how you want to act or be throughout the day. 
                  It connects to your personal mission on a practical level.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Examples:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>• "Lead by example"</li>
                    <li>• "Show sincere appreciation"</li>
                    <li>• "Demonstrate willingness to help"</li>
                    <li>• "Practice active listening"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Heart className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Emotions</CardTitle>
                    <CardDescription>How you'll embody it</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  An emotion is the feeling you want to cultivate as you pursue your intention. 
                  It's the energy that brings your intention to life.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Examples:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>• "Calm and centered"</li>
                    <li>• "Confident and assured"</li>
                    <li>• "Open and curious"</li>
                    <li>• "Grateful and joyful"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Bell className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">How to Use This App</CardTitle>
                  <CardDescription>Your daily practice</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 text-sm text-foreground/90">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-[1.5rem]">1.</span>
                  <span>
                    Start each day by creating a new alignment. Set an intention that resonates 
                    with your personal mission.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-[1.5rem]">2.</span>
                  <span>
                    Choose an emotion that will support this intention. How do you want to feel 
                    as you embody your intention?
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-[1.5rem]">3.</span>
                  <span>
                    Throughout the day, pause and reconnect with your alignment. Ask yourself: 
                    "Am I living this intention? Am I feeling this emotion?"
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-[1.5rem]">4.</span>
                  <span>
                    In the evening, reflect on your day. Add notes to capture insights, 
                    challenges, or moments of alignment.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-[1.5rem]">5.</span>
                  <span>
                    Review your history periodically to notice patterns and celebrate your growth. 
                    Your past alignments tell the story of your journey.
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Streaks & Progress</CardTitle>
                    <CardDescription>Track your consistency</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  Build momentum by maintaining daily streaks. Your tier progress shows how far 
                  you've come from Trainee to Diamond level.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• Current streak counter</li>
                  <li>• Tier progress bar</li>
                  <li>• Next milestone targets</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Award className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Achievements</CardTitle>
                    <CardDescription>Celebrate milestones</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  Unlock achievements at key milestones (7, 30, 90, 180, 365 days). Each 
                  achievement marks significant progress in your journey.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• Bronze, Silver, Gold, Diamond tiers</li>
                  <li>• Special alignment selection</li>
                  <li>• Track all earned badges</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <History className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">History</CardTitle>
                    <CardDescription>Review your journey</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  Access all your past alignments in one place. Search, filter, and reflect on 
                  your personal growth over time.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• Calendar view</li>
                  <li>• Search and filters</li>
                  <li>• View detailed entries</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bookmark className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Bookmarks</CardTitle>
                    <CardDescription>Save meaningful moments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  Bookmark alignments that resonate deeply. Return to them for inspiration or 
                  when you need guidance.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• Quick access to favorites</li>
                  <li>• Filter by bookmarked</li>
                  <li>• Revisit powerful insights</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Settings className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Settings & Customization</CardTitle>
                  <CardDescription>Personalize your experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-foreground/90">
                Tailor the app to your needs with notification preferences, theme options, 
                and personal mission management.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Key settings:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• Edit or regenerate your personal mission</li>
                  <li>• Configure reminder notifications</li>
                  <li>• Adjust notification frequency and timing</li>
                  <li>• Toggle random reminder times</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Bell className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <CardTitle>Mindfulness in Practice</CardTitle>
                  <CardDescription>Tips for staying present</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Mindfulness is about being fully present in each moment. Your daily alignments serve as 
                anchors that bring you back to awareness throughout the day.
              </p>
              <div className="space-y-2">
                <p className="font-medium">When you receive a reminder:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Pause what you're doing for a moment</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Take a deep breath and recall your intention and emotion</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Notice how you're showing up in the present moment</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Gently adjust if needed, without judgment</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Return to your day with renewed awareness</span>
                  </li>
                </ul>
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
    </>
  );
}
