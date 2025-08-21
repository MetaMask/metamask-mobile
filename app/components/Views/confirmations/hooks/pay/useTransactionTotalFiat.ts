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

  const quotesCost = (quotes ?? []).reduce(
    (acc, quote) => acc.plus(getQuoteCostFiat(quote)),
    new BigNumber(0),
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

  const quoteGasCost =
    quotes?.reduce(
      (acc, quote) =>
        acc.plus(new BigNumber(quote.totalMaxNetworkFee.valueInCurrency ?? 0)),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  const total = quotesCost.plus(balanceCost);
  const value = total.toString(10);
  const formatted = fiatFormatter(total);

  const totalGas = quoteGasCost.plus(
    new BigNumber(estimatedFeeFiatPrecise ?? 0),
  );

  const totalGasFormatted = fiatFormatter(totalGas);

  useEffect(() => {
    log('Total fiat', {
      balanceCost: balanceCost.toString(10),
      quotesCost: quotesCost.toString(10),
      formatted,
      value,
    });
  }, [balanceCost, quotesCost, formatted, value]);

  return {
    value,
    formatted,
    totalGasFormatted,
  };
}

function getQuoteCostFiat(quote: TransactionBridgeQuote): BigNumber {
  const gasCost = new BigNumber(quote.totalMaxNetworkFee?.valueInCurrency ?? 0);
  const cost = new BigNumber(quote.cost?.valueInCurrency ?? 0);
  const amount = new BigNumber(quote.adjustedReturn?.valueInCurrency ?? 0);

  return amount.plus(gasCost).plus(cost);
}
