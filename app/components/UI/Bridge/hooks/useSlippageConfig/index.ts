import { mergeWith, getOr } from 'lodash/fp';
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

  try {
    // Merge default config with network-specific overrides.
    // Arrays are replaced, not merged by index.
    const customizer = (_objValue: unknown, srcValue: unknown) => {
      if (Array.isArray(srcValue)) {
        return srcValue; // Replace array entirely
      }
      return undefined; // Use default merge behavior for other types
    };

    return mergeWith(
      customizer,
      defaultConfig,
      getOr(
        {},
        formatChainIdToCaip(network),
        AppConstants.BRIDGE.SLIPPAGE_CONFIG,
      ),
    );
  } catch (error) {
    // If formatChainIdToCaip throws (invalid chain ID format),
    // return default config
    return defaultConfig;
  }
};
