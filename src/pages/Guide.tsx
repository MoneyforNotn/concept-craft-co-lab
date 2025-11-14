import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Target, Bell, BookOpen, Sparkles } from "lucide-react";

export default function Guide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Welcome Guide</h1>
            <p className="text-muted-foreground">Learn how to practice mindful alignment</p>
          </div>
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
                An emotion describes the feeling or energy you'll bring to your intention. 
                It's how you'll manifest your intention in practice.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Examples:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• "Attentive"</li>
                  <li>• "Honest"</li>
                  <li>• "Compassionate"</li>
                  <li>• "Patient"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>How to Use This App</CardTitle>
                <CardDescription>A simple daily practice</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Start Your Day</p>
                  <p className="text-sm text-muted-foreground">
                    Each morning, create your daily alignment by choosing an intention and emotion.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Receive Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get gentle notifications throughout the day to help you remember and embody your alignment.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Reflect & Journal</p>
                  <p className="text-sm text-muted-foreground">
                    Add notes, thoughts, or photos to your alignment entries. Revisit past days to see your growth.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  4
                </div>
                <div>
                  <p className="font-medium">Build Your Streak</p>
                  <p className="text-sm text-muted-foreground">
                    Track your consistency and celebrate milestones at 5, 10, 20, 40, and 80 days.
                  </p>
                </div>
              </div>
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
                  <span>Gently adjust your awareness and energy if needed</span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg border border-primary/10">
              <p className="text-sm italic text-foreground/90">
                Remember: There's no such thing as failure in this practice. Each moment is an opportunity 
                to reconnect with your intention. Be kind to yourself on this journey.
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
