import { useSelector } from 'react-redux';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { RootState } from '../../../../../reducers';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { BigNumber } from 'bignumber.js';
import { createProjectLogger } from '@metamask/utils';
import { useEffect } from 'react';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';

const log = createProjectLogger('transaction-pay');

export function useTransactionTotalFiat() {
  const gasCost = useGasCost();
  const quotesGasCost = useQuotesGasCost();
  const fiatFormatter = useFiatFormatter();
  const { totalWithBalanceFiat: quotesCost } = useTransactionRequiredFiat();

  const value = gasCost + quotesGasCost + quotesCost;
  const formatted = fiatFormatter(new BigNumber(value));

  useEffect(() => {
    log('Total fiat', {
      gasCost,
      quotesGasCost,
      quotesCost,
      value,
      formatted,
    });
  }, [gasCost, quotesGasCost, quotesCost, value, formatted]);

  return {
    value,
    formatted,
  };
}

function useQuotesGasCost() {
  const { id: transactionId } = useTransactionMetadataOrThrow();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  return (quotes ?? []).reduce((acc, quote) => {
    const value = new BigNumber(quote.totalMaxNetworkFee.valueInCurrency ?? 0);
    return acc + (value.isNaN() ? 0 : value.toNumber());
  }, 0);
}

function useGasCost() {
  const tokens = useTransactionRequiredTokens();
  const { chainId } = useTransactionMetadataOrThrow();

  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );

  const nativeToken = tokens.find(
    (token) =>
      token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase(),
  );

  const gasCost = useTransactionMaxGasCost() ?? '0x0';

  if (nativeToken) {
    return 0;
  }

  return new BigNumber(gasCost, 16)
    .shiftedBy(-18)
    .multipliedBy(new BigNumber(conversionRate ?? 1))
    .toNumber();
}
