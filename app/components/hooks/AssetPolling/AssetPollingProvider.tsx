import React, { ReactNode } from 'react';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenListPolling from './useTokenListPolling';

// This provider is a step towards making controller polling fully UI based.
// Eventually, individual UI components will call the use*Polling hooks to
// poll and return particular data. This polls globally in the meantime.
export const AssetPollingProvider = ({ children }: { children: ReactNode }) => {
  useTokenBalancesPolling();
  useTokenRatesPolling();
  useTokenListPolling();

  return <>{children}</>;
};
