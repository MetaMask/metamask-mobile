import { useMemo, useState } from 'react';
import {
  Hex,
  KnownCaipNamespace,
  parseCaipChainId,
  type CaipChainId,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';

/**
 * Local, Redux-free network filter for a list (Tokens, NFTs, DeFi). `null`
 * means "all popular networks". Selecting an already-added network here
 * never touches NetworkEnablementController - see NetworkMultiSelector's
 * `onLocalNetworkSelect`.
 */
export const useLocalNetworkFilter = () => useState<CaipChainId[] | null>(null);

/**
 * Narrows a local network filter (or "all popular networks" when `null`)
 * down to Hex EVM chain IDs, for consumers that are EVM-only (e.g.
 * NftDetectionController, DeFi positions).
 */
export const useEvmChainIdsForLocalFilter = (
  networkFilter: CaipChainId[] | null,
): Hex[] => {
  const { popularEvmNetworks } = useNetworkEnablement();

  return useMemo(() => {
    if (!networkFilter) {
      return popularEvmNetworks;
    }
    return networkFilter
      .filter(
        (id) => parseCaipChainId(id).namespace === KnownCaipNamespace.Eip155,
      )
      .map((id) => toHex(parseCaipChainId(id).reference));
  }, [networkFilter, popularEvmNetworks]);
};

/**
 * Resolves a local network filter (or "all popular networks" when `null`)
 * down to the CAIP chain IDs to query, for multichain-aware consumers (e.g.
 * the tokens and NFTs lists) that aren't EVM-only.
 */
export const useChainIdsForLocalFilter = (
  networkFilter: CaipChainId[] | null,
): CaipChainId[] => {
  const { popularNetworks } = useNetworkEnablement();

  return useMemo(
    () => networkFilter ?? popularNetworks,
    [networkFilter, popularNetworks],
  );
};
