import React from 'react';
import { useSelector } from 'react-redux';
import { QuoteRowProps, QuoteRowView } from './QuoteRow';
import { selectDestToken } from '../../../../../core/redux/slices/bridge';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';

interface Props {
  data: QuoteRowProps[];
}

export const QuoteList = ({ data }: Props) => {
  const destToken = useSelector(selectDestToken);
  const evmMultiChainMarketData = useSelector(selectTokenMarketData);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);

  let nonEvmMultichainAssetRates = {};
  nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);

  return data.map(({ provider, ...quote }) => (
    <QuoteRowView
      key={quote.quoteRequestId}
      {...quote}
      providerName={provider.name}
      formattedReceiveAmountFiat={getDisplayCurrencyValue({
        token: destToken,
        amount: quote.receiveAmount,
        evmMultiChainMarketData,
        networkConfigurationsByChainId,
        evmMultiChainCurrencyRates,
        currentCurrency,
        nonEvmMultichainAssetRates,
      })}
      destTokenSymbol={destToken?.symbol}
    />
  ));
};
