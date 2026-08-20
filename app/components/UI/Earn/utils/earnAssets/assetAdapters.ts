import type { Asset } from '@metamask/assets-controllers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { isCaipAssetType, type CaipAssetType, type Hex } from '@metamask/utils';
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

// TODO: Add jsdoc for functions in this file.
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
      asset.isNative &&
      asset.symbol === 'ETH',
  };
};

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
