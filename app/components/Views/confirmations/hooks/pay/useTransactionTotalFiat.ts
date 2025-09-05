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
import { useDeepMemo } from '../useDeepMemo';

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

  const result = {
    ...getBridgeFeeTotal(quotes, fiatFormatter),
    ...getEstimatedNetworkFeeTotal(quotes, fiatFormatter),
    ...getMaxNetworkFeeTotal(quotes, fiatFormatter),
    ...getEstimatedNativeTotal(quotes, estimatedFeeFiatPrecise, fiatFormatter),
    ...getTotal(quotes, requiredFiat, estimatedFeeFiatPrecise, fiatFormatter),
  };

  const resultStable = useDeepMemo(() => result, [result]);

  useEffect(() => {
    log('Total fiat', resultStable);
  }, [resultStable]);

  return resultStable;
}

function getTotal(
  quotes: TransactionBridgeQuote[] | undefined,
  requiredFiat: { address: Hex; amountFiat: number }[],
  estimatedGasFeeFiat: string | null,
  format: (value: BigNumber) => string,
) {
  const balanceTotal = requiredFiat
    .filter(
      (token) =>
        !quotes?.some(
          (quote) =>
            quote.quote.destAsset.address.toLowerCase() ===
            token.address.toLowerCase(),
        ),
    )
    .reduce(
      (acc, token) => acc.plus(new BigNumber(token.amountFiat)),
      new BigNumber(0),
    );

  const quoteTotal = (quotes ?? []).reduce(
    (acc, quote) =>
      acc.plus(
        new BigNumber(quote.sentAmount?.valueInCurrency ?? 0).minus(
          getQuoteDust(quote, requiredFiat),
        ),
      ),
    new BigNumber(0),
  );

  const total = quoteTotal
    .plus(balanceTotal)
    .plus(
      getEstimatedNativeTotal(quotes, estimatedGasFeeFiat, format)
        .totalNativeEstimated ?? 0,
    );

  return {
    total: total.toString(10),
    totalFormatted: format(total),
  };
}

function getBridgeFeeTotal(
  quotes: TransactionBridgeQuote[] | undefined,
  format: (value: BigNumber) => string,
) {
  const total =
    quotes?.reduce(
      (acc, quote) => acc.plus(getQuoteSourceFee(quote)),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  return {
    totalBridgeFee: total.toString(10),
    totalBridgeFeeFormatted: format(total),
  };
}

function getEstimatedNativeTotal(
  quotes: TransactionBridgeQuote[] | undefined,
  estimatedGasFeeFiat: string | null,
  format: (value: BigNumber) => string,
) {
  const total = new BigNumber(
    getEstimatedNetworkFeeTotal(quotes, format).totalNetworkFeeEstimated,
  ).plus(estimatedGasFeeFiat ?? '0');

  return {
    totalNativeEstimated: total.toString(10),
    totalNativeEstimatedFormatted: format(total),
  };
}

function getEstimatedNetworkFeeTotal(
  quotes: TransactionBridgeQuote[] | undefined,
  format: (value: BigNumber) => string,
) {
  const total =
    quotes?.reduce(
      (acc, quote) => acc.plus(quote.totalNetworkFee?.valueInCurrency ?? 0),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  return {
    totalNetworkFeeEstimated: total.toString(10),
    totalNetworkFeeEstimatedFormatted: format(total),
  };
}

function getMaxNetworkFeeTotal(
  quotes: TransactionBridgeQuote[] | undefined,
  format: (value: BigNumber) => string,
) {
  const total =
    quotes?.reduce(
      (acc, quote) => acc.plus(quote.totalMaxNetworkFee?.valueInCurrency ?? 0),
      new BigNumber(0),
    ) ?? new BigNumber(0);

  return {
    totalNetworkFeeMax: total.toString(10),
    totalNetworkFeeMaxFormatted: format(total),
  };
}

function getQuoteSourceFee(quote: TransactionBridgeQuote): BigNumber {
  return new BigNumber(quote.sentAmount?.valueInCurrency ?? 0).minus(
    quote.minToTokenAmount?.valueInCurrency ?? 0,
  );
}

function getQuoteDust(
  quote: TransactionBridgeQuote,
  requiredFiat: { address: Hex; amountFiat: number }[],
): BigNumber {
  const targetAmount = quote.minToTokenAmount?.valueInCurrency ?? '0';

  const requiredAmount = requiredFiat.find(
    (token) =>
      token.address.toLowerCase() ===
      quote.quote.destAsset.address.toLowerCase(),
  )?.amountFiat;

  if (!requiredAmount) {
    return new BigNumber(0);
  }

  return new BigNumber(targetAmount).minus(requiredAmount);
}
