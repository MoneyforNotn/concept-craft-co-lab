import React, { createContext, useContext, ReactNode } from 'react';
import { useTestNotificationCountdown } from '@/hooks/useTestNotificationCountdown';

interface TestNotificationContextType {
  countdown: number;
  isCountdownActive: boolean;
  isPaused: boolean;
  resetCountdown: () => void;
  togglePause: () => void;
  stop: () => void;
  start: () => void;
}

const TestNotificationContext = createContext<TestNotificationContextType | undefined>(undefined);

export const TestNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useTestNotificationCountdown();
  
  return (
    <TestNotificationContext.Provider value={value}>
      {children}
    </TestNotificationContext.Provider>
  );
};

export const useTestNotification = () => {
  const context = useContext(TestNotificationContext);
  if (!context) {
    throw new Error('useTestNotification must be used within TestNotificationProvider');
  }
  return context;
};
