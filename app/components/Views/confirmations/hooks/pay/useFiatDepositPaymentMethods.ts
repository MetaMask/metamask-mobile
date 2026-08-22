import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { selectUserRegion } from '../../../../../selectors/rampsController';
import { normalizeAssetIdForApi } from '../../../../UI/Ramp/utils/normalizeAssetIdForApi';
import { parseUserFacingError } from '../../../../UI/Ramp/utils/parseUserFacingError';
import type { RampsQueryStatus } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { deriveFiatDepositAssetId } from '../../utils/fiatDepositAsset';

export interface UseFiatDepositPaymentMethodsResult {
  paymentMethods: PaymentMethod[];
  /**
   * Suggested selection from the controller response for this request only.
   * Does not write Buy `paymentMethods.selected`.
   */
  suggestedPaymentMethod: PaymentMethod | null;
  assetId: string;
  isLoading: boolean;
  isFetching: boolean;
  status: RampsQueryStatus;
  isSuccess: boolean;
  error: string | null;
}

const HEADLESS_SCOPE = {
  autoSelectProvider: true,
  restrictToKnownOrNativeProviders: true,
} as const;

/**
 * Payment methods for MM Pay / Headless fiat deposits, scoped to the same
 * deposit asset and provider resolution path as TPC `getQuotes`.
 *
 * Request-only: never passes `updateState`, so Buy
 * `RampsController.paymentMethods.data` / `.selected` are not mutated.
 * Clears TPC `fiatPayment.selectedPaymentMethodId` when it is absent from the
 * returned list after a successful fetch (not while loading / empty transient).
 */
export function useFiatDepositPaymentMethods(): UseFiatDepositPaymentMethodsResult {
  const userRegion = useSelector(selectUserRegion);
  const regionCode = userRegion?.regionCode ?? '';
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const { enabledTransactionTypes, assetPerTransactionType } =
    useMMPayFiatConfig();
  const fiatPayment = useTransactionPayFiatPayment();
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  const assetId = useMemo(
    () =>
      normalizeAssetIdForApi(
        deriveFiatDepositAssetId(
          transactionMeta,
          enabledTransactionTypes,
          assetPerTransactionType,
        ),
      ),
    [assetPerTransactionType, enabledTransactionTypes, transactionMeta],
  );

  const queryEnabled = Boolean(regionCode && assetId);

  const paymentMethodsQuery = useQuery({
    queryKey: [
      'ramps',
      'paymentMethodsForContext',
      regionCode.trim().toLowerCase(),
      assetId,
      HEADLESS_SCOPE.autoSelectProvider,
      HEADLESS_SCOPE.restrictToKnownOrNativeProviders,
    ],
    queryFn: async () => {
      const result =
        await Engine.context.RampsController.getPaymentMethodsForContext({
          region: regionCode,
          assetId,
          autoSelectProvider: HEADLESS_SCOPE.autoSelectProvider,
          restrictToKnownOrNativeProviders:
            HEADLESS_SCOPE.restrictToKnownOrNativeProviders,
          preferPaymentMethodId: selectedPaymentMethodId,
          // Explicit request-only: never write Buy paymentMethods state.
          updateState: false,
        });

      return result;
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const paymentMethods = useMemo(
    () => paymentMethodsQuery.data?.methods ?? [],
    [paymentMethodsQuery.data?.methods],
  );

  useEffect(() => {
    if (
      !queryEnabled ||
      !transactionId ||
      !selectedPaymentMethodId ||
      paymentMethodsQuery.isLoading ||
      paymentMethodsQuery.isFetching ||
      !paymentMethodsQuery.isSuccess
    ) {
      return;
    }

    const stillValid = paymentMethods.some(
      (method) => method.id === selectedPaymentMethodId,
    );

    if (stillValid) {
      return;
    }

    Engine.context.TransactionPayController.updateFiatPayment({
      transactionId,
      callback: (fp) => {
        fp.selectedPaymentMethodId = undefined;
      },
    });
  }, [
    paymentMethods,
    paymentMethodsQuery.isFetching,
    paymentMethodsQuery.isLoading,
    paymentMethodsQuery.isSuccess,
    queryEnabled,
    selectedPaymentMethodId,
    transactionId,
  ]);

  const status = useMemo<RampsQueryStatus>(() => {
    if (!queryEnabled) {
      return 'idle';
    }
    if (paymentMethodsQuery.isLoading) {
      return 'loading';
    }
    if (paymentMethodsQuery.isError) {
      return 'error';
    }
    return 'success';
  }, [
    paymentMethodsQuery.isError,
    paymentMethodsQuery.isLoading,
    queryEnabled,
  ]);

  const parseError = useCallback(
    () =>
      paymentMethodsQuery.error != null
        ? parseUserFacingError(
            paymentMethodsQuery.error,
            strings('fiat_on_ramp.payment_error'),
          )
        : null,
    [paymentMethodsQuery.error],
  );

  return {
    paymentMethods,
    suggestedPaymentMethod: paymentMethodsQuery.data?.selected ?? null,
    assetId,
    isLoading: status === 'loading',
    isFetching: paymentMethodsQuery.isFetching,
    status,
    isSuccess: status === 'success',
    error: parseError(),
  };
}

export default useFiatDepositPaymentMethods;
