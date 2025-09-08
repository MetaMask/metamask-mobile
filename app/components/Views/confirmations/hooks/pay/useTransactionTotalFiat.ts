import { useSelector } from 'react-redux';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import {
  TransactionRequiredFiat,
  useTransactionRequiredFiat,
} from './useTransactionRequiredFiat';
import { BigNumber } from 'bignumber.js';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { TransactionBridgeQuote } from '../../utils/bridge';
import { useFeeCalculations } from '../gas/useFeeCalculations';
import { useDeepMemo } from '../useDeepMemo';

type TransactionBridgeQuoteExtended = TransactionBridgeQuote & {
  requiredFiat: number;
};

export function useTransactionTotalFiat() {
  const fiatFormatter = useFiatFormatter();
  const { values } = useTransactionRequiredFiat();
  const transactionMeta = useTransactionMetadataOrThrow();
  const { id: transactionId } = transactionMeta;
  const { estimatedFeeFiatPrecise } = useFeeCalculations(transactionMeta);

  const quotesRaw = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const quotes: TransactionBridgeQuoteExtended[] = (quotesRaw ?? []).map(
    (quote) => {
      const requiredFiat = values.find(
        (token) =>
          token.address.toLowerCase() ===
          quote.quote.destAsset.address.toLowerCase(),
      )?.amountFiat;

      return {
        ...quote,
        requiredFiat: requiredFiat ?? 0,
      };
    },
  );

  const result = {
    ...getBridgeFeeTotal(quotes, fiatFormatter),
    ...getEstimatedNetworkFeeTotal(quotes, fiatFormatter),
    ...getMaxNetworkFeeTotal(quotes, fiatFormatter),
    ...getEstimatedNativeTotal(quotes, estimatedFeeFiatPrecise, fiatFormatter),
    ...getTotal(quotes, values, estimatedFeeFiatPrecise, fiatFormatter),
  };

  return useDeepMemo(() => result, [result]);
}

function getTotal(
  quotes: TransactionBridgeQuoteExtended[],
  requiredFiat: TransactionRequiredFiat[],
  estimatedGasFeeFiat: string | null,
  format: (value: BigNumber) => string,
) {
  const balanceTotal = requiredFiat
    .filter(
      (token) =>
        !token.skipIfBalance ||
        new BigNumber(token.balanceFiat).isLessThan(token.amountFiat),
    )
    .reduce(
      (acc, token) => acc.plus(new BigNumber(token.amountFiat)),
      new BigNumber(0),
    );

  const total = balanceTotal
    .plus(
      getEstimatedNativeTotal(quotes, estimatedGasFeeFiat, format)
        .totalNativeEstimated,
    )
    .plus(getBridgeFeeTotal(quotes, format).totalBridgeFee);

  return {
    total: total.toString(10),
    totalFormatted: format(total),
  };
}

function getBridgeFeeTotal(
  quotes: TransactionBridgeQuoteExtended[],
  format: (value: BigNumber) => string,
) {
  const total = quotes.reduce(
    (acc, quote) =>
      acc.plus(
        new BigNumber(quote.sentAmount?.valueInCurrency ?? '0')
          .minus(quote.requiredFiat)
          .minus(getQuoteDust(quote)),
      ),
    new BigNumber(0),
  );

  return {
    totalBridgeFee: total.toString(10),
    totalBridgeFeeFormatted: format(total),
  };
}

function getEstimatedNativeTotal(
  quotes: TransactionBridgeQuoteExtended[],
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
  quotes: TransactionBridgeQuoteExtended[],
  format: (value: BigNumber) => string,
) {
  const total = quotes.reduce(
    (acc, quote) => acc.plus(quote.totalNetworkFee?.valueInCurrency ?? 0),
    new BigNumber(0),
  );

  return {
    totalNetworkFeeEstimated: total.toString(10),
    totalNetworkFeeEstimatedFormatted: format(total),
  };
}

function getMaxNetworkFeeTotal(
  quotes: TransactionBridgeQuoteExtended[],
  format: (value: BigNumber) => string,
) {
  const total = quotes.reduce(
    (acc, quote) => acc.plus(quote.totalMaxNetworkFee?.valueInCurrency ?? 0),
    new BigNumber(0),
  );

  return {
    totalNetworkFeeMax: total.toString(10),
    totalNetworkFeeMaxFormatted: format(total),
  };
}

function getQuoteDust(quote: TransactionBridgeQuoteExtended): BigNumber {
  const targetAmount = quote.minToTokenAmount?.valueInCurrency ?? '0';

  if (new BigNumber(targetAmount).isLessThanOrEqualTo(quote.requiredFiat)) {
    return new BigNumber(0);
  }

  return new BigNumber(targetAmount).minus(quote.requiredFiat);
}
