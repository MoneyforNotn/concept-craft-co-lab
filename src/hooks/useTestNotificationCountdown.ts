import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TimerData {
  id: string;
  next_notification_at: string;
  is_active: boolean;
  is_paused: boolean;
  min_seconds: number;
  max_seconds: number;
}

export const useTestNotificationCountdown = (minSeconds: number, maxSeconds: number) => {
  const timerKey = `timer_${minSeconds}_${maxSeconds}`;
  const [countdown, setCountdown] = useState<number>(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerId, setTimerId] = useState<string | null>(null);
  const { toast } = useToast();
  const timerInitialized = useRef(false);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync timer state from database
  const syncFromDatabase = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: timer, error } = await supabase
        .from('test_notification_timers')
        .select('*')
        .eq('user_id', user.id)
        .eq('timer_key', timerKey)
        .maybeSingle();

      if (error) {
        console.error('Error fetching timer:', error);
        return null;
      }

      return timer as TimerData | null;
    } catch (err) {
      console.error('Error syncing timer:', err);
      return null;
    }
  }, [timerKey]);

  // Create or update timer in database
  const upsertTimer = useCallback(async (nextNotificationAt: Date, isActive: boolean, isPausedState: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const timerData = {
        user_id: user.id,
        timer_key: timerKey,
        next_notification_at: nextNotificationAt.toISOString(),
        min_seconds: minSeconds,
        max_seconds: maxSeconds,
        is_active: isActive,
        is_paused: isPausedState,
      };

      if (timerId) {
        await supabase
          .from('test_notification_timers')
          .update({
            next_notification_at: nextNotificationAt.toISOString(),
            is_active: isActive,
            is_paused: isPausedState,
          })
          .eq('id', timerId);
      } else {
        const { data, error } = await supabase
          .from('test_notification_timers')
          .upsert(timerData, { onConflict: 'user_id,timer_key' })
          .select()
          .single();

        if (!error && data) {
          setTimerId(data.id);
        }
      }
    } catch (err) {
      console.error('Error upserting timer:', err);
    }
  }, [timerKey, timerId, minSeconds, maxSeconds]);

  // Initialize timer on mount
  useEffect(() => {
    if (timerInitialized.current) return;
    timerInitialized.current = true;

    const initializeTimer = async () => {
      const timer = await syncFromDatabase();
      
      if (timer) {
        setTimerId(timer.id);
        setIsCountdownActive(timer.is_active);
        setIsPaused(timer.is_paused);
        
        const remainingSeconds = Math.max(0, Math.floor((new Date(timer.next_notification_at).getTime() - Date.now()) / 1000));
        
        if (remainingSeconds > 0) {
          setCountdown(remainingSeconds);
        } else if (timer.is_active && !timer.is_paused) {
          // Timer expired while app was closed - it will be processed by the edge function
          // Generate new countdown for display
          const newCountdown = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
          const nextTime = new Date(Date.now() + newCountdown * 1000);
          await upsertTimer(nextTime, true, false);
          setCountdown(newCountdown);
        }
      } else {
        // No timer exists, create one
        const initialCountdown = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
        const nextTime = new Date(Date.now() + initialCountdown * 1000);
        await upsertTimer(nextTime, true, false);
        setCountdown(initialCountdown);
        setIsCountdownActive(true);
      }
    };

    initializeTimer();
  }, [syncFromDatabase, upsertTimer, minSeconds, maxSeconds]);

  // Countdown timer effect (for display purposes)
  useEffect(() => {
    if (!isCountdownActive || isPaused) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isCountdownActive) {
      // When timer hits 0, generate new countdown
      // The edge function will handle sending the notification
      const newCountdown = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
      const nextTime = new Date(Date.now() + newCountdown * 1000);
      upsertTimer(nextTime, true, false);
      setCountdown(newCountdown);
    }
  }, [countdown, isCountdownActive, isPaused, minSeconds, maxSeconds, upsertTimer]);

  // Periodic sync with database (every 30 seconds) to stay in sync
  useEffect(() => {
    syncInterval.current = setInterval(async () => {
      if (!isCountdownActive || isPaused) return;
      
      const timer = await syncFromDatabase();
      if (timer && timer.is_active && !timer.is_paused) {
        const remainingSeconds = Math.max(0, Math.floor((new Date(timer.next_notification_at).getTime() - Date.now()) / 1000));
        if (Math.abs(remainingSeconds - countdown) > 5) {
          // Significant drift, sync with database
          setCountdown(remainingSeconds);
        }
      }
    }, 30000);

    return () => {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
      }
    };
  }, [syncFromDatabase, isCountdownActive, isPaused, countdown]);

  const togglePause = useCallback(async () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    
    if (newPaused) {
      // Pausing - store current countdown in database
      const nextTime = new Date(Date.now() + countdown * 1000);
      await upsertTimer(nextTime, isCountdownActive, true);
    } else {
      // Resuming - recalculate next notification time
      const nextTime = new Date(Date.now() + countdown * 1000);
      await upsertTimer(nextTime, isCountdownActive, false);
    }
  }, [isPaused, countdown, isCountdownActive, upsertTimer]);

  const stop = useCallback(async () => {
    setIsCountdownActive(false);
    setIsPaused(false);
    
    const nextTime = new Date(Date.now() + countdown * 1000);
    await upsertTimer(nextTime, false, false);
  }, [countdown, upsertTimer]);

  const start = useCallback(async () => {
    setIsCountdownActive(true);
    setIsPaused(false);
    
    // Generate new countdown when starting
    const newCountdown = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    const nextTime = new Date(Date.now() + newCountdown * 1000);
    await upsertTimer(nextTime, true, false);
    setCountdown(newCountdown);
  }, [minSeconds, maxSeconds, upsertTimer]);

  return {
    countdown,
    isCountdownActive,
    isPaused,
    togglePause,
    stop,
    start,
  };
};
