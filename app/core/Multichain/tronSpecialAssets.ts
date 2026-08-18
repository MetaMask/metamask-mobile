import {
  type CaipAssetType,
  type CaipChainId,
  isCaipAssetType,
  KnownCaipNamespace,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';

/**
 * Semantic keys for Tron Snap synthetic assets (resources + staking state).
 * Matches {@link TronSpecialAssetsMap} in the assets-list selector, minus
 * the computed `totalStakedTrx` field.
 */
export const TRON_SPECIAL_ASSET_REFERENCE_TO_KEY = {
  energy: 'energy',
  bandwidth: 'bandwidth',
  'maximum-energy': 'maxEnergy',
  'maximum-bandwidth': 'maxBandwidth',
  '195-staked-for-energy': 'stakedTrxForEnergy',
  '195-staked-for-bandwidth': 'stakedTrxForBandwidth',
  '195-ready-for-withdrawal': 'trxReadyForWithdrawal',
  '195-staking-rewards': 'trxStakingRewards',
  '195-in-lock-period': 'trxInLockPeriod',
} as const;

export type TronSpecialAssetMapKey =
  (typeof TRON_SPECIAL_ASSET_REFERENCE_TO_KEY)[keyof typeof TRON_SPECIAL_ASSET_REFERENCE_TO_KEY];

const TRON_SPECIAL_ASSET_UNITS: Record<TronSpecialAssetMapKey, string> = {
  energy: 'ENERGY',
  bandwidth: 'BANDWIDTH',
  maxEnergy: 'ENERGY',
  maxBandwidth: 'BANDWIDTH',
  stakedTrxForEnergy: 'TRX',
  stakedTrxForBandwidth: 'TRX',
  trxReadyForWithdrawal: 'TRX',
  trxStakingRewards: 'TRX',
  trxInLockPeriod: 'TRX',
};

/**
 * Maps a CAIP-19 asset ID to its Tron special-asset key.
 *
 * Matching is by chain namespace `tron`, asset namespace `slip44`, and the
 * asset reference (e.g. `195-staked-for-energy`). Chain reference may be
 * decimal (`728126428`) or hex (`0x2b6653dc`). Native TRX (`slip44:195`)
 * does not match.
 */
export const getTronSpecialAssetMapKey = (
  assetId: string | undefined,
): TronSpecialAssetMapKey | undefined => {
  if (!assetId || !isCaipAssetType(assetId)) {
    return undefined;
  }

  try {
    const { chain, assetNamespace, assetReference } = parseCaipAssetType(
      assetId as CaipAssetType,
    );
    if (
      chain.namespace !== KnownCaipNamespace.Tron ||
      assetNamespace !== 'slip44'
    ) {
      return undefined;
    }

    return TRON_SPECIAL_ASSET_REFERENCE_TO_KEY[
      assetReference as keyof typeof TRON_SPECIAL_ASSET_REFERENCE_TO_KEY
    ];
  } catch {
    return undefined;
  }
};

/**
 * True when `assetId` is a Tron Snap synthetic resource or staking-state
 * CAIP-19 (energy, bandwidth, staked TRX, lock period, etc.).
 *
 * Matching is by parsed CAIP-19, not an exact string catalog — hex and
 * decimal chain references both count. Symbols are not used.
 */
export const isTronSpecialAssetId = (
  assetId: string | undefined,
): assetId is string => getTronSpecialAssetMapKey(assetId) !== undefined;

export const getTronSpecialAssetUnit = (
  assetId: string | undefined,
): string | undefined => {
  const key = getTronSpecialAssetMapKey(assetId);
  return key ? TRON_SPECIAL_ASSET_UNITS[key] : undefined;
};

/**
 * Normalize a Tron CAIP-2 chain id to decimal form (`tron:728126428`).
 * Hex references (`tron:0x2b6653dc`) map to the same chain. Non-Tron IDs
 * and invalid CAIP strings return `undefined`.
 */
export const toDecimalTronCaipChainId = (
  chainId: string | undefined,
): `tron:${string}` | undefined => {
  if (!chainId) {
    return undefined;
  }

  try {
    const { namespace, reference } = parseCaipChainId(chainId as CaipChainId);
    if (namespace !== KnownCaipNamespace.Tron) {
      return undefined;
    }
    if (/^0x[0-9a-fA-F]+$/u.test(reference)) {
      return `${namespace}:${Number.parseInt(
        reference,
        16,
      )}` as `tron:${string}`;
    }
    return `${namespace}:${reference}` as `tron:${string}`;
  } catch {
    return undefined;
  }
};
