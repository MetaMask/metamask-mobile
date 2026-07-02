import { useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import { calcTokenFiatRate } from '../../utils/exchange-rates';
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
