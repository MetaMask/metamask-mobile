import {
  type CaipAssetType,
  isCaipAssetType,
  KnownCaipNamespace,
  parseCaipAssetType,
} from '@metamask/utils';
import type { TokenI } from '../../Tokens/types';
import { toDecimalTronCaipChainId } from '../../../../core/Multichain/tronSpecialAssets';

/** SLIP-44 coin type for TRX. Synthetic staking IDs use suffixes after this (e.g. `195-staked-for-energy`). */
const TRX_SLIP44_REFERENCE = '195';

export type TronNativeToken = TokenI;

type TokenWithOptionalCaipAssetId = TokenI & {
  caipAssetId?: string;
};

/**
 * True when `assetId` is native TRX CAIP-19 (`tron:<chain>/slip44:195`).
 *
 * Exact `slip44:195` only — staking/resource IDs like `slip44:195-staked-for-energy`
 * must not match. Symbols/tickers are unstable across AssetsController migrations.
 */
export const isTronNativeAssetId = (
  assetId: string | undefined,
): assetId is string => {
  if (!assetId || !isCaipAssetType(assetId)) {
    return false;
  }

  const { chain, assetNamespace, assetReference } = parseCaipAssetType(
    assetId as CaipAssetType,
  );
  return (
    chain.namespace === KnownCaipNamespace.Tron &&
    assetNamespace === 'slip44' &&
    assetReference === TRX_SLIP44_REFERENCE
  );
};

export const getTronNativeChainId = (
  token: TokenWithOptionalCaipAssetId,
): `tron:${string}` | undefined => {
  if (typeof token.chainId === 'string' && token.chainId.startsWith('tron:')) {
    return toDecimalTronCaipChainId(token.chainId);
  }

  const caipAssetId = isTronNativeAssetId(token.caipAssetId)
    ? token.caipAssetId
    : token.address;
  if (!isCaipAssetType(caipAssetId)) {
    return undefined;
  }

  const { chainId } = parseCaipAssetType(caipAssetId as CaipAssetType);
  return toDecimalTronCaipChainId(chainId);
};

/**
 * True when `token` is native TRX, identified by CAIP-19 (or CAIP-2 chainId +
 * native slip44:195), not by ticker/symbol.
 */
export const isTronNativeToken = (
  token: TokenWithOptionalCaipAssetId,
): token is TronNativeToken => {
  const hasNativeCaip =
    isTronNativeAssetId(token.address) ||
    isTronNativeAssetId(token.caipAssetId);
  const legacyChainNative =
    !token.address && token.chainId
      ? isTronNativeAssetId(`${token.chainId}/slip44:${TRX_SLIP44_REFERENCE}`)
      : false;

  return (
    (hasNativeCaip && getTronNativeChainId(token) !== undefined) ||
    legacyChainNative
  );
};
