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
import { useDespiaPush } from "@/hooks/useDespiaPush";
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showQuotes, setShowQuotes] = useState(true);
  const [testNotificationTitle, setTestNotificationTitle] = useState("Test Notification");
  const [testNotificationMessage, setTestNotificationMessage] = useState("This is a test push notification from your app!");
  const [sendingTest, setSendingTest] = useState(false);
  const [scheduleTestNotification, setScheduleTestNotification] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
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
        .select('personal_mission, timezone, show_quotes')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPersonalMission(profileData.personal_mission || "");
        setTimezone(profileData.timezone || "local");
        setShowQuotes(profileData.show_quotes ?? true);
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

  const handleSendTestNotification = async () => {
    if (!testNotificationTitle || !testNotificationMessage) {
      toast({
        title: "Error",
        description: "Please fill in both title and message",
        variant: "destructive",
      });
      return;
    }

    if (scheduleTestNotification) {
      if (!scheduledDateTime) {
        toast({
          title: "Error",
          description: "Please select a date and time for the scheduled notification",
          variant: "destructive",
        });
        return;
      }

      const scheduledDate = new Date(scheduledDateTime);
      const now = new Date();
      const minScheduledTime = new Date(now.getTime() + 60000); // 1 minute from now
      
      if (scheduledDate <= minScheduledTime) {
        toast({
          title: "Error",
          description: "Scheduled time must be at least 1 minute in the future",
          variant: "destructive",
        });
        return;
      }
    }

    setSendingTest(true);
    try {
      if (!playerId) {
        throw new Error("Push notifications not initialized. Please enable notifications first.");
      }

      if (scheduleTestNotification && scheduledDateTime) {
        // Send scheduled notification via edge function
        const { error } = await supabase.functions.invoke('send-scheduled-test-notification', {
          body: {
            playerId: playerId,
            title: testNotificationTitle,
            message: testNotificationMessage,
            scheduledTime: scheduledDateTime,
          },
        });

        if (error) throw error;

        toast({
          title: 'Notification scheduled',
          description: `Your test notification will be sent at ${new Date(scheduledDateTime).toLocaleString()}`,
        });
      } else {
        // Send immediately
        await sendPushNotification(testNotificationTitle, testNotificationMessage);
      }
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
              {isInitialized && playerId && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Push notifications enabled ✓
                </span>
              )}
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
                onChange={(e) => {
                  const newCount = parseInt(e.target.value);
                  setFrequencyCount(newCount);
                  
                  // Adjust scheduled times array to match the new count
                  if (!isRandom) {
                    const currentTimes = [...scheduledTimes];
                    if (newCount > currentTimes.length) {
                      // Add more times if count increased
                      const defaultTimes = ["09:00", "12:00", "15:00", "18:00", "21:00", "10:00", "13:00", "16:00", "19:00", "22:00"];
                      while (currentTimes.length < newCount) {
                        currentTimes.push(defaultTimes[currentTimes.length] || "12:00");
                      }
                    } else if (newCount < currentTimes.length) {
                      // Remove excess times if count decreased
                      currentTimes.splice(newCount);
                    }
                    setScheduledTimes(currentTimes);
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                How many times per day you'd like to be reminded (1-10)
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
                  Set {frequencyCount} specific time{frequencyCount !== 1 ? 's' : ''} for your daily reminders
                </p>
                {scheduledTimes.slice(0, frequencyCount).map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...scheduledTimes];
                        newTimes[index] = e.target.value;
                        setScheduledTimes(newTimes);
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-16">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleSave} className="w-full" disabled={loading || !notificationsEnabled}>
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
            
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <Bell className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {notificationsEnabled ? "Notifications Active" : "Notifications Paused"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notificationsEnabled 
                      ? "Daily reminders are enabled" 
                      : "All notifications are currently disabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
                disabled={loading}
              />
            </div>

            {lastNotification && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                <p className="text-sm font-medium mb-2">Last Scheduled Notification</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium">Sent:</span>{' '}
                    {new Date(lastNotification.sent_at).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Player ID:</span>{' '}
                    {lastNotification.player_id}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={
                      lastNotification.status === 'success' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }>
                      {lastNotification.status}
                    </span>
                  </p>
                  <p className="mt-2">
                    <span className="font-medium">Message:</span> {lastNotification.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isInitialized && playerId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Test Push Notification</CardTitle>
              <CardDescription>
                Send a test notification to this device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-title">Notification Title</Label>
                <Input
                  id="test-title"
                  value={testNotificationTitle}
                  onChange={(e) => setTestNotificationTitle(e.target.value)}
                  placeholder="Enter notification title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="test-message">Notification Message</Label>
                <Textarea
                  id="test-message"
                  value={testNotificationMessage}
                  onChange={(e) => setTestNotificationMessage(e.target.value)}
                  placeholder="Enter notification message"
                  className="min-h-24"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="schedule-test"
                  checked={scheduleTestNotification}
                  onCheckedChange={setScheduleTestNotification}
                />
                <Label htmlFor="schedule-test" className="cursor-pointer">
                  Schedule notification
                </Label>
              </div>

              {scheduleTestNotification && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Schedule Time</Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select when you want the test notification to be sent (at least 1 minute from now)
                  </p>
                </div>
              )}

              <Button 
                onClick={handleSendTestNotification}
                disabled={sendingTest || !testNotificationTitle || !testNotificationMessage || (scheduleTestNotification && !scheduledDateTime)}
                className="w-full"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {scheduleTestNotification ? 'Scheduling...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    {scheduleTestNotification ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Schedule Test Notification
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Send Test Notification Now
                      </>
                    )}
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Player ID: {playerId}
              </p>
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
                <p className="text-sm text-muted-foreground">
                  Show quotes at the top of the Dashboard
                </p>
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
