import { useSelector } from 'react-redux';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { BigNumber } from 'bignumber.js';
import { Hex, createProjectLogger } from '@metamask/utils';
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

  const quoteFeeTotal =
    quotes?.reduce(
      (acc, quote) => acc.plus(getQuoteSourceFee(quote)),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  const totalNetworkFee = quoteNetworkFeeTotal.plus(
    new BigNumber(estimatedFeeFiatPrecise ?? 0),
  );

  const dustTotal =
    quotes?.reduce(
      (acc, quote) => acc.plus(getQuoteDust(quote, requiredFiat)),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  const total = quoteTotal.plus(balanceCost).minus(dustTotal);
  const value = total.toString(10);
  const formatted = fiatFormatter(total);

  const totalNetworkFeeFormatted = fiatFormatter(totalNetworkFee);
  const bridgeFeeFormatted = fiatFormatter(quoteFeeTotal);
  const balanceCostString = balanceCost.toString(10);
  const quoteTotalString = quoteTotal.toString(10);
  const dustTotalString = dustTotal.toString(10);

  useEffect(() => {
    log('Total fiat', {
      balances: balanceCostString,
      bridgeFees: bridgeFeeFormatted,
      dust: dustTotalString,
      networkFees: totalNetworkFeeFormatted,
      quotes: quoteTotalString,
      total: formatted,
    });
  }, [
    balanceCostString,
    bridgeFeeFormatted,
    dustTotalString,
    formatted,
    quoteTotalString,
    totalNetworkFeeFormatted,
    value,
  ]);

  return {
    bridgeFeeFormatted,
    formatted,
    quoteNetworkFee: quoteNetworkFeeTotal.toString(10),
    totalGasFormatted: totalNetworkFeeFormatted,
    value,
  };
}

function getQuoteTotal(quote: TransactionBridgeQuote): BigNumber {
  return getQuoteSourceAmount(quote).plus(getQuoteGasAndRelayFee(quote));
}

function getQuoteSourceAmount(quote: TransactionBridgeQuote): BigNumber {
  return new BigNumber(quote.sentAmount?.valueInCurrency ?? 0);
}

function getQuoteGasAndRelayFee(quote: TransactionBridgeQuote): BigNumber {
  return new BigNumber(quote.totalMaxNetworkFee?.valueInCurrency ?? 0);
}

function getQuoteSourceFee(quote: TransactionBridgeQuote): BigNumber {
  return getQuoteSourceAmount(quote).minus(
    quote.toTokenAmount?.valueInCurrency ?? 0,
  );
}

function getQuoteDust(
  quote: TransactionBridgeQuote,
  requiredFiat: { address: Hex; amountHumanOriginal: string }[],
): BigNumber {
  const targetAmount = quote.toTokenAmount?.valueInCurrency ?? '0';

  const requiredAmount = requiredFiat.find(
    (token) =>
      token.address.toLowerCase() ===
      quote.quote.destAsset.address.toLowerCase(),
  )?.amountHumanOriginal;

  if (!requiredAmount) {
    return new BigNumber(0);
  }

  return new BigNumber(targetAmount).minus(requiredAmount);
}
