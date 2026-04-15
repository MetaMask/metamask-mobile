import { useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)

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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

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
