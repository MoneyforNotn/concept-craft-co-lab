import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function LearnMore() {
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4 pt-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className={`fixed top-10 left-4 z-50 transition-all duration-300 ${
              showBackButton ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Learn More
          </h1>
        </div>

        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg leading-relaxed">
              Mindful Presence is designed to help you cultivate a deeper connection with yourself through daily alignment practices. By setting clear intentions and acknowledging your emotions, you develop greater self-awareness and presence in your daily life.
            </p>
            <p className="leading-relaxed">
              Regular practice helps you stay grounded, make conscious choices, and live more intentionally. Our approach combines ancient wisdom with modern psychology to support your journey toward mindfulness and personal growth.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Resource Library is in progress and will be added soon.
            </p>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
