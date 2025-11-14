import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [frequencyCount, setFrequencyCount] = useState(3);
  const [isRandom, setIsRandom] = useState(false);
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(["09:00", "13:00", "18:00"]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setFrequencyCount(data.frequency_count);
        setIsRandom(data.is_random);
        setScheduledTimes(data.scheduled_times || ["09:00", "13:00", "18:00"]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          frequency_count: frequencyCount,
          is_random: isRandom,
          scheduled_times: scheduledTimes,
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Notification Settings</CardTitle>
            <CardDescription>
              Customize when you receive mindfulness reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="frequency">Daily reminders</Label>
              <Input
                id="frequency"
                type="number"
                min="1"
                max="10"
                value={frequencyCount}
                onChange={(e) => setFrequencyCount(parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                How many times per day you'd like to be reminded
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Random timing</Label>
                <p className="text-sm text-muted-foreground">
                  Receive reminders at random times throughout the day
                </p>
              </div>
              <Switch
                checked={isRandom}
                onCheckedChange={setIsRandom}
              />
            </div>

            {!isRandom && (
              <div className="space-y-2">
                <Label>Scheduled times</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Set specific times for your reminders
                </p>
                {scheduledTimes.map((time, index) => (
                  <Input
                    key={index}
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTimes = [...scheduledTimes];
                      newTimes[index] = e.target.value;
                      setScheduledTimes(newTimes);
                    }}
                  />
                ))}
                {scheduledTimes.length < frequencyCount && (
                  <Button
                    variant="outline"
                    onClick={() => setScheduledTimes([...scheduledTimes, "12:00"])}
                  >
                    Add Time
                  </Button>
                )}
              </div>
            )}

            <Button onClick={handleSave} className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Notifications</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Notifications will gently remind you to embody your daily intention and emotion.
            </p>
            <p>
              To enable push notifications, you'll need to grant permission when prompted by your device.
            </p>
            <p className="text-xs mt-4 italic">
              Note: Notification functionality requires the native app to be installed on your device.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
