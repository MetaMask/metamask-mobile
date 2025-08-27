import { useSelector } from 'react-redux';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { BigNumber } from 'bignumber.js';
import { createProjectLogger } from '@metamask/utils';
import { useEffect } from 'react';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { TransactionBridgeQuote } from '../../utils/bridge';
import { useFeeCalculations } from '../gas/useFeeCalculations';

const log = createProjectLogger('transaction-pay');

export function useTransactionTotalFiat() {
  const fiatFormatter = useFiatFormatter();
  const { values: requiredFiat } = useTransactionRequiredFiat();
  const transactionMeta = useTransactionMetadataOrThrow();
  const { id: transactionId } = transactionMeta;
  const { estimatedFeeFiatPrecise } = useFeeCalculations(transactionMeta);

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const balancesToUse = requiredFiat.filter(
    (token) =>
      !quotes?.some(
        (quote) =>
          quote.quote.destAsset.address.toLowerCase() ===
          token.address.toLowerCase(),
      ),
  );

  const balanceCost = balancesToUse.reduce(
    (acc, token) => acc.plus(new BigNumber(token.amountFiat)),
    new BigNumber(0),
  );

  const quoteTotal = (quotes ?? []).reduce(
    (acc, quote) => acc.plus(getQuoteTotal(quote)),
    new BigNumber(0),
  );

  const quoteNetworkFeeTotal =
    quotes?.reduce(
      (acc, quote) => acc.plus(getQuoteGasAndRelayFee(quote)),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  const total = quoteTotal.plus(balanceCost);
  const value = total.toString(10);
  const formatted = fiatFormatter(total);

  const totalNetworkFee = quoteNetworkFeeTotal.plus(
    new BigNumber(estimatedFeeFiatPrecise ?? 0),
  );

  const totalNetworkFeeFormatted = fiatFormatter(totalNetworkFee);

  useEffect(() => {
    log('Total fiat', {
      balances: balanceCost.toString(10),
      quotes: quoteTotal.toString(10),
      networkFees: totalNetworkFeeFormatted,
      total: formatted,
    });
  }, [balanceCost, formatted, quoteTotal, totalNetworkFeeFormatted, value]);

  return {
    value,
    formatted,
    totalGasFormatted: totalNetworkFeeFormatted,
  };
}

function getQuoteTotal(quote: TransactionBridgeQuote): BigNumber {
  const networkFee = getQuoteGasAndRelayFee(quote);
  const sourceAmount = new BigNumber(quote.sentAmount?.valueInCurrency ?? 0);

  return sourceAmount.plus(networkFee);
}

function getQuoteGasAndRelayFee(quote: TransactionBridgeQuote): BigNumber {
  return new BigNumber(quote.totalMaxNetworkFee?.valueInCurrency ?? 0);
}
