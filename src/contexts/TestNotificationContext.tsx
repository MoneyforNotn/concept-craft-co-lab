import React, { createContext, useContext, ReactNode } from 'react';
import { useTestNotificationCountdown } from '@/hooks/useTestNotificationCountdown';

interface TimerState {
  countdown: number;
  isCountdownActive: boolean;
  isPaused: boolean;
  togglePause: () => void;
  stop: () => void;
  start: () => void;
}

interface TestNotificationContextType {
  timer1: TimerState;
  timer2: TimerState;
}

const TestNotificationContext = createContext<TestNotificationContextType | undefined>(undefined);

export const TestNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const timer1 = useTestNotificationCountdown(5, 20); // 5-20 seconds
  const timer2 = useTestNotificationCountdown(3600, 7200); // 60-120 minutes in seconds
  
  return (
    <TestNotificationContext.Provider value={{ timer1, timer2 }}>
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
