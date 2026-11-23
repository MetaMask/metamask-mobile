import { useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import {
  calcTokenFiatRate,
  calcUsdAmountFromFiat,
} from '../../utils/exchange-rates';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';

export const useTokenFiatRate = (token?: BridgeToken) => {
  const evmMultiChainMarketData = useSelector(selectTokenMarketData);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  let nonEvmMultichainAssetRates = {};
  nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);

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
