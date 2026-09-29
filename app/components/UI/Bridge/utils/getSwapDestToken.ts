import { CaipChainId } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';
import { BridgeToken } from '../types';

/**
 * Returns the preferred swap destination token for a given chain.
 *
 * - Without `sourceAddress`: returns the chain-wide default ('*').
 * - With `sourceAddress`: returns the per-source override if one exists, or `undefined` if no explicit override is configured.
 * The chain-wide default is intentionally NOT used as a fallback so callers can distinguish a forced override from "no preference;
 * let the UI decide".
 */
export const getSwapDestToken = (
  chainId: string,
  sourceAddress?: string,
): BridgeToken | undefined => {
  const config = DefaultSwapDestTokens[chainId as Hex | CaipChainId];
  if (!config) return undefined;

  if (sourceAddress) {
    const override = Object.entries(config).find(
      ([key]) => key !== '*' && areAddressesEqual(key, sourceAddress),
    );
    return override?.[1];
  }

  return config['*'];
};
