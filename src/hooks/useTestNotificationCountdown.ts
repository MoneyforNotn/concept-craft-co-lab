import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDespiaPush } from "@/hooks/useDespiaPush";

export const useTestNotificationCountdown = () => {
  const [countdown, setCountdown] = useState<number>(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { toast } = useToast();
  const { playerId, sendPushNotification } = useDespiaPush();

  // Send test notification function
  const sendTestNotification = useCallback(async () => {
    if (!playerId) return;

    try {
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

      const { data, error } = await supabase.functions.invoke("send-scheduled-test-notification", {
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
      console.error("Error sending test notification:", error);
      toast({
        title: "Failed to send notification",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [playerId, toast, sendPushNotification]);

  // Countdown timer effect
  useEffect(() => {
    if (!isCountdownActive || isPaused) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isCountdownActive) {
      // Timer hit 0, send notification
      sendTestNotification();
      // Generate new random countdown and restart
      const newCountdown = Math.floor(Math.random() * 16) + 5; // 5-20 seconds
      setCountdown(newCountdown);
    }
  }, [countdown, isCountdownActive, isPaused, sendTestNotification]);

  // Initialize countdown on mount
  useEffect(() => {
    const initialCountdown = Math.floor(Math.random() * 16) + 5; // 5-20 seconds
    setCountdown(initialCountdown);
    setIsCountdownActive(true);
  }, []);

  const resetCountdown = useCallback(() => {
    const newCountdown = Math.floor(Math.random() * 16) + 5;
    setCountdown(newCountdown);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const stop = useCallback(() => {
    setIsCountdownActive(false);
    setIsPaused(false);
  }, []);

  const start = useCallback(() => {
    setIsCountdownActive(true);
    setIsPaused(false);
  }, []);

  return {
    countdown,
    isCountdownActive,
    isPaused,
    resetCountdown,
    togglePause,
    stop,
    start,
  };
};
