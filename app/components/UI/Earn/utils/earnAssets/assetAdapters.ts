import type { Asset } from '@metamask/assets-controllers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { isCaipAssetType, type CaipAssetType, type Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { moneyFormatFiat } from '../../../Money/utils/moneyFormatFiat';
import type { TokenI } from '../../../Tokens/types';
import type {
  DiscoveryEarnAsset,
  EarnAsset,
  EarnAssetId,
  EarnAssetMetadata,
  EarnExperience,
  HeldEarnAsset,
} from '../../types/earnAssets';

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
 * Creates an Earn asset representing an asset held in the wallet.
 *
 * @param asset - AssetsController asset held in the wallet.
 * @param assetId - Canonical CAIP-19 asset ID.
 * @param experiences - Earn experiences available for the asset.
 * @returns Held Earn asset.
 */
export const createHeldEarnAsset = (
  asset: Asset,
  assetId: EarnAssetId,
  experiences: readonly EarnExperience[],
): HeldEarnAsset => ({
  kind: 'held',
  asset,
  assetId,
  experiences,
});

/**
 * Creates an Earn asset for an asset available for discovery but not held.
 *
 * @param assetId - Canonical CAIP-19 asset ID.
 * @param metadata - Asset metadata needed to display and use the asset.
 * @param experiences - Earn experiences available for the asset.
 * @returns Discovery Earn asset.
 */
export const createDiscoveryEarnAsset = (
  assetId: CaipAssetType,
  metadata: EarnAssetMetadata,
  experiences: readonly EarnExperience[],
): DiscoveryEarnAsset => ({
  kind: 'discovery',
  assetId,
  metadata,
  experiences,
});

/**
 * Gets display metadata from a held or discovery Earn asset.
 *
 * @param earnAsset - Earn asset whose metadata should be returned.
 * @returns Normalized metadata for the Earn asset.
 */
export const getEarnAssetMetadata = (
  earnAsset: EarnAsset,
): EarnAssetMetadata => {
  if (earnAsset.kind === 'discovery') {
    return earnAsset.metadata;
  }

  const { asset } = earnAsset;
  const hasAddress = 'address' in asset;

  return {
    /**
     * EVM assets have an address property, while non-EVM assets have an assetId property.
     * Tron (TRX) staking is the only Earn-eligible non-EVM asset.
     */
    address: hasAddress ? asset.address : earnAsset.assetId,
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
 * Converts an Earn asset into the token shape used by Earn screens.
 *
 * Held assets retain their wallet balance and fiat value. Discovery assets
 * receive a zero balance because they are not currently held.
 *
 * @param earnAsset - Earn asset to convert.
 * @returns Token representation of the Earn asset.
 */
export const earnAssetToToken = (earnAsset: EarnAsset): TokenI => {
  const metadata = getEarnAssetMetadata(earnAsset);
  const asset = earnAsset.kind === 'held' ? earnAsset.asset : undefined;

  return {
    ...metadata,
    balance: asset?.balance ?? '0',
    balanceFiat: asset?.fiat
      ? moneyFormatFiat(new BigNumber(asset.fiat.balance), asset.fiat.currency)
      : undefined,
  };
};
