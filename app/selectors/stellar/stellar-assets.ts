import type { CaipAssetType } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { createSelectorCreator, lruMemoize } from 'reselect';
import {
  getNativeAssetInfoForAsset,
  getTrustlineAssetInfoForAsset,
  type StellarAssetsControllerState,
} from '../../core/Engine/controllers/stellar-assets-controller/stellar-assets-controller';
import { isSupportBaseReserve } from '../../util/multichain/spendable-balance';
import { RootState } from '../../reducers';

const ACCOUNT_ASSET_LRU_CACHE_SIZE = 50;

const createParameterizedSelector = createSelectorCreator(lruMemoize, {
  maxSize: ACCOUNT_ASSET_LRU_CACHE_SIZE,
});

type StellarAssetsSelectorState =
  | Pick<RootState, 'engine'>
  | {
      engine?: {
        backgroundState?: {
          StellarAssetsController?: Pick<
            StellarAssetsControllerState,
            'accountAssets'
          >;
        };
      };
    };

function getStellarAccountAssets(
  state: StellarAssetsSelectorState,
): StellarAssetsControllerState['accountAssets'] {
  return (
    state.engine?.backgroundState?.StellarAssetsController?.accountAssets ?? {}
  );
}

function isValidNumberString(value?: string): boolean {
  if (value === undefined) {
    return false;
  }
  try {
    const parsed = new BigNumber(value);
    return parsed.isFinite() && !parsed.isNegative();
  } catch {
    return false;
  }
}

function resolveBaseReserve(
  assetId: string,
  nativeAssetInfo: ReturnType<typeof getNativeAssetInfoForAsset>,
): string | undefined {
  if (!isSupportBaseReserve(assetId)) {
    return undefined;
  }

  return isValidNumberString(nativeAssetInfo?.baseReserve)
    ? nativeAssetInfo?.baseReserve
    : '0';
}

/**
 * Returns the base reserve for a Stellar native asset that supports reserve balance display.
 */
export const getStellarBaseReserveForAccountAsset = createParameterizedSelector(
  getStellarAccountAssets,
  (_state: StellarAssetsSelectorState, accountId: string) => accountId,
  (
    _state: StellarAssetsSelectorState,
    _accountId: string,
    assetId: CaipAssetType,
  ) => assetId,
  (accountAssets, accountId, assetId) =>
    resolveBaseReserve(
      assetId,
      getNativeAssetInfoForAsset(assetId, accountAssets[accountId]?.[assetId]),
    ),
);

/**
 * Returns Stellar trustline metadata for an account/asset pair.
 */
export const getStellarTrustlineAssetInfoForAccount =
  createParameterizedSelector(
    getStellarAccountAssets,
    (_state: StellarAssetsSelectorState, accountId: string) => accountId,
    (
      _state: StellarAssetsSelectorState,
      _accountId: string,
      assetId: CaipAssetType,
    ) => assetId,
    (accountAssets, accountId, assetId) =>
      getTrustlineAssetInfoForAsset(
        assetId,
        accountAssets[accountId]?.[assetId],
      ),
  );
