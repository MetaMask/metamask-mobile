import { ImageSourcePropType } from 'react-native';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipChainId,
} from '@metamask/utils';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../../util/networks';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../../util/networks/customNetworks';
import { TimeOption } from '../TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';

export const getCaipChainIdFromAssetId = (assetId: string): CaipChainId =>
  assetId.split('/')[0] as CaipChainId;

export const caipChainIdToHex = (caipChainId: CaipChainId): Hex => {
  const { namespace, reference } = parseCaipChainId(caipChainId);
  return namespace === 'eip155'
    ? (`0x${Number(reference).toString(16)}` as Hex)
    : (caipChainId as Hex);
};

export const getNetworkBadgeSource = (
  caipChainId: CaipChainId,
): ImageSourcePropType | undefined => {
  const hexChainId = caipChainIdToHex(caipChainId);
  if (isTestNet(hexChainId)) return getTestNetImageByChainId(hexChainId);
  const defaultNetwork = getDefaultNetworkByChainId(hexChainId) as
    | { imageSource: ImageSourcePropType }
    | undefined;
  if (defaultNetwork) return defaultNetwork.imageSource;
  const unpopularNetwork = UnpopularNetworkList.find(
    (n) => n.chainId === hexChainId,
  );
  const popularNetwork = PopularList.find((n) => n.chainId === hexChainId);
  const network = unpopularNetwork || popularNetwork;
  if (network) return network.rpcPrefs.imageSource;
  if (isCaipChainId(caipChainId))
    return getNonEvmNetworkImageSourceByChainId(caipChainId);
  const customNetworkImg = CustomNetworkImgMapping[hexChainId];
  if (customNetworkImg) return customNetworkImg as ImageSourcePropType;
  return undefined;
};

/**
 * Formats a number as compact USD currency string
 * @param value - The number to format
 * @returns Formatted string (e.g., "$13B", "$34.2M", "$850.5K", "$532.50")
 */
export function formatCompactUSD(value: number): string {
  const num = Number(value);
  if (isNaN(num)) return 'Invalid number';

  const absNum = Math.abs(num);
  let formatted: string;

  if (absNum >= 1_000_000_000) {
    formatted = `$${(num / 1_000_000_000).toFixed(0)}B`; // e.g. 13B
  } else if (absNum >= 1_000_000) {
    formatted = `$${(num / 1_000_000).toFixed(1)}M`; // e.g. 34.2M
  } else if (absNum >= 1_000) {
    formatted = `$${(num / 1_000).toFixed(1)}K`; // e.g. 850.5K
  } else {
    formatted = `$${num.toFixed(2)}`; // e.g. 532.50
  }

  return formatted;
}

/**
 * Formats market cap and volume as a combined string
 * Shows dash for zero values
 * @param marketCap - Market capitalization value
 * @param volume - Trading volume value
 * @returns Formatted string (e.g., "$13B cap • $34.2M vol" or "— cap • — vol" for zeros)
 */
export function formatMarketStats(marketCap: number, volume: number): string {
  const capStr = marketCap === 0 ? '-' : formatCompactUSD(marketCap);
  const volStr = volume === 0 ? '-' : formatCompactUSD(volume);
  return `${capStr} cap • ${volStr} vol`;
}

/**
 * Maps TimeOption to the corresponding priceChangePct field key
 */
export const getPriceChangeFieldKey = (
  timeOption: TimeOption,
): 'h24' | 'h6' | 'h1' | 'm5' => {
  switch (timeOption) {
    case TimeOption.TwentyFourHours:
      return 'h24';
    case TimeOption.SixHours:
      return 'h6';
    case TimeOption.OneHour:
      return 'h1';
    case TimeOption.FiveMinutes:
      return 'm5';
    default:
      return 'h24';
  }
};
