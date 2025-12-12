import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const messages = [
  "Pause what you're doing for a moment",
  "Take a deep breath and recall your intention and emotion",
  "Notice how you're showing up in the present moment",
  "Gently adjust your awareness and energy if needed"
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing test notification timers...');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all active, non-paused timers that have expired
    const now = new Date().toISOString();
    const { data: expiredTimers, error: fetchError } = await supabase
      .from('test_notification_timers')
      .select(`
        *,
        profiles:user_id (
          onesignal_player_id
        )
      `)
      .eq('is_active', true)
      .eq('is_paused', false)
      .lte('next_notification_at', now);

    if (fetchError) {
      console.error('Error fetching timers:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredTimers?.length || 0} expired timers`);

    const results = [];

    for (const timer of expiredTimers || []) {
      const playerId = timer.profiles?.onesignal_player_id;
      
      if (!playerId) {
        console.log(`User ${timer.user_id} has no player ID, skipping`);
        continue;
      }

      // Send notification
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: [playerId],
            headings: { en: 'Daily Alignment Reminder' },
            contents: { en: randomMessage },
            ios_badgeType: 'Increase',
            ios_badgeCount: 1,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error(`OneSignal error for timer ${timer.id}:`, data);
        } else {
          console.log(`Notification sent for timer ${timer.id}:`, data);
        }
      } catch (notifError) {
        console.error(`Failed to send notification for timer ${timer.id}:`, notifError);
      }

      // Calculate new next_notification_at time
      const minSeconds = timer.min_seconds || 30;
      const maxSeconds = timer.max_seconds || 35;
      const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
      const nextTime = new Date(Date.now() + randomSeconds * 1000).toISOString();

      // Update timer with new next_notification_at
      const { error: updateError } = await supabase
        .from('test_notification_timers')
        .update({ next_notification_at: nextTime })
        .eq('id', timer.id);

      if (updateError) {
        console.error(`Failed to update timer ${timer.id}:`, updateError);
      } else {
        console.log(`Timer ${timer.id} updated, next notification at ${nextTime}`);
      }

      results.push({
        timerId: timer.id,
        userId: timer.user_id,
        nextTime,
        message: randomMessage
      });
    }

    console.log(`Processed ${results.length} timers`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error in process-test-timers function:', error);
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
