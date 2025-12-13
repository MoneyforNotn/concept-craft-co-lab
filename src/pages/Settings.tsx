import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useDespiaPush } from "@/hooks/useDespiaPush";
import { useTestNotification } from "@/contexts/TestNotificationContext";
import { ArrowLeft, Loader2, Clock, Moon, Sun, ChevronRight, HelpCircle } from "lucide-react";
import { getCurrentDateTime, commonTimezones } from "@/lib/timezoneUtils";
import { useTheme } from "@/components/theme-provider";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Session } from "@supabase/supabase-js";

const HelpTooltip = ({ content }: { content: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <span 
        className="inline-flex items-center justify-center cursor-pointer outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </span>
    </PopoverTrigger>
    <PopoverContent side="top" className="max-w-[250px] text-sm p-3 w-auto">
      {content}
    </PopoverContent>
  </Popover>
);

const timezoneSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
});

const notificationSchema = z.object({
  frequencyCount: z.number().min(1).max(10),
  scheduledTimes: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")),
});

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scheduleNotifications, cancelAllNotifications } = useNotifications();
  const { playerId, isInitialized } = useDespiaPush();
  const { theme, setTheme } = useTheme();
  const { timer1, timer2 } = useTestNotification();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        } else {
          setAuthLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    const updateDateTime = () => {
      setCurrentDateTime(getCurrentDateTime(timezone));
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(interval);
  }, [timezone]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const loadSettings = async () => {
    try {
      if (!user) return;

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
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleToggleNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newEnabledState = !notificationsEnabled;

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
        await cancelAllNotifications();
      } else {
        await scheduleNotifications(frequencyCount, isRandom, scheduledTimes.slice(0, frequencyCount));
      }

      toast({
        title: newEnabledState ? "Notifications enabled" : "Notifications disabled",
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
        <div className="w-full py-8">
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
            {/* Personal Mission Card - Standalone */}
            <Card 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/personal-mission")}
            >
              <CardHeader className="py-4">
                <CardTitle className="text-xl flex items-center justify-between">
                  Your Personal Mission
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Combined Settings Card */}
            <Card>
              <CardContent className="py-6 space-y-6">
                {/* Mindful Presence Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpTooltip content="Receive notifications throughout the day to remind you of your daily intention and emotion." />
                    <Label htmlFor="notifications-toggle" className="font-medium">Mindful Presence Notifications</Label>
                  </div>
                  <Switch
                    id="notifications-toggle"
                    checked={notificationsEnabled}
                    onCheckedChange={handleToggleNotifications}
                    disabled={loading}
                  />
                </div>

                {/* Routine Notification Timers */}
                {isInitialized && playerId && (
                  <>
                    <div className="border-t pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <HelpTooltip content="Routine notifications that remind you of your daily intention at regular intervals throughout the day." />
                        <Label className="font-medium">Add Routine Notifications</Label>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="timer-2h">Every ≈2 hours</Label>
                        <Switch
                          id="timer-2h"
                          checked={!timer1.isPaused}
                          onCheckedChange={timer1.togglePause}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="timer-6h">Every ≈6 hours</Label>
                        <Switch
                          id="timer-6h"
                          checked={!timer2.isPaused}
                          onCheckedChange={timer2.togglePause}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Display Preferences */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpTooltip content="Show inspirational quotes on the dashboard to motivate and inspire you." />
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
                    <div className="flex items-center gap-2">
                      <HelpTooltip content="Hide the streak counter and milestone progress from the dashboard." />
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
                    <div className="flex items-center gap-2">
                      <HelpTooltip content="Hide the activity calendar heatmap from the dashboard." />
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
                </div>

                {/* Appearance */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpTooltip content="Choose between light and dark theme for the app." />
                    <Label className="font-medium">Appearance</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      onClick={() => setTheme("light")}
                      className="w-full"
                      size="sm"
                    >
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      onClick={() => setTheme("dark")}
                      className="w-full"
                      size="sm"
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time Settings Card - Standalone */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-xl">Date & Time Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Current date & time:</span>
                  </div>
                  <div className="text-base font-semibold">{currentDateTime}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="timezone">Timezone</Label>
                    <HelpTooltip content="This timezone will be used when creating and displaying alignment entries." />
                  </div>
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
                </div>

                <Button 
                  onClick={handleSaveTimezone} 
                  disabled={savingTimezone}
                  className="w-full"
                  size="sm"
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
