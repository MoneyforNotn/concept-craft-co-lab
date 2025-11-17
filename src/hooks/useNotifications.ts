import { useEffect } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const { toast } = useToast();

  const requestPermission = async () => {
    try {
      const result = await LocalNotifications.requestPermissions();
      if (result.display === 'granted') {
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Notifications disabled",
          description: "Please enable notifications in your device settings to receive reminders.",
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const scheduleNotifications = async (
    frequencyCount: number,
    isRandom: boolean,
    scheduledTimes: string[]
  ) => {
    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      // Cancel all existing notifications first
      await LocalNotifications.cancel({ notifications: await getAllPendingNotifications() });

      const notifications: ScheduleOptions['notifications'] = [];
      
      // Gentle, fun, and encouraging notification messages
      const notificationMessages = [
        "Hey beautiful soul, how's your intention feeling today? 🌟",
        "Quick check-in: Are you living your alignment right now? ✨",
        "Pause for a breath... how are you embodying your intention? 🧘",
        "Your daily reminder: You're exactly where you need to be 💫",
        "Time to check in with yourself - how's your heart today? 💙",
        "A gentle nudge from your future self: Stay aligned! 🌈",
        "How's your emotional weather today? ⛅",
        "You're doing amazing! Take a moment to feel your intention 🌺",
        "Present moment check: Is your intention alive in you? 🍃",
        "Your alignment is calling... will you answer? 📞✨",
        "A mindful pause to honor your intention 🙏",
        "Quick vibe check: How aligned do you feel? 🎯",
        "Hey you! Remember that beautiful intention of yours? 💝",
        "Time to sprinkle some intention into this moment ✨",
        "Your daily alignment loves you - show it some love back! 💕",
        "Gentle reminder: Your emotions are valid, your intention is powerful 🌊",
        "How are you showing up for yourself today? 🌱",
        "Take a breath, check in, stay aligned 🌬️",
        "Your intention is your superpower - using it today? 🦸",
        "A little love note from your aligned self 💌",
      ];
      
      // Select messages based on time of day for variety
      const getMessageForTime = (hour: number): string => {
        const morningMessages = [
          "Good morning! How will you embody your intention today? ☀️",
          "Rise and shine! Your alignment is ready for you 🌅",
          "Fresh day, fresh alignment - how are you feeling? 🌄",
        ];
        
        const afternoonMessages = [
          "Midday check-in: Still aligned with your intention? 🌞",
          "Afternoon pause: How's your alignment holding up? ☕",
          "Quick afternoon refresh - reconnect with your intention 🌤️",
        ];
        
        const eveningMessages = [
          "Evening reflection: Did you honor your intention today? 🌙",
          "Winding down... how did your alignment show up today? 🌆",
          "As the day ends, celebrate your aligned moments ⭐",
        ];
        
        if (hour >= 5 && hour < 12) {
          return morningMessages[Math.floor(Math.random() * morningMessages.length)];
        } else if (hour >= 12 && hour < 17) {
          return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
        } else if (hour >= 17 && hour < 22) {
          return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
        }
        return notificationMessages[Math.floor(Math.random() * notificationMessages.length)];
      };

      if (isRandom) {
        // Schedule random notifications throughout the day
        const startHour = 8; // 8 AM
        const endHour = 20; // 8 PM
        const totalMinutes = (endHour - startHour) * 60;

        for (let i = 0; i < frequencyCount; i++) {
          const randomMinutes = Math.floor(Math.random() * totalMinutes);
          const hour = startHour + Math.floor(randomMinutes / 60);
          const minute = randomMinutes % 60;

          const now = new Date();
          const scheduledDate = new Date();
          scheduledDate.setHours(hour, minute, 0, 0);

          // If the time has passed today, schedule for tomorrow
          if (scheduledDate < now) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          }

          notifications.push({
            id: i + 1,
            title: "Alignment Check-In",
            body: getMessageForTime(hour),
            schedule: {
              at: scheduledDate,
              every: 'day',
            },
            sound: 'default',
            attachments: [],
            actionTypeId: '',
            extra: null,
          });
        }
      } else {
        // Schedule at specific times
        const timesToUse = scheduledTimes.slice(0, frequencyCount);

        timesToUse.forEach((time, index) => {
          const [hours, minutes] = time.split(':').map(Number);
          const now = new Date();
          const scheduledDate = new Date();
          scheduledDate.setHours(hours, minutes, 0, 0);

          // If the time has passed today, schedule for tomorrow
          if (scheduledDate < now) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          }

          notifications.push({
            id: index + 1,
            title: "Alignment Check-In",
            body: getMessageForTime(hours),
            schedule: {
              at: scheduledDate,
              every: 'day',
            },
            sound: 'default',
            attachments: [],
            actionTypeId: '',
            extra: null,
          });
        });
      }

      await LocalNotifications.schedule({ notifications });

      toast({
        title: "Notifications scheduled",
        description: `${notifications.length} daily reminder${notifications.length > 1 ? 's' : ''} set up successfully.`,
      });

      return true;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      toast({
        variant: "destructive",
        title: "Error scheduling notifications",
        description: "Please try again or check your device settings.",
      });
      return false;
    }
  };

  const getAllPendingNotifications = async () => {
    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  };

  const cancelAllNotifications = async () => {
    try {
      const pending = await getAllPendingNotifications();
      await LocalNotifications.cancel({ notifications: pending });
      
      toast({
        title: "Notifications cancelled",
        description: "All scheduled reminders have been removed.",
      });
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  };

  // Set up notification listeners
  useEffect(() => {
    const addListeners = async () => {
      await LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Notification received:', notification);
      });

      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('Notification action performed:', action);
      });
    };

    addListeners();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, []);

  return {
    requestPermission,
    scheduleNotifications,
    cancelAllNotifications,
    getAllPendingNotifications,
  };
}
