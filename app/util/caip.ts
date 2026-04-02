import { parseCaipChainId, type CaipChainId, type Hex } from '@metamask/utils';

/**
 * Converts a CAIP chain ID (e.g. "eip155:1") to a hex chain ID (e.g. "0x1").
 * For non-EVM chains the CAIP chain ID is returned as-is cast to Hex.
 */
export const caipChainIdToHex = (caipChainId: CaipChainId): Hex => {
  const { namespace, reference } = parseCaipChainId(caipChainId);
  return namespace === 'eip155'
    ? (`0x${Number(reference).toString(16)}` as Hex)
    : (caipChainId as Hex);
};
