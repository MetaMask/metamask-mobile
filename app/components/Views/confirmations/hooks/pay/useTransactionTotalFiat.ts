import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import {
  TransactionRequiredFiat,
  useTransactionRequiredFiat,
} from './useTransactionRequiredFiat';
import { BigNumber } from 'bignumber.js';
import { useFeeCalculations } from '../gas/useFeeCalculations';
import { useDeepMemo } from '../useDeepMemo';
import { useEffect } from 'react';
import { createProjectLogger } from '@metamask/utils';
import { TransactionMeta } from '@metamask/transaction-controller';
import { noop } from 'lodash';
import { useTransactionPayFiat } from './useTransactionPayFiat';
import { PayQuote } from '../../../../../util/transactions/pay-method/relay';

const logger = createProjectLogger('transaction-pay');

export function useTransactionTotalFiat({
  log: isLoggingEnabled,
}: { log?: boolean } = {}) {
  const log = isLoggingEnabled ? logger : noop;

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({ txParams: {} } as TransactionMeta);

  const { id: transactionId } = transactionMeta;
  const { values } = useTransactionRequiredFiat();
  const { estimatedFeeFiatPrecise } = useFeeCalculations(transactionMeta);

  const quotes =
    useSelector((state: RootState) =>
      selectTransactionBridgeQuotesById(state, transactionId),
    ) ?? [];

  const { formatFiat: fiatFormatter } = useTransactionPayFiat();

  const result = {
    ...getBridgeFeeTotal(quotes, fiatFormatter),
    ...getEstimatedNetworkFeeTotal(quotes, fiatFormatter),
    ...getMaxNetworkFeeTotal(quotes, fiatFormatter),
    ...getEstimatedNativeTotal(quotes, estimatedFeeFiatPrecise, fiatFormatter),
    ...getTransactionFeeTotal(quotes, estimatedFeeFiatPrecise, fiatFormatter),
    ...getTotal(quotes, values, estimatedFeeFiatPrecise, fiatFormatter),
  };

  const stableResult = useDeepMemo(() => result, [result]);

  useEffect(() => {
    log('Transaction total fiat', stableResult);
  }, [log, stableResult]);

  return stableResult;
}

function getTotal(
  quotes: PayQuote<unknown>[],
  _requiredFiat: TransactionRequiredFiat[],
  estimatedGasFeeFiat: string | null,
  format: (value: BigNumber) => string,
) {
  const total = new BigNumber(0)
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

function getTransactionFeeTotal(
  quotes: PayQuote<unknown>[],
  estimatedGasFeeFiat: string | null,
  format: (value: BigNumber) => string,
) {
  const total = new BigNumber(
    getBridgeFeeTotal(quotes, format).totalBridgeFee,
  ).plus(
    getEstimatedNativeTotal(quotes, estimatedGasFeeFiat, format)
      .totalNativeEstimated,
  );

  return {
    totalTransactionFee: total.toString(10),
    totalTransactionFeeFormatted: format(total),
  };
}

function getBridgeFeeTotal(
  quotes: PayQuote<unknown>[],
  format: (value: BigNumber) => string,
) {
  const total = quotes.reduce(
    (acc, quote) => acc.plus(new BigNumber(quote.fee || '0')),
    new BigNumber(0),
  );

  return {
    totalBridgeFee: total.toString(10),
    totalBridgeFeeFormatted: format(total),
  };
}

function getEstimatedNativeTotal(
  quotes: PayQuote<unknown>[],
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
  _quotes: PayQuote<unknown>[],
  format: (value: BigNumber) => string,
) {
  const total = new BigNumber(0);

  return {
    totalNetworkFeeEstimated: total.toString(10),
    totalNetworkFeeEstimatedFormatted: format(total),
  };
}

function getMaxNetworkFeeTotal(
  _quotes: PayQuote<unknown>[],
  format: (value: BigNumber) => string,
) {
  const total = new BigNumber(0);

  return {
    totalNetworkFeeMax: total.toString(10),
    totalNetworkFeeMaxFormatted: format(total),
  };
}
