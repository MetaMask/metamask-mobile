import React, { createContext } from 'react';
import type { StateSubscriptionService } from '../core/StateSubscriptionService/StateSubscriptionService';

export const StateSubscriptionServiceContext =
  createContext<StateSubscriptionService | null>(null);

export function ControllerStateProvider({
  service,
  children,
}: {
  service: StateSubscriptionService;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <StateSubscriptionServiceContext.Provider value={service}>
      {children}
    </StateSubscriptionServiceContext.Provider>
  );
}
