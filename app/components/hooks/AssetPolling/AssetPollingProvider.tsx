import { useMemo, memo } from 'react';
import { Hex } from '@metamask/utils';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenListPolling from './useTokenListPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import useMultichainAssetsRatePolling from './useMultichainAssetsRatePolling';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';

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

    const account = useSelector(selectSelectedInternalAccount);

    useCurrencyRatePolling(chainParams);
    useTokenRatesPolling(chainParams);
    useTokenDetectionPolling(tokenDetectionParams);
    useTokenListPolling(chainParams);
    useTokenBalancesPolling(chainParams);

    useMultichainAssetsRatePolling(
      account?.id ? { accountId: account.id } : { accountId: '' },
    );

    return null;
  },
);
