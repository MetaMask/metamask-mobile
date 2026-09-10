import type { Asset } from '@metamask/assets-controllers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { isCaipAssetType, type CaipAssetType, type Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import type { BridgeToken } from '../../../Bridge/types';
import { convertApiTokenToBridgeToken } from '../../../Bridge/utils/tokenUtils';
import { moneyFormatFiat } from '../../../Money/utils/moneyFormatFiat';
import type { TokenI } from '../../../Tokens/types';
import type {
  EarnAsset,
  EarnAssetId,
  EarnAssetMetadata,
  EarnExperience,
} from '../../types/earnAssets';
import { requireTrackedEarnAsset } from './requireTrackedEarnAsset';

/**
 * Gets canonical CAIP-19 asset ID for an AssetsController asset.
 *
 * @param asset - AssetsController asset to identify.
 * @returns Canonical asset ID, or undefined when asset chain/address data is unsupported.
 */
export const getAssetEarnId = (asset: Asset): EarnAssetId | undefined => {
  if (isCaipAssetType(asset.assetId)) {
    return asset.assetId.toLowerCase() as EarnAssetId;
  }

  if (!asset.chainId.startsWith('0x') || !('address' in asset)) {
    return undefined;
  }

  if (asset.isNative) {
    try {
      return formatAddressToAssetId(
        asset.address,
        asset.chainId as Hex,
      )?.toLowerCase() as EarnAssetId | undefined;
    } catch {
      return undefined;
    }
  }

  return buildEvmCaip19AssetId(
    asset.address,
    asset.chainId as Hex,
  ).toLowerCase() as EarnAssetId;
};

/**
 * Normalizes AssetsController metadata for the Earn catalogue.
 *
 * @param asset - AssetsController asset to normalize.
 * @param assetId - Canonical CAIP-19 asset ID.
 * @returns Metadata shared by all Earn asset consumers.
 */
const createTrackedEarnAssetMetadata = (
  asset: Asset,
  assetId: EarnAssetId,
): EarnAssetMetadata => {
  const hasAddress = 'address' in asset;

  return {
    /**
     * EVM assets have an address property, while non-EVM assets have an assetId property.
     * Tron (TRX) staking is the only Earn-eligible non-EVM asset.
     */
    address: hasAddress ? asset.address : assetId,
    chainId: asset.chainId,
    decimals: asset.decimals,
    image: asset.image,
    name: asset.name,
    symbol: asset.symbol,
    ticker: asset.symbol,
    logo: asset.image,
    isNative: asset.isNative,
    isStaked: false,
    isETH:
      asset.accountType.startsWith('eip155') &&
      asset.chainId === CHAIN_IDS.MAINNET &&
      asset.isNative &&
      asset.symbol === 'ETH',
  };
};

/**
 * Creates an Earn asset tracked by the selected account wallet.
 *
 * @param asset - AssetsController asset tracked by the wallet.
 * @param assetId - Canonical CAIP-19 asset ID.
 * @param experiences - Earn experiences associated with the asset.
 * @returns Normalized tracked Earn asset.
 */
export const createTrackedEarnAsset = (
  asset: Asset,
  assetId: EarnAssetId,
  experiences: readonly EarnExperience[],
): EarnAsset => ({
  assetId,
  metadata: createTrackedEarnAssetMetadata(asset, assetId),
  wallet: {
    status: 'tracked',
    asset,
  },
  experiences,
});

/**
 * Creates an Earn asset not tracked by the selected account wallet.
 *
 * @param assetId - Canonical CAIP-19 asset ID.
 * @param metadata - Asset metadata needed to display and use the asset.
 * @param experiences - Earn experiences associated with the asset.
 * @returns Normalized untracked Earn asset.
 */
export const createUntrackedEarnAsset = (
  assetId: CaipAssetType,
  metadata: EarnAssetMetadata,
  experiences: readonly EarnExperience[],
): EarnAsset => ({
  assetId,
  metadata,
  wallet: {
    status: 'untracked',
  },
  experiences,
});

/**
 * Converts an Earn asset into the token shape used by Earn screens.
 *
 * @param earnAsset - Earn asset to convert.
 * @returns Token representation of the Earn asset.
 * @throws When the operation receives an untracked asset.
 */
export const earnAssetToToken = (earnAsset: EarnAsset): TokenI => {
  const asset = requireTrackedEarnAsset(earnAsset, 'Earn token conversion');

  return {
    ...earnAsset.metadata,
    balance: asset.balance,
    balanceFiat: asset.fiat
      ? moneyFormatFiat(new BigNumber(asset.fiat.balance), asset.fiat.currency)
      : undefined,
  };
};

/**
 * Converts an Earn asset into the token shape used by unified Swap.
 *
 * @param earnAsset - Earn asset to convert.
 * @returns Bridge token with chain-specific address formatting.
 */
export const earnAssetToBridgeToken = (earnAsset: EarnAsset): BridgeToken => {
  const { metadata } = earnAsset;

  return convertApiTokenToBridgeToken(
    {
      assetId: earnAsset.assetId,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      iconUrl: metadata.image,
    },
    metadata.image,
  );
};
