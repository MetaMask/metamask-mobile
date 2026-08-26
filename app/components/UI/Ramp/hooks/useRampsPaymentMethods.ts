import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import {
  selectPaymentMethods,
  selectProviders,
  selectTokens,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { rampsQueries } from '../queries';
import type { PaymentMethodsQueryParams } from '../queries/paymentMethods';
import { parseUserFacingError } from '../utils/parseUserFacingError';

export type RampsQueryStatus = 'idle' | 'loading' | 'success' | 'error';

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
   * Selection suggested by the controller for this request only. Reading it
   * never implies a write to `paymentMethods.selected`.
   */
  suggestedPaymentMethod: PaymentMethod | null;
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
>;

/**
 * Hook to get payment methods via React Query.
 *
 * The query executes for the active Buy region, asset, and provider context.
 * RampsController owns catalog writes and automatic selection, so this path
 * requests with `updateState: true`.
 *
 * @returns Payment methods state.
 */
export function useRampsPaymentMethods(): UseRampsPaymentMethodsResult {
  const { selected: selectedPaymentMethod } = useSelector(selectPaymentMethods);
  const { selected: selectedProvider } = useSelector(selectProviders);
  const { selected: selectedToken } = useSelector(selectTokens);
  const userRegion = useSelector(selectUserRegion);

  const context = useRampsPaymentMethodsForContext({
    regionCode: userRegion?.regionCode ?? '',
    assetId: selectedToken?.assetId ?? '',
    providerId: selectedProvider?.id ?? '',
    updateState: true,
  });

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

  const { paymentMethods, suggestedPaymentMethod } = context;
  const inContext = (method: PaymentMethod | null) =>
    method ? (paymentMethods.find(({ id }) => id === method.id) ?? null) : null;

  return {
    ...context,
    selectedPaymentMethod:
      inContext(selectedPaymentMethod) ?? inContext(suggestedPaymentMethod),
    setSelectedPaymentMethod,
  };
}

/**
 * Payment methods for a caller-supplied region / asset / provider context.
 *
 * The caller owns its context, so this hook reads no globals of its own and
 * must never import from the confirmations tree: `RampsBootstrap` mounts the
 * Buy binding above at app root.
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
