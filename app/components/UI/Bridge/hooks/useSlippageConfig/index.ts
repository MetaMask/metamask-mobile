import { merge, getOr } from 'lodash/fp';
import AppConstants from '../../../../../core/AppConstants';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { BridgeSlippageConfig } from '../../types';

export const useSlippageConfig = (
  network: CaipChainId | Hex | undefined,
): BridgeSlippageConfig['__default__'] => {
  const defaultConfig = AppConstants.BRIDGE.SLIPPAGE_CONFIG.__default__;

  if (!network) {
    return defaultConfig;
  }

  // Merge default config to each network and return the result.
  // Note that this will also merge default with itself but
  // it does not cause issues so we allow it for simpler semantics.
  return merge(
    defaultConfig,
    getOr(
      {},
      formatChainIdToCaip(network),
      AppConstants.BRIDGE.SLIPPAGE_CONFIG,
    ),
  );
};
