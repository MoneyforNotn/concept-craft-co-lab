import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { ArrowLeft, Loader2, Bell, BellOff, Pencil, RefreshCw, Clock, Moon, Sun } from "lucide-react";
import { getCurrentDateTime, commonTimezones } from "@/lib/timezoneUtils";
import { useTheme } from "@/components/theme-provider";
import { z } from "zod";

const missionSchema = z.object({
  mission: z.string().trim().max(5000, "Personal mission must be less than 5000 characters"),
});

const timezoneSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
});

const notificationSchema = z.object({
  frequencyCount: z.number().min(1).max(10),
  scheduledTimes: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")),
});

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [savingMission, setSavingMission] = useState(false);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [personalMission, setPersonalMission] = useState("");
  const [timezone, setTimezone] = useState("local");
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [frequencyCount, setFrequencyCount] = useState(3);
  const [isRandom, setIsRandom] = useState(false);
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(["09:00", "13:00", "18:00"]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scheduleNotifications, cancelAllNotifications } = useNotifications();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Update current date/time display every second
    const updateDateTime = () => {
      setCurrentDateTime(getCurrentDateTime(timezone));
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(interval);
  }, [timezone]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('personal_mission, timezone')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPersonalMission(profileData.personal_mission || "");
        setTimezone(profileData.timezone || "local");
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
      // Validate notification settings
      const validation = notificationSchema.safeParse({ 
        frequencyCount, 
        scheduledTimes 
      });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      
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
      // Validate personal mission
      const validation = missionSchema.safeParse({ mission: personalMission });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({
          personal_mission: validation.data.mission,
        })
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

      toast({
        title: "Onboarding reset",
        description: "Taking you back to the onboarding process.",
      });

      navigate("/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting onboarding",
        description: error.message,
      });
    }
  };

  const handleSaveTimezone = async () => {
    setSavingTimezone(true);
    try {
      // Validate timezone
      const validation = timezoneSchema.safeParse({ timezone });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({
          timezone: validation.data.timezone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Timezone updated",
        description: "Your timezone preference has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating timezone",
        description: error.message,
      });
    } finally {
      setSavingTimezone(false);
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
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleSaveMission} 
                  disabled={savingMission}
                  className="w-full"
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
                  className="w-full"
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
                  Save & Schedule
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

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Appearance</CardTitle>
            <CardDescription>
              Customize the theme and appearance of the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="w-full"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="w-full"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Date & Time Settings</CardTitle>
            <CardDescription>
              Configure your timezone for daily alignment entries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Current date & time for alignments:</span>
              </div>
              <div className="text-lg font-semibold">{currentDateTime}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {commonTimezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This timezone will be used when creating and displaying alignment entries
              </p>
            </div>

            <Button 
              onClick={handleSaveTimezone} 
              disabled={savingTimezone}
              className="w-full"
            >
              {savingTimezone ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Save Timezone
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
