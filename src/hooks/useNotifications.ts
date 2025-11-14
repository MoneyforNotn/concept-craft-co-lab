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
      const notificationMessages = [
        "Time to check in with your intention 🌟",
        "How are you embodying your alignment today? ✨",
        "A gentle reminder to stay present 🧘",
        "Remember your daily intention 💫",
        "Take a moment to reflect on your emotion 🌈",
        "You're doing great! Keep your intention close 🌺",
        "A mindful pause for your alignment 🍃",
      ];

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
            title: "Mindful Reminder",
            body: notificationMessages[i % notificationMessages.length],
            schedule: {
              at: scheduledDate,
              every: 'day',
            },
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
            title: "Mindful Reminder",
            body: notificationMessages[index % notificationMessages.length],
            schedule: {
              at: scheduledDate,
              every: 'day',
            },
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
