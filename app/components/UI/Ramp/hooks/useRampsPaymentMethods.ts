import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  selectPaymentMethods,
  selectProviders,
  selectTokens,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { rampsQueries } from '../queries';

export type RampsQueryStatus = 'idle' | 'loading' | 'success' | 'error';

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

/**
 * Hook to get payment methods state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns Payment methods state.
 */
export function useRampsPaymentMethods(): UseRampsPaymentMethodsResult {
  const { selected: selectedPaymentMethod } = useSelector(selectPaymentMethods);
  const { selected: selectedProvider } = useSelector(selectProviders);
  const { selected: selectedToken } = useSelector(selectTokens);
  const userRegion = useSelector(selectUserRegion);

  const tokenSupportedByProvider = selectedProvider?.supportedCryptoCurrencies
    ? selectedProvider.supportedCryptoCurrencies[
        selectedToken?.assetId ?? ''
      ] === true
    : true;

  const queryEnabled = Boolean(
    userRegion?.regionCode &&
      userRegion?.country?.currency &&
      selectedToken?.assetId &&
      selectedProvider?.id &&
      tokenSupportedByProvider,
  );

  const paymentMethodsQuery = useQuery({
    ...rampsQueries.paymentMethods.options({
      regionCode: userRegion?.regionCode ?? '',
      fiat: userRegion?.country?.currency ?? '',
      assetId: selectedToken?.assetId ?? '',
      providerId: selectedProvider?.id ?? '',
    }),
    enabled: queryEnabled,
  });

  const setSelectedPaymentMethod = useCallback(
    (paymentMethod: PaymentMethod | null) =>
      Engine.context.RampsController.setSelectedPaymentMethod(
        paymentMethod?.id,
      ),
    [],
  );

  useEffect(() => {
    const methods = paymentMethodsQuery.data;
    if (!methods || methods.length === 0) return;

    let target: PaymentMethod | null = null;

    if (selectedPaymentMethod) {
      target = methods.find((m) => m.id === selectedPaymentMethod.id) ?? null;
    }

    if (!target) {
      target = methods[0];
    }

    if (target.id !== selectedPaymentMethod?.id) {
      setSelectedPaymentMethod(target);
    }
  }, [
    paymentMethodsQuery.data,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  ]);

  const isAutoSelecting = Boolean(
    paymentMethodsQuery.data?.length && !selectedPaymentMethod,
  );

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

  return {
    paymentMethods: paymentMethodsQuery.data ?? [],
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isLoading: status === 'loading' || isAutoSelecting,
    isFetching: paymentMethodsQuery.isFetching,
    status,
    isSuccess: status === 'success',
    error:
      paymentMethodsQuery.error instanceof Error
        ? paymentMethodsQuery.error.message
        : null,
  };
}

export default useRampsPaymentMethods;
