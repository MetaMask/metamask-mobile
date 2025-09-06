import { useSelector } from 'react-redux';
import { TokenI } from '../types';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain/multichain';
import { CaipAssetType, Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';

/**
 * Returns the 1 day price percentage change for a given asset.
 * @param asset - The asset to get the price percentage change for.
 * @returns The price percentage change for the asset.
 */
export const useTokenPricePercentageChange = (
  asset?: TokenI,
): number | undefined => {
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
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

  if (isMultichainAccountsState2Enabled) {
    return (
      allMultichainAssetsRates?.[asset?.address as CaipAssetType]?.marketData
        ?.pricePercentChange?.P1D ?? evmPricePercentChange1d
    );
  }
  if (isEvmNetworkSelected) {
    return evmPricePercentChange1d;
  }
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  return allMultichainAssetsRates?.[asset?.address as CaipAssetType]?.marketData
    ?.pricePercentChange?.P1D;
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
};
