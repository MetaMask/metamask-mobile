import { useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import { calcTokenFiatRate } from '../../utils/exchange-rates';
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
