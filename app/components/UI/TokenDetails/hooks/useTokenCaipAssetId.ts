import { formatAddressToAssetId } from '@metamask/bridge-controller';
import {
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  type SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { isCaipAssetType, type CaipAssetType } from '@metamask/utils';
import { useMemo } from 'react';
import type { TokenDetailsRouteParams } from '../constants/constants';

/**
 * Resolves the CAIP-19 asset id for a Token Details route param, preferring the
 * id supplied at navigation time and falling back to deriving one from the
 * token address and chain id.
 *
 * Returns `null` when no id can be resolved.
 */
export const useTokenCaipAssetId = (
  token: Pick<TokenDetailsRouteParams, 'caipAssetId' | 'address' | 'chainId'>,
): CaipAssetType | null =>
  useMemo((): CaipAssetType | null => {
    try {
      if (token.caipAssetId && isCaipAssetType(token.caipAssetId)) {
        return token.caipAssetId;
      }
      if (isCaipAssetType(token.address)) {
        return token.address as CaipAssetType;
      }
      if (!token.chainId) return null;
      const formatted = formatAddressToAssetId(token.address, token.chainId);
      if (formatted) return formatted as CaipAssetType;
      // For non-EVM native tokens (e.g. Bitcoin), formatAddressToAssetId returns
      // undefined for addresses like "native". Fall back to the chain's native
      // currency CAIP-19 id from the multichain network configurations.
      const nonEvmConfig =
        AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[
          token.chainId as SupportedCaipChainId
        ];
      return (nonEvmConfig?.nativeCurrency as CaipAssetType) ?? null;
    } catch {
      return null;
    }
  }, [token.caipAssetId, token.address, token.chainId]);
