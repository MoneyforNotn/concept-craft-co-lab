import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledNotificationRequest {
  playerId: string;
  title: string;
  message: string;
  scheduledTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerId, title, message, scheduledTime }: ScheduledNotificationRequest = await req.json();

    console.log('Scheduling test notification:', { playerId, title, scheduledTime });

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    if (!playerId) {
      throw new Error('Player ID is required');
    }

    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    if (!scheduledTime) {
      throw new Error('Scheduled time is required');
    }

    // Parse the ISO datetime string from the client
    const scheduledDate = new Date(scheduledTime);
    
    // Validate that the date is valid
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduled time format');
    }
    
    // Add a buffer of 1 minute to account for processing time
    const now = new Date();
    const minScheduledTime = new Date(now.getTime() + 60000); // 1 minute from now
    
    console.log('Now:', now.toISOString());
    console.log('Scheduled date:', scheduledDate.toISOString());
    console.log('Min scheduled time:', minScheduledTime.toISOString());
    
    if (scheduledDate <= minScheduledTime) {
      throw new Error(`Scheduled time must be at least 1 minute in the future. Current time: ${now.toISOString()}, Scheduled time: ${scheduledDate.toISOString()}`);
    }

    // Convert to Unix timestamp for OneSignal
    const sendAfter = Math.floor(scheduledDate.getTime() / 1000);
    
    console.log('Send after timestamp:', sendAfter);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        send_after: sendAfter,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OneSignal API error:', data);
      throw new Error(`OneSignal API error: ${JSON.stringify(data)}`);
    }

    console.log('Test notification scheduled successfully:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      scheduledTime: scheduledDate.toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-scheduled-test-notification function:', error);
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
