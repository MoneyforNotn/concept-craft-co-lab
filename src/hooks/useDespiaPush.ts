import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    despia?: {
      onesignalplayerid?: string;
    };
  }
}

export const useDespiaPush = () => {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initializeDespia = async () => {
      try {
        // Dynamically import despia-native
        const despia = await import('despia-native');
        
        // Access the OneSignal player ID
        const onesignalPlayerId = (despia as any).default?.onesignalplayerid;
        
        if (onesignalPlayerId) {
          console.log('OneSignal Player ID:', onesignalPlayerId);
          setPlayerId(onesignalPlayerId);
          
          // Save player ID to user's profile
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from('profiles')
              .update({ onesignal_player_id: onesignalPlayerId })
              .eq('id', user.id);
            
            if (error) {
              console.error('Error saving OneSignal player ID:', error);
            } else {
              console.log('OneSignal player ID saved to profile');
            }
          }
          
          setIsInitialized(true);
        } else {
          console.warn('OneSignal player ID not available');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing Despia push:', error);
        setIsInitialized(true);
      }
    };

    initializeDespia();
  }, []);

  const sendPushNotification = async (title: string, message: string) => {
    try {
      if (!playerId) {
        throw new Error('OneSignal player ID not available');
      }

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          playerIds: [playerId],
          title,
          message,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Notification sent',
        description: 'Push notification sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending push notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send push notification',
        variant: 'destructive',
      });
    }
  };

  return {
    playerId,
    isInitialized,
    sendPushNotification,
  };
};
