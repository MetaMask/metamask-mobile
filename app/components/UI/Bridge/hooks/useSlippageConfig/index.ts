import { mergeWith, getOr } from 'lodash/fp';
import AppConstants from '../../../../../core/AppConstants';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { BridgeSlippageConfig } from '../../types';
import { useMemo } from 'react';

interface UseSlippageConfigOptions {
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
}

type SlippageConfig = BridgeSlippageConfig['__default__'];
type PartialSlippageConfig = Partial<SlippageConfig>;

/**
 * When merging configs, arrays should be replaced entirely (not merged by index).
 */
const mergeCustomizer = (_objValue: unknown, srcValue: unknown) => {
  if (Array.isArray(srcValue)) {
    return srcValue;
  }
  return undefined;
};

/**
 * Merges base config with overrides in order.
 * Later overrides take precedence over earlier ones.
 */
const mergeConfigs = (
  base: SlippageConfig,
  overrides: PartialSlippageConfig[],
): SlippageConfig => {
  let result = base;

  for (const override of overrides) {
    result = mergeWith(mergeCustomizer, result, override);
  }

  return result;
};

/**
 * Hook to get slippage configuration based on source and destination chains.
 *
 * Config priority (lowest to highest):
 * 1. `__default__` - base configuration for all chains
 * 2. `[sourceChainId]['*']` - wildcard override when source chain matches
 * 3. `[sourceChainId][destChainId]` - specific source→destination override
 *
 * @example
 * // Get default config
 * useSlippageConfig({})
 *
 * // Get config for Solana source
 * useSlippageConfig({ sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' })
 *
 * // Get config for Solana→Solana swap
 * useSlippageConfig({
 *   sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
 *   destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
 * })
 */
export const useSlippageConfig = ({
  sourceChainId,
  destChainId,
}: UseSlippageConfigOptions): SlippageConfig => {
  const defaultConfig = AppConstants.BRIDGE.SLIPPAGE_CONFIG.__default__;

  return useMemo(() => {
    // No source chain = use defaults
    if (!sourceChainId) {
      return defaultConfig;
    }

    try {
      const sourceCaip = formatChainIdToCaip(sourceChainId);
      const slippageConfig = AppConstants.BRIDGE.SLIPPAGE_CONFIG;

      // Get wildcard config: SLIPPAGE_CONFIG[sourceChain]['*']
      const wildcardConfig = getOr(
        {},
        [sourceCaip, '*'],
        slippageConfig,
      ) as PartialSlippageConfig;

      // Get destination-specific config: SLIPPAGE_CONFIG[sourceChain][destChain]
      let destConfig: PartialSlippageConfig = {};
      if (destChainId) {
        const destCaip = formatChainIdToCaip(destChainId);
        destConfig = getOr({}, [sourceCaip, destCaip], slippageConfig);
      }

      // Merge in priority order: default < wildcard < destination
      return mergeConfigs(defaultConfig, [wildcardConfig, destConfig]);
    } catch {
      // Invalid chain ID format - return defaults
      return defaultConfig;
    }
  }, [defaultConfig, sourceChainId, destChainId]);
};
