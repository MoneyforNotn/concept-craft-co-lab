import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useDespiaPush } from "@/hooks/useDespiaPush";
import { useTestNotification } from "@/contexts/TestNotificationContext";
import { ArrowLeft, Loader2, Bell, BellOff, Clock, Moon, Sun, Play, Pause } from "lucide-react";
import { getCurrentDateTime, commonTimezones } from "@/lib/timezoneUtils";
import { useTheme } from "@/components/theme-provider";
import { z } from "zod";

const timezoneSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
});

const notificationSchema = z.object({
  frequencyCount: z.number().min(1).max(10),
  scheduledTimes: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")),
});

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [timezone, setTimezone] = useState("local");
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [frequencyCount, setFrequencyCount] = useState(3);
  const [isRandom, setIsRandom] = useState(false);
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(["09:00", "13:00", "18:00"]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showQuotes, setShowQuotes] = useState(true);
  const [hideStreakProgress, setHideStreakProgress] = useState(false);
  const [hideHeatmap, setHideHeatmap] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [scheduleTestNotification, setScheduleTestNotification] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [customNotificationMessage, setCustomNotificationMessage] = useState("");
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [lastNotification, setLastNotification] = useState<{
    sent_at: string;
    player_id: string;
    message: string;
    status: string;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scheduleNotifications, cancelAllNotifications } = useNotifications();
  const { playerId, isInitialized, sendPushNotification } = useDespiaPush();
  const { theme, setTheme } = useTheme();
  const { timer1, timer2 } = useTestNotification();

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
        .select('timezone, show_quotes, hide_streak_progress, hide_heatmap')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setTimezone(profileData.timezone || "local");
        setShowQuotes(profileData.show_quotes ?? true);
        setHideStreakProgress(profileData.hide_streak_progress ?? false);
        setHideHeatmap(profileData.hide_heatmap ?? false);
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
        setNotificationsEnabled(data.enabled ?? true);
      }

      // Load last notification log
      const { data: lastLog } = await supabase
        .from('notification_logs')
        .select('sent_at, player_id, message, status')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        setLastNotification(lastLog);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Ensure we have the correct number of scheduled times
      const timesToUse = isRandom ? scheduledTimes : scheduledTimes.slice(0, frequencyCount);
      
      // Validate notification settings
      const validation = notificationSchema.safeParse({ 
        frequencyCount, 
        scheduledTimes: timesToUse 
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
          scheduled_times: timesToUse,
          enabled: notificationsEnabled,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Schedule the push notifications
      await scheduleNotifications(frequencyCount, isRandom, timesToUse);

      toast({
        title: "Settings saved",
        description: `Push notifications scheduled for ${frequencyCount} daily reminder${frequencyCount > 1 ? 's' : ''}`,
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

  const handleToggleNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newEnabledState = !notificationsEnabled;

      // Update notification settings
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          enabled: newEnabledState,
          frequency_count: frequencyCount,
          is_random: isRandom,
          scheduled_times: scheduledTimes.slice(0, frequencyCount),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setNotificationsEnabled(newEnabledState);

      if (!newEnabledState) {
        // Cancel all scheduled notifications
        await cancelAllNotifications();
      } else {
        // Schedule notifications
        await scheduleNotifications(frequencyCount, isRandom, scheduledTimes.slice(0, frequencyCount));
      }

      toast({
        title: newEnabledState ? "Notifications enabled" : "Notifications disabled",
        description: newEnabledState 
          ? "Your daily reminders are now active" 
          : "All scheduled notifications have been cancelled",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
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

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      if (!playerId) {
        throw new Error("Push notifications not initialized. Please enable notifications first.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Randomly select one of the alignment reminder messages
      const messages = [
        "Pause what you're doing for a moment",
        "Take a deep breath and recall your intention and emotion",
        "Notice how you're showing up in the present moment",
        "Gently adjust your awareness and energy if needed"
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const { error } = await supabase.functions.invoke('send-scheduled-test-notification', {
        body: {
          userId: user.id,
          playerId: playerId,
          title: "Daily Alignment Reminder",
          message: randomMessage,
        },
      });

      if (error) throw error;

      toast({
        title: "Test notification sent",
        description: "Check your device for the notification",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending test notification",
        description: error.message,
      });
    } finally {
      setSendingTest(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="pt-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`mb-6 fixed top-10 left-4 z-50 transition-all duration-300 ${
              showBackButton ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="space-y-6">
          <Card 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/personal-mission")}
          >
            <CardHeader>
              <CardTitle className="text-2xl">Your Personal Mission</CardTitle>
            </CardHeader>
          </Card>


        {isInitialized && playerId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Test Push Notification
              </CardTitle>
              <CardDescription>
                Send a test notification to this device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Auto-Timer 1 (5-20s)</p>
                    <p className="text-xs text-muted-foreground">
                      Next notification in: {timer1.countdown}s
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={timer1.togglePause}
                    >
                      {timer1.isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={timer1.resetCountdown}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Auto-Timer 2 (60-120m)</p>
                    <p className="text-xs text-muted-foreground">
                      Next notification in: {Math.floor(timer2.countdown / 60)}m {timer2.countdown % 60}s
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={timer2.togglePause}
                    >
                      {timer2.isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={timer2.resetCountdown}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


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
            <CardTitle className="text-2xl">Display Preferences</CardTitle>
            <CardDescription>
              Customize what you see in the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-quotes">Inspirational Quotes</Label>
              </div>
              <Switch
                id="show-quotes"
                checked={showQuotes}
                onCheckedChange={async (checked) => {
                  setShowQuotes(checked);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { error } = await supabase
                      .from('profiles')
                      .update({ show_quotes: checked })
                      .eq('id', user.id);

                    if (error) throw error;

                    toast({
                      title: checked ? "Quotes enabled" : "Quotes disabled",
                    });
                  } catch (error: any) {
                    toast({
                      variant: "destructive",
                      title: "Error updating preference",
                      description: error.message,
                    });
                    setShowQuotes(!checked);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hide-streak">Hide Streak & Milestone Progress</Label>
              </div>
              <Switch
                id="hide-streak"
                checked={hideStreakProgress}
                onCheckedChange={async (checked) => {
                  setHideStreakProgress(checked);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { error } = await supabase
                      .from('profiles')
                      .update({ hide_streak_progress: checked })
                      .eq('id', user.id);

                    if (error) throw error;

                    toast({
                      title: checked ? "Streak progress hidden" : "Streak progress shown",
                    });
                  } catch (error: any) {
                    toast({
                      variant: "destructive",
                      title: "Error updating preference",
                      description: error.message,
                    });
                    setHideStreakProgress(!checked);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hide-heatmap">Hide Activity Calendar</Label>
              </div>
              <Switch
                id="hide-heatmap"
                checked={hideHeatmap}
                onCheckedChange={async (checked) => {
                  setHideHeatmap(checked);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { error } = await supabase
                      .from('profiles')
                      .update({ hide_heatmap: checked })
                      .eq('id', user.id);

                    if (error) throw error;

                    toast({
                      title: checked ? "Activity calendar hidden" : "Activity calendar shown",
                    });
                  } catch (error: any) {
                    toast({
                      variant: "destructive",
                      title: "Error updating preference",
                      description: error.message,
                    });
                    setHideHeatmap(!checked);
                  }
                }}
              />
            </div>
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
