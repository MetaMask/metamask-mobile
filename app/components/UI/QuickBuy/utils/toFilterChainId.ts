import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';

/**
 * Converts a CAIP chain id into the chain-id format carried by QuickBuy token
 * lists: hex for EVM chains and the original CAIP id for non-EVM chains (e.g.
 * Solana). Returns `null` when the EVM hex conversion fails so callers can
 * treat it as "no matching chain".
 */
export function toFilterChainId(caip: CaipChainId): string | null {
  if (isNonEvmChainId(caip)) {
    return caip;
  }
  try {
    return formatChainIdToHex(caip);
  } catch {
    return null;
  }
}
