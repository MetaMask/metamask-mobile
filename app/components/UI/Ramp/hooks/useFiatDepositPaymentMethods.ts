import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { deriveFiatDepositAssetId } from '../utils/fiatDepositAsset';
import {
  useRampsPaymentMethodsForContext,
  type RampsPaymentMethodsContextResult,
} from './useRampsPaymentMethods';

export interface UseFiatDepositPaymentMethodsResult
  extends RampsPaymentMethodsContextResult {
  /** CAIP-19 deposit asset the returned methods are scoped to. */
  assetId: string;
}

/**
 * Payment methods for MM Pay / headless fiat deposits, scoped to the same
 * deposit asset and provider resolution path as TPC `getQuotes`.
 *
 * Request-only (`updateState: false`), so Buy's
 * `RampsController.paymentMethods.data` / `.selected` are never mutated.
 * Also clears TPC `fiatPayment.selectedPaymentMethodId` when it is absent from
 * the returned list after a successful fetch (never while loading, refetching,
 * or on a transient empty).
 */
export function useFiatDepositPaymentMethods(): UseFiatDepositPaymentMethodsResult {
  const userRegion = useSelector(selectUserRegion);
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const { enabledTransactionTypes, assetPerTransactionType } =
    useMMPayFiatConfig();
  const selectedPaymentMethodId =
    useTransactionPayFiatPayment()?.selectedPaymentMethodId;

  const assetId = useMemo(
    () =>
      deriveFiatDepositAssetId(
        transactionMeta,
        enabledTransactionTypes,
        assetPerTransactionType,
      ),
    [assetPerTransactionType, enabledTransactionTypes, transactionMeta],
  );

  const context = useRampsPaymentMethodsForContext({
    regionCode: userRegion?.regionCode ?? '',
    assetId,
    autoSelectProvider: true,
    restrictToKnownOrNativeProviders: true,
    preferPaymentMethodId: selectedPaymentMethodId,
    updateState: false,
    staleTime: 5 * 60 * 1000,
  });

  const { isFetching, isSuccess, paymentMethods } = context;

  useEffect(() => {
    if (
      !isSuccess ||
      isFetching ||
      !transactionId ||
      !selectedPaymentMethodId ||
      paymentMethods.some(({ id }) => id === selectedPaymentMethodId)
    ) {
      return;
    }

    Engine.context.TransactionPayController.updateFiatPayment({
      transactionId,
      callback: (fiatPayment) => {
        fiatPayment.selectedPaymentMethodId = undefined;
      },
    });
  }, [
    isFetching,
    isSuccess,
    paymentMethods,
    selectedPaymentMethodId,
    transactionId,
  ]);

  return { ...context, assetId };
}

export default useFiatDepositPaymentMethods;
