import { useMemo, memo } from 'react';
import { Hex } from '@metamask/utils';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenListPolling from './useTokenListPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';

// This provider is a step towards making controller polling fully UI based.
// Eventually, individual UI components will call the use*Polling hooks to
// poll and return particular data. This polls globally in the meantime.
export const AssetPollingProvider = memo(
  ({ chainIds, address }: { chainIds?: Hex[]; address?: Hex }) => {
    const chainParams = useMemo(
      () => (chainIds ? { chainIds } : undefined),
      [chainIds],
    );

    const tokenDetectionParams = useMemo(
      () => (chainIds && address ? { chainIds, address } : undefined),
      [chainIds, address],
    );

    useCurrencyRatePolling(chainParams);
    useTokenRatesPolling(chainParams);
    useTokenDetectionPolling(tokenDetectionParams);
    useTokenListPolling(chainParams);
    useTokenBalancesPolling(chainParams);

    return null;
  },
);
