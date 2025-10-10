import { useMemo, memo } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenListPolling from './useTokenListPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import useMultichainAssetsRatePolling from './useMultichainAssetsRatePolling';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import useAccountTrackerPolling from './useAccountTrackerPolling';
import {
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';

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

    const networkConfigurations = useSelector(
      selectEvmNetworkConfigurationsByChainId,
    );

    const networkClientIds = useMemo(
      () =>
        (chainIds ?? [])?.map((chainId) => {
          const networkConfiguration = networkConfigurations[chainId];
          const networkClientId =
            networkConfiguration.rpcEndpoints[
              networkConfiguration.defaultBlockExplorerUrlIndex ?? 0
            ].networkClientId;

          return networkClientId;
        }),
      [chainIds, networkConfigurations],
    );

    useCurrencyRatePolling(chainParams);
    useTokenRatesPolling(chainParams);
    useTokenDetectionPolling(tokenDetectionParams);
    useTokenListPolling(chainParams);
    useTokenBalancesPolling(chainParams);
    useAccountTrackerPolling({ networkClientIds });

    useMultichainAssetsRatePolling(
      account?.id ? { accountId: account.id } : { accountId: '' },
    );

    return null;
  },
);
