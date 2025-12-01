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

      // Get user's last notification today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      
      const { data: lastNotificationToday, error: logError } = await supabase
        .from('notification_logs')
        .select('sent_at')
        .eq('user_id', setting.user_id)
        .eq('status', 'success')
        .gte('sent_at', todayStart.toISOString())
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (logError && logError.code !== 'PGRST116') {
        console.error(`Error fetching notification log for user ${setting.user_id}:`, logError);
      }

      // Check if any of the scheduled times match current time (first notification)
      if (scheduledTimes.includes(currentTime)) {
        // Only send if no notification sent today yet
        if (!lastNotificationToday) {
          shouldSendNotification = true;
          isSecondNotification = false;
          console.log(`First notification scheduled for user ${setting.user_id}`);
        }
      } else if (lastNotificationToday) {
        // Check if 8 hours have passed since last notification (second notification)
        const lastNotificationTime = new Date(lastNotificationToday.sent_at);
        const hoursSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);
        
        // Send second notification if 8+ hours have passed and we're within the same minute
        if (hoursSinceLastNotification >= 8 && hoursSinceLastNotification < 8.017) {
          shouldSendNotification = true;
          isSecondNotification = true;
          console.log(`Second notification (8 hours later) scheduled for user ${setting.user_id}`);
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
            headings: { en: 'Daily Alignment Reminder' },
            contents: { en: message },
            ios_badgeType: 'Increase',
            ios_badgeCount: 1,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`Notification sent to user ${notification.userId}`);
          
          // Log successful notification
          await supabase
            .from('notification_logs')
            .insert({
              user_id: notification.userId,
              player_id: notification.playerId,
              message: message,
              status: 'success',
            });
          
          results.push({ userId: notification.userId, success: true });
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
