import { useSelector } from 'react-redux';
import {
  getNativeTokenAddress,
  type TokenRatesControllerState,
} from '@metamask/assets-controllers';
import { CaipAssetType, Hex } from '@metamask/utils';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain/multichain';
import type { TokenI } from '../types';

export type TokenPricePercentageChangeAsset = Pick<
  TokenI,
  'address' | 'chainId' | 'isNative'
>;

/** Multichain conversion rates slice used for `P1D` (matches non-EVM balance-change path). */
export type MultichainRatesForPriceChange = Record<
  string,
  { marketData?: { pricePercentChange?: { P1D?: number } } }
>;

/**
 * 1d price % change from the same sources as the token list (`TokenListItem`).
 * Pure helper so balance breakdown and other non-hook code can reuse the logic.
 */
export function getTokenPricePercentChange1d(
  asset: TokenPricePercentageChangeAsset | undefined,
  multiChainMarketData:
    | TokenRatesControllerState['marketData']
    | undefined
    | null,
  allMultichainAssetsRates?: MultichainRatesForPriceChange | null,
): number | undefined {
  if (!asset?.chainId) {
    return undefined;
  }

  const tokenPercentageChange = asset.address
    ? multiChainMarketData?.[asset.chainId as Hex]?.[asset.address as Hex]
        ?.pricePercentChange1d
    : undefined;
  const evmPricePercentChange1d = asset.isNative
    ? multiChainMarketData?.[asset.chainId as Hex]?.[
        getNativeTokenAddress(asset.chainId as Hex) as Hex
      ]?.pricePercentChange1d
    : tokenPercentageChange;

  const multichainP1d =
    allMultichainAssetsRates?.[asset.address as CaipAssetType]?.marketData
      ?.pricePercentChange?.P1D;

  return multichainP1d ?? evmPricePercentChange1d;
}

/**
 * Returns the 1 day price percentage change for a given asset.
 * @param asset - The asset to get the price percentage change for.
 * @returns The price percentage change for the asset.
 */
export const useTokenPricePercentageChange = (
  asset?: TokenPricePercentageChangeAsset,
): number | undefined => {
  const multiChainMarketData = useSelector(selectTokenMarketData);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const allMultichainAssetsRates = useSelector(selectMultichainAssetsRates);
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  return getTokenPricePercentChange1d(
    asset,
    multiChainMarketData,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    allMultichainAssetsRates,
    ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  );
};
