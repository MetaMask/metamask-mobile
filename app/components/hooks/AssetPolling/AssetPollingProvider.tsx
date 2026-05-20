import React, { useMemo, memo } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import useMultichainAssetsRatePolling from './useMultichainAssetsRatePolling';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectIsAssetsUnifyStateEnabled } from '../../../selectors/featureFlagController/assetsUnifyState';

export interface AssetPollingProviderProps {
  chainIds?: Hex[];
  address?: Hex;
}

/**
 * Controller polling hooks for the asset stack. Only mounted when unified
 * assets state is enabled so hooks are not called when that path is inactive.
 */
const AssetPollingEnabledContent = memo((props: AssetPollingProviderProps) => {
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

AssetPollingEnabledContent.displayName = 'AssetPollingEnabledContent';

// This provider is a step towards making controller polling fully UI based.
// Eventually, individual UI components will call the use*Polling hooks to
// poll and return particular data. This polls globally in the meantime.
export const AssetPollingProvider = memo((props: AssetPollingProviderProps) => {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );

  if (!isAssetsUnifyStateEnabled) {
    return null;
  }

  return <AssetPollingEnabledContent {...props} />;
});

AssetPollingProvider.displayName = 'AssetPollingProvider';
