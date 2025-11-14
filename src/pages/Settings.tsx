import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { ArrowLeft, Loader2, Bell, BellOff, Pencil, RefreshCw } from "lucide-react";

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [savingMission, setSavingMission] = useState(false);
  const [personalMission, setPersonalMission] = useState("");
  const [frequencyCount, setFrequencyCount] = useState(3);
  const [isRandom, setIsRandom] = useState(false);
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(["09:00", "13:00", "18:00"]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scheduleNotifications, cancelAllNotifications } = useNotifications();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('personal_mission')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPersonalMission(profileData.personal_mission || "");
      }

      // Load notification settings
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

      // Schedule the notifications
      await scheduleNotifications(frequencyCount, isRandom, scheduledTimes);

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

  const handleCancelNotifications = async () => {
    await cancelAllNotifications();
  };

  const handleSaveMission = async () => {
    setSavingMission(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({ personal_mission: personalMission })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Personal mission updated",
        description: "Your personal mission has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating mission",
        description: error.message,
      });
    } finally {
      setSavingMission(false);
    }
  };

  const handleRetakeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Mark onboarding as incomplete to allow retaking
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('id', user.id);

      if (error) throw error;

      navigate("/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Personal Mission</CardTitle>
              <CardDescription>
                Edit your personal mission or retake the questions to generate a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mission">Personal Mission</Label>
                <Textarea
                  id="mission"
                  value={personalMission}
                  onChange={(e) => setPersonalMission(e.target.value)}
                  placeholder="Your personal mission..."
                  className="min-h-32"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveMission} 
                  disabled={savingMission}
                  className="flex-1"
                >
                  {savingMission ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleRetakeOnboarding}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake Questions
                </Button>
              </div>
            </CardContent>
          </Card>

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
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Save & Schedule Notifications
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancelNotifications}
              className="w-full gap-2"
            >
              <BellOff className="h-4 w-4" />
              Cancel All Notifications
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Notifications</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Notifications will gently remind you to embody your daily intention and emotion throughout the day.
            </p>
            <p>
              When you save your settings, the app will request permission to send notifications and schedule them based on your preferences.
            </p>
            <p className="text-xs mt-4 italic">
              Note: Full notification functionality requires the native app to be installed on your device.
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
