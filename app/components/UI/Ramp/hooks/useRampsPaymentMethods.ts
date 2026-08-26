import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import {
  selectPaymentMethods,
  selectProviders,
  selectTokens,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import { selectFiatDepositAssetOverride } from '../../../../selectors/featureFlagController/deposit';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { rampsQueries } from '../queries';
import type { PaymentMethodsQueryParams } from '../queries/paymentMethods';
import { deriveFiatDepositAssetId } from '../utils/fiatDepositAsset';
import { parseUserFacingError } from '../utils/parseUserFacingError';

export type RampsQueryStatus = 'idle' | 'loading' | 'success' | 'error';

/** Which payment-method catalog a caller wants. */
export type RampsPaymentMethodsCatalog = 'buy' | 'active-fiat-context';

const NO_PAYMENT_METHODS: PaymentMethod[] = [];

/**
 * Result returned by the useRampsPaymentMethods hook.
 */
export interface UseRampsPaymentMethodsResult {
  /**
   * The list of payment methods available for the current context.
   */
  paymentMethods: PaymentMethod[];
  /**
   * The currently selected payment method, or null if none selected.
   */
  selectedPaymentMethod: PaymentMethod | null;
  /**
   * Sets the selected payment method by ID.
   * @param paymentMethod - The payment method to select, or null to clear selection.
   */
  setSelectedPaymentMethod: (paymentMethod: PaymentMethod | null) => void;
  /**
   * Whether the payment methods request is currently loading (no cached data).
   */
  isLoading: boolean;
  /**
   * Whether a fetch is in-flight (includes background refetches with cached data).
   */
  isFetching: boolean;
  /**
   * Query lifecycle status for the active payment methods request.
   */
  status: RampsQueryStatus;
  /**
   * Whether the active payment methods request completed successfully.
   */
  isSuccess: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
}

/** The context-scoped subset, without the Buy-owned Redux selection. */
export type RampsPaymentMethodsContextResult = Omit<
  UseRampsPaymentMethodsResult,
  'selectedPaymentMethod' | 'setSelectedPaymentMethod'
> & {
  /** Selection suggested by the controller for this request only. */
  suggestedPaymentMethod: PaymentMethod | null;
};

/**
 * Payment methods for the current fiat context, via React Query.
 *
 * Defaults to `active-fiat-context`: when an MM Pay fiat deposit is the pending
 * approval, the query is scoped to that deposit's asset, the user's region and
 * the providers that actually serve the asset, requested with
 * `updateState: false`. Without such a transaction the query stays idle and
 * `paymentMethods` is empty, so a plain send or signature never triggers a
 * fetch.
 *
 * Buy surfaces pass `{ catalog: 'buy' }`. That pins them to Buy's own token and
 * provider, so an open deposit confirmation can never re-scope what they see
 * mid-flow. `RampsBootstrap` mounts the Buy binding at app root.
 *
 * @param options - Which catalog to read. Omit for `active-fiat-context`.
 * @returns Payment methods state.
 */
export function useRampsPaymentMethods(
  options: { catalog?: RampsPaymentMethodsCatalog } = {},
): UseRampsPaymentMethodsResult {
  const isBuyCatalog = options.catalog === 'buy';

  const { selected: buySelectedPaymentMethod } =
    useSelector(selectPaymentMethods);
  const { selected: selectedProvider } = useSelector(selectProviders);
  const { selected: selectedToken } = useSelector(selectTokens);
  const userRegion = useSelector(selectUserRegion);

  const transactionMeta = useTransactionMetadataRequest();
  const depositAssetId = useFiatDepositAssetId(transactionMeta);
  const fiatSelectedPaymentMethodId =
    useTransactionPayFiatPayment()?.selectedPaymentMethodId;

  const regionCode = userRegion?.regionCode ?? '';

  const queryContext = useMemo<PaymentMethodsQueryParams>(
    () =>
      isBuyCatalog
        ? {
            regionCode,
            assetId: selectedToken?.assetId ?? '',
            providerId: selectedProvider?.id ?? '',
            updateState: true,
          }
        : {
            regionCode,
            assetId: depositAssetId,
            autoSelectProvider: true,
            restrictToKnownOrNativeProviders: true,
            updateState: false,
          },
    [
      depositAssetId,
      isBuyCatalog,
      regionCode,
      selectedProvider?.id,
      selectedToken?.assetId,
    ],
  );

  const context = useRampsPaymentMethodsForContext(queryContext);
  const { paymentMethods, suggestedPaymentMethod, isFetching, isSuccess } =
    context;

  const setSelectedPaymentMethod = useCallback(
    (paymentMethod: PaymentMethod | null) =>
      (
        Engine.context.RampsController as {
          setSelectedPaymentMethod: (
            pm?: PaymentMethod | string | null,
          ) => void;
        }
      ).setSelectedPaymentMethod(paymentMethod),
    [],
  );

  useClearMissingFiatPaymentMethod({
    enabled: !isBuyCatalog,
    isFetching,
    isSuccess,
    paymentMethods,
    selectedPaymentMethodId: fiatSelectedPaymentMethodId,
    transactionId: transactionMeta?.id ?? '',
  });

  const selectedPaymentMethod = useMemo(() => {
    const inContext = (method: PaymentMethod | null) =>
      method
        ? (paymentMethods.find(({ id }) => id === method.id) ?? null)
        : null;

    if (isBuyCatalog) {
      return (
        inContext(buySelectedPaymentMethod) ?? inContext(suggestedPaymentMethod)
      );
    }

    return (
      paymentMethods.find(({ id }) => id === fiatSelectedPaymentMethodId) ??
      null
    );
  }, [
    buySelectedPaymentMethod,
    fiatSelectedPaymentMethodId,
    isBuyCatalog,
    paymentMethods,
    suggestedPaymentMethod,
  ]);

  return {
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isLoading: context.isLoading,
    isFetching,
    status: context.status,
    isSuccess,
    error: context.error,
  };
}

/** CAIP-19 asset id the pending MM Pay fiat deposit settles in, or `''`. */
function useFiatDepositAssetId(
  transactionMeta: TransactionMeta | undefined,
): string {
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const assetPerTransactionType = useSelector(selectFiatDepositAssetOverride);

  return useMemo(
    () =>
      deriveFiatDepositAssetId(
        transactionMeta,
        enabledTransactionTypes,
        assetPerTransactionType,
      ),
    [assetPerTransactionType, enabledTransactionTypes, transactionMeta],
  );
}

/**
 * Clears TPC `fiatPayment.selectedPaymentMethodId` once a successful fetch
 * proves the id is not servable for the deposit asset. Users who picked a
 * Buy-only method through the previously leaked catalog would otherwise keep
 * hitting "This payment route isn't available right now".
 *
 * Never clears while loading, refetching, or on a transient empty result.
 */
function useClearMissingFiatPaymentMethod({
  enabled,
  isFetching,
  isSuccess,
  paymentMethods,
  selectedPaymentMethodId,
  transactionId,
}: {
  enabled: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodId: string | undefined;
  transactionId: string;
}): void {
  useEffect(() => {
    if (
      !enabled ||
      !isSuccess ||
      isFetching ||
      !transactionId ||
      !selectedPaymentMethodId ||
      paymentMethods.length === 0 ||
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
    enabled,
    isFetching,
    isSuccess,
    paymentMethods,
    selectedPaymentMethodId,
    transactionId,
  ]);
}

/**
 * Payment methods for a caller-supplied region / asset / provider context.
 *
 * The caller owns its context, so this hook reads no globals of its own.
 */
export function useRampsPaymentMethodsForContext(
  context: PaymentMethodsQueryParams,
): RampsPaymentMethodsContextResult {
  const { regionCode, assetId, providerId, autoSelectProvider } = context;
  const queryEnabled = Boolean(
    regionCode.trim() &&
      assetId.trim() &&
      (providerId?.trim() || autoSelectProvider),
  );

  const paymentMethodsQuery = useQuery({
    ...rampsQueries.paymentMethods.options(context),
    enabled: queryEnabled,
  });

  const activeResponse = queryEnabled ? paymentMethodsQuery.data : undefined;

  const status = useMemo<RampsQueryStatus>(() => {
    if (!queryEnabled) {
      return 'idle';
    }
    if (paymentMethodsQuery.isError) {
      return 'error';
    }
    if (paymentMethodsQuery.data !== undefined) {
      return 'success';
    }
    return 'loading';
  }, [paymentMethodsQuery.data, paymentMethodsQuery.isError, queryEnabled]);

  return {
    paymentMethods: activeResponse?.methods ?? NO_PAYMENT_METHODS,
    suggestedPaymentMethod: activeResponse?.selected ?? null,
    isLoading: status === 'loading',
    isFetching: paymentMethodsQuery.isFetching,
    status,
    isSuccess: status === 'success',
    error:
      paymentMethodsQuery.error != null
        ? parseUserFacingError(
            paymentMethodsQuery.error,
            strings('fiat_on_ramp.payment_error'),
          )
        : null,
  };
}

export default useRampsPaymentMethods;
