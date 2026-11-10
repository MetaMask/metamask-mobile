import { useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';

export const useDisplayCurrencyValue = (
  amount?: string,
  token?: BridgeToken,
) => {
  const evmMultiChainMarketData = useSelector(selectTokenMarketData);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);

  let nonEvmMultichainAssetRates = {};
  nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);

  const currencyValue = getDisplayCurrencyValue({
    token,
    amount,
    evmMultiChainMarketData,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
    currentCurrency,
    nonEvmMultichainAssetRates,
  });

  return currencyValue;
};
