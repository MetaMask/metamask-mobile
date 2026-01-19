import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceToken,
  selectSourceAmount,
} from '../../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
import { calcTokenFiatValue } from '../../utils/exchange-rates';

export const useUnifiedSwapBridgeContext = () => {
  const smartTransactionsEnabled = useSelector(selectShouldUseSmartTransaction);
  const fromToken = useSelector(selectSourceToken);
  const toToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);

  const evmMultiChainMarketData = useSelector(selectTokenMarketData);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);

  const usdConversionRate = evmMultiChainCurrencyRates?.usd?.conversionRate;
  const tokenFiatValue = useMemo(
    () =>
      calcTokenFiatValue({
        token: fromToken ?? undefined,
        amount: sourceAmount,
        evmMultiChainMarketData,
        networkConfigurationsByChainId,
        evmMultiChainCurrencyRates,
        nonEvmMultichainAssetRates,
      }),
    [
      fromToken,
      sourceAmount,
      evmMultiChainMarketData,
      networkConfigurationsByChainId,
      evmMultiChainCurrencyRates,
      nonEvmMultichainAssetRates,
    ],
  );

  const usdAmountSource = usdConversionRate
    ? tokenFiatValue / usdConversionRate
    : 0;

  return useMemo(
    () => ({
      stx_enabled: smartTransactionsEnabled,
      token_symbol_source: fromToken?.symbol ?? '',
      token_symbol_destination: toToken?.symbol ?? '',
      security_warnings: [], // TODO
      warnings: [], // TODO
      usd_amount_source: usdAmountSource,
    }),
    [smartTransactionsEnabled, fromToken, toToken, usdAmountSource],
  );
};
