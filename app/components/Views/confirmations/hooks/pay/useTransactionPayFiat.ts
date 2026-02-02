import { useMemo } from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionFiatPaymentData } from './useTransactionPayData';

const IS_FIAT_STRATEGY_ENABLED = process.env.MMPAY_FIAT_STRATEGY === 'true';

export function useTransactionPayFiat() {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const fiatPayment = useTransactionFiatPaymentData();

  const isFiatPaymentEnabled =
    IS_FIAT_STRATEGY_ENABLED &&
    hasTransactionType(transactionMeta, [TransactionType.predictDeposit]);
  const isFiatSelected = Boolean(fiatPayment);

  return useMemo(() => {
    if (!isFiatSelected || !isFiatPaymentEnabled) {
      return {
        isFiatPaymentEnabled,
        isFiatSelected: false,
        fiatPayment: undefined,
      };
    }

    return {
      isFiatSelected,
      isFiatPaymentEnabled,
      fiatPayment,
    };
  }, [isFiatPaymentEnabled, isFiatSelected, fiatPayment]);
}
