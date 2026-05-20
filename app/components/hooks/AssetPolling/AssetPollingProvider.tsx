import { useMemo, memo } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import useMultichainAssetsRatePolling from './useMultichainAssetsRatePolling';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';

export interface AssetPollingProviderProps {
  chainIds?: Hex[];
  address?: Hex;
}

// This provider is a step towards making controller polling fully UI based.
// Eventually, individual UI components will call the use*Polling hooks to
// poll and return particular data. This polls globally in the meantime.
// Each hook no-ops when unified assets state is disabled (see use*Polling).
export const AssetPollingProvider = memo((props: AssetPollingProviderProps) => {
  const { chainIds, address } = props;

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
  useTokenBalancesPolling(chainParams);

  useMultichainAssetsRatePolling(
    account?.id ? { accountId: account.id } : { accountId: '' },
  );

  return null;
});

AssetPollingProvider.displayName = 'AssetPollingProvider';
