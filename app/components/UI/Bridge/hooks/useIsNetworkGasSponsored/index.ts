import { useSelector } from 'react-redux';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { useMemo } from 'react';
import { BridgeToken } from '../../types';

export const useIsNetworkGasSponsored = (chainId?: BridgeToken['chainId']) => {
  const gasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );

  const isCurrentNetworkGasSponsored = useMemo(() => {
    if (!chainId || !gasFeesSponsoredNetworkEnabled) {
      return false;
    }
    return gasFeesSponsoredNetworkEnabled(chainId);
  }, [chainId, gasFeesSponsoredNetworkEnabled]);

  return isCurrentNetworkGasSponsored;
};
