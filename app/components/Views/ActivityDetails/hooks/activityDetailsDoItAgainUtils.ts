import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import type { BridgeToken } from '../../../UI/Bridge/types';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses Bridge token helpers for "swap again"; route-isolation backlog */
import { getTokenIconUrl } from '../../../UI/Bridge/utils';
import { normalizeTokenAddress } from '../../../UI/Bridge/utils/tokenUtils';
/* eslint-enable import-x/no-restricted-paths */
import type { TokenAmount } from '../../../../util/activity-adapters';
import {
  getAssetIdCaipChainId,
  getAssetIdNamespaceAndReference,
} from '../activityAssetId';

export function getActivityTokenCaipChainId(
  token: TokenAmount | undefined,
  fallbackCaipChainId: CaipChainId,
): CaipChainId {
  return getAssetIdCaipChainId(token?.assetId) ?? fallbackCaipChainId;
}

export function getActivityTokenAddress(token: TokenAmount | undefined) {
  const { namespace, reference } = getAssetIdNamespaceAndReference(
    token?.assetId,
  );

  // Native assets (`slip44:`/`native:`) have no contract address — the reference
  // is the coin type, not an address. Return undefined so callers fall back to
  // the native swaps sentinel rather than treating the coin type as an address.
  if (namespace === 'slip44' || namespace === 'native') {
    return undefined;
  }

  return reference ?? undefined;
}

export function toBridgeToken(
  token: TokenAmount | undefined,
  fallbackCaipChainId: CaipChainId,
): BridgeToken | undefined {
  const symbol = token?.symbol;
  const decimals = token?.decimals;
  const address = getActivityTokenAddress(token);

  if (!symbol || decimals === undefined) {
    return undefined;
  }

  const chainId = getActivityTokenCaipChainId(token, fallbackCaipChainId);
  const image = token?.assetId
    ? getTokenIconUrl(token.assetId as CaipAssetType, isNonEvmChainId(chainId))
    : undefined;
  const rawAddress = address ?? NATIVE_SWAPS_TOKEN_ADDRESS;
  const normalizedAddress = isNonEvmChainId(chainId)
    ? rawAddress
    : normalizeTokenAddress(rawAddress, formatChainIdToHex(chainId));

  return {
    address: normalizedAddress,
    symbol,
    decimals,
    chainId,
    ...(image ? { image } : {}),
  };
}
