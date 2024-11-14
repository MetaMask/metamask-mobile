import React, { ReactNode } from 'react';
import useCurrencyRatePolling from './useCurrencyRatePolling';

// This provider is a step towards making controller polling fully UI based.
// Eventually, individual UI components will call the use*Polling hooks to
// poll and return particular data. This polls globally in the meantime.
export const AssetPollingProvider = ({ children }: { children: ReactNode }) => {
  useCurrencyRatePolling();

  return <>{children}</>;
};
