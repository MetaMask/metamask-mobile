import { useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import {
  calcTokenFiatRate,
  calcUsdAmountFromFiat,
} from '../../utils/exchange-rates';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)

export const useTokenFiatRate = (token?: BridgeToken) => {
  const evmMultiChainMarketData = useSelector(selectTokenMarketData);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  let nonEvmMultichainAssetRates = {};
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  return calcTokenFiatRate({
    token,
    evmMultiChainMarketData,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
    nonEvmMultichainAssetRates,
  });
};

/**
 * Gets the rate of one token in USD, independently of the selected display
 * currency.
 *
 * @param token - Token whose USD rate is resolved.
 * @returns The numeric USD rate, or undefined when price data is unavailable.
 */
export const useTokenUsdRate = (token?: BridgeToken) => {
  const tokenFiatRate = useTokenFiatRate(token);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  if (tokenFiatRate === undefined) {
    return undefined;
  }

  return calcUsdAmountFromFiat({
    tokenFiatValue: tokenFiatRate,
    chainId: token?.chainId,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
  });
};
