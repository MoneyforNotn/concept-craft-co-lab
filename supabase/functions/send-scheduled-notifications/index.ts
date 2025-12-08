import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
];

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

const getMessageForTime = (hour: number): string => {
  if (hour >= 5 && hour < 12) {
    return morningMessages[Math.floor(Math.random() * morningMessages.length)];
  } else if (hour >= 12 && hour < 17) {
    return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
  } else if (hour >= 17 && hour < 22) {
    return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
  }
  return notificationMessages[Math.floor(Math.random() * notificationMessages.length)];
};

// Calculate second notification time (8 hours after first)
const calculateSecondNotificationTime = (firstTime: string): string => {
  const [hours, minutes] = firstTime.split(':').map(Number);
  let secondHours = hours + 8;
  // Handle day wrap (if second notification is next day, it won't match today)
  if (secondHours >= 24) {
    secondHours -= 24;
  }
  return `${String(secondHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled notifications check...');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const currentHour = now.getUTCHours();

    console.log('Current UTC time:', currentTime);

    // Get all users with notification settings (only enabled ones)
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, scheduled_times, is_random, enabled')
      .eq('enabled', true)
      .not('scheduled_times', 'is', null);

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      throw settingsError;
    }

    console.log(`Found ${notificationSettings?.length || 0} users with notification settings`);

    if (!notificationSettings || notificationSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with notification settings found' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const notificationsToSend = [];

    // Check each user's scheduled times
    for (const setting of notificationSettings) {
      // Skip if random notifications (local device handles these)
      if (setting.is_random) {
        continue;
      }

      const scheduledTimes = setting.scheduled_times || [];
      let shouldSendNotification = false;
      let isSecondNotification = false;

      // Get today's date boundaries
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      
      // Get all notifications sent today for this user
      const { data: todayNotifications, error: logError } = await supabase
        .from('notification_logs')
        .select('sent_at, message')
        .eq('user_id', setting.user_id)
        .eq('status', 'success')
        .gte('sent_at', todayStart.toISOString())
        .order('sent_at', { ascending: true });

      if (logError) {
        console.error(`Error fetching notification logs for user ${setting.user_id}:`, logError);
      }

      const notificationCountToday = todayNotifications?.length || 0;
      console.log(`User ${setting.user_id}: ${notificationCountToday} notifications sent today`);

      // Get the first scheduled time (for calculating second notification)
      const firstScheduledTime = scheduledTimes.length > 0 ? scheduledTimes[0] : null;
      const secondNotificationTime = firstScheduledTime ? calculateSecondNotificationTime(firstScheduledTime) : null;

      console.log(`User ${setting.user_id}: First scheduled time: ${firstScheduledTime}, Second notification time: ${secondNotificationTime}`);

      // Check if current time matches first scheduled time
      if (scheduledTimes.includes(currentTime)) {
        // Only send first notification if no notifications sent today yet
        if (notificationCountToday === 0) {
          shouldSendNotification = true;
          isSecondNotification = false;
          console.log(`First notification triggered for user ${setting.user_id} at ${currentTime}`);
        } else {
          console.log(`Skipping first notification for user ${setting.user_id} - already sent ${notificationCountToday} today`);
        }
      }
      
      // Check if current time matches second notification time (8 hours after first)
      if (secondNotificationTime && currentTime === secondNotificationTime) {
        // Only send second notification if exactly 1 notification was sent today
        if (notificationCountToday === 1) {
          shouldSendNotification = true;
          isSecondNotification = true;
          console.log(`Second notification triggered for user ${setting.user_id} at ${currentTime} (8 hours after ${firstScheduledTime})`);
        } else if (notificationCountToday >= 2) {
          console.log(`Skipping second notification for user ${setting.user_id} - already sent ${notificationCountToday} today`);
        } else {
          console.log(`Skipping second notification for user ${setting.user_id} - first notification not sent yet`);
        }
      }

      if (shouldSendNotification) {
        // Get user's OneSignal player ID
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .eq('id', setting.user_id)
          .single();

        if (profileError) {
          console.error(`Error fetching profile for user ${setting.user_id}:`, profileError);
          continue;
        }

        if (profile?.onesignal_player_id) {
          notificationsToSend.push({
            playerId: profile.onesignal_player_id,
            userId: setting.user_id,
            isSecondNotification,
          });
        } else {
          console.log(`User ${setting.user_id} has no OneSignal player ID`);
        }
      }
    }

    console.log(`Sending notifications to ${notificationsToSend.length} users`);

    // Send notifications
    const results = [];
    for (const notification of notificationsToSend) {
      const message = getMessageForTime(currentHour);
      
      try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: [notification.playerId],
            headings: { en: notification.isSecondNotification ? 'Evening Alignment Check' : 'Daily Alignment Reminder' },
            contents: { en: message },
            ios_badgeType: 'Increase',
            ios_badgeCount: 1,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`Notification sent to user ${notification.userId} (second: ${notification.isSecondNotification})`);
          
          // Log successful notification
          await supabase
            .from('notification_logs')
            .insert({
              user_id: notification.userId,
              player_id: notification.playerId,
              message: message,
              status: 'success',
            });
          
          results.push({ userId: notification.userId, success: true, isSecond: notification.isSecondNotification });
        } else {
          console.error(`Failed to send notification to user ${notification.userId}:`, data);
          
          // Log failed notification
          await supabase
            .from('notification_logs')
            .insert({
              user_id: notification.userId,
              player_id: notification.playerId,
              message: message,
              status: 'failed',
            });
          
          results.push({ userId: notification.userId, success: false, error: data });
        }
      } catch (error: any) {
        console.error(`Error sending notification to user ${notification.userId}:`, error);
        
        // Log error
        await supabase
          .from('notification_logs')
          .insert({
            user_id: notification.userId,
            player_id: notification.playerId,
            message: message,
            status: 'error',
          });
        
        results.push({ userId: notification.userId, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Scheduled notifications processed',
        currentTime,
        notificationsSent: results.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-scheduled-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
