import React, { createContext, useContext } from 'react';
import { useRewardsAuth } from './hooks/useRewardsAuth';

export type RewardsAuthState = ReturnType<typeof useRewardsAuth>;

const RewardsAuthContext = createContext<RewardsAuthState | undefined>(
  undefined,
);

export const RewardsAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const authState = useRewardsAuth();

  return (
    <RewardsAuthContext.Provider value={authState}>
      {children}
    </RewardsAuthContext.Provider>
  );
};

export const useRewards = () => {
  const context = useContext(RewardsAuthContext);
  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsAuthProvider');
  }
  return context;
};
