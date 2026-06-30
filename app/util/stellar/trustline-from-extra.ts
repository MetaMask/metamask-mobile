///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { XlmScope } from '@metamask/keyring-api';
import {
  parseCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import type { StellarBalanceExtra } from './types';

function isStellarTrustlineInactiveFromExtra(
  extra: StellarBalanceExtra | undefined,
): boolean {
  if (extra?.limit === undefined) {
    return true;
  }

  const { limit } = extra;
  if (typeof limit !== 'string') {
    return true;
  }

  const parsed = Number.parseFloat(limit);
  if (Number.isNaN(parsed)) {
    return true;
  }

  return parsed <= 0;
}

function isStellarChainId(chainId: CaipChainId | string): boolean {
  return chainId === XlmScope.Pubnet || chainId === XlmScope.Testnet;
}

function isStellarClassicAssetCaip19(assetId: CaipAssetType): boolean {
  try {
    const parsed = parseCaipAssetType(assetId);
    return (
      isStellarChainId(parsed.chainId) && parsed.assetNamespace === 'asset'
    );
  } catch {
    return false;
  }
}

/**
 * Whether a token row should show Stellar classic trustline-inactive UX.
 */
export function isStellarClassicTrustlineInactiveForDisplay(options: {
  chainId: CaipChainId | string;
  assetId?: CaipAssetType | string;
  isNative?: boolean;
  accountAssetInfo?: StellarBalanceExtra;
  balance?: string;
}): boolean {
  const { chainId, assetId, isNative, accountAssetInfo, balance } = options;

  if (isNative || !assetId || !isStellarChainId(chainId)) {
    return false;
  }

  if (!isStellarClassicAssetCaip19(assetId as CaipAssetType)) {
    return false;
  }

  if (accountAssetInfo !== undefined) {
    return isStellarTrustlineInactiveFromExtra(accountAssetInfo);
  }

  if (balance !== undefined) {
    const parsedBalance = Number.parseFloat(balance);
    if (!Number.isNaN(parsedBalance) && parsedBalance > 0) {
      return false;
    }
  }

  return true;
}

export function isStellarSep41Asset(
  assetId: CaipAssetType | string | undefined,
): boolean {
  if (!assetId) {
    return false;
  }

  try {
    return (
      parseCaipAssetType(assetId as CaipAssetType).assetNamespace === 'sep41'
    );
  } catch {
    return false;
  }
}
///: END:ONLY_INCLUDE_IF
