import { useSelector } from 'react-redux';
import { TokenI } from '../types';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain/multichain';
import { CaipAssetType, Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

/**
 * Returns the 1 day price percentage change for a given asset.
 * @param asset - The asset to get the price percentage change for.
 * @returns The price percentage change for the asset.
 */
export const useTokenPricePercentageChange = (
  asset?: TokenI,
): number | undefined => {
  const multiChainMarketData = useSelector(selectTokenMarketData);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const allMultichainAssetsRates = useSelector(selectMultichainAssetsRates);
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  const tokenPercentageChange = asset?.address
    ? multiChainMarketData?.[asset?.chainId as Hex]?.[asset.address as Hex]
        ?.pricePercentChange1d
    : undefined;
  const evmPricePercentChange1d = asset?.isNative
    ? multiChainMarketData?.[asset?.chainId as Hex]?.[
        getNativeTokenAddress(asset?.chainId as Hex) as Hex
      ]?.pricePercentChange1d
    : tokenPercentageChange;

  return (
    allMultichainAssetsRates?.[asset?.address as CaipAssetType]?.marketData
      ?.pricePercentChange?.P1D ?? evmPricePercentChange1d
  );
};
