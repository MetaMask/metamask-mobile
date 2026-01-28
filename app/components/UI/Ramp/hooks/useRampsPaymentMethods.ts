import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectPaymentMethods,
  selectPaymentMethodsRequest,
  selectSelectedPaymentMethod,
} from '../../../../selectors/rampsController';
import {
  RequestSelectorResult,
  type PaymentMethod,
  type PaymentMethodsResponse,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

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
   * Whether the payment methods request is currently loading.
   */
  isLoading: boolean;
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
  const paymentMethods = useSelector(selectPaymentMethods);
  const selectedPaymentMethod = useSelector(selectSelectedPaymentMethod);

  const userRegion = useSelector(
    (state: Parameters<typeof selectPaymentMethods>[0]) =>
      state.engine.backgroundState.RampsController?.userRegion,
  );
  const selectedToken = useSelector(
    (state: Parameters<typeof selectPaymentMethods>[0]) =>
      state.engine.backgroundState.RampsController?.selectedToken,
  );
  const selectedProvider = useSelector(
    (state: Parameters<typeof selectPaymentMethods>[0]) =>
      state.engine.backgroundState.RampsController?.selectedProvider,
  );

  const regionCode = useMemo(
    () => userRegion?.regionCode ?? '',
    [userRegion?.regionCode],
  );

  const fiat = useMemo(
    () => userRegion?.country?.currency ?? '',
    [userRegion?.country?.currency],
  );

  const assetId = useMemo(
    () => selectedToken?.assetId ?? '',
    [selectedToken?.assetId],
  );

  const providerId = useMemo(
    () => selectedProvider?.id ?? '',
    [selectedProvider?.id],
  );

  const requestSelector = useMemo(
    () => selectPaymentMethodsRequest(regionCode, fiat, assetId, providerId),
    [regionCode, fiat, assetId, providerId],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<PaymentMethodsResponse>;

  const setSelectedPaymentMethod = useCallback(
    (paymentMethod: PaymentMethod | null) => {
      (
        Engine.context.RampsController.setSelectedPaymentMethod as (
          paymentMethodId: string | null,
        ) => void
      )(paymentMethod?.id ?? null);
    },
    [],
  );

  return {
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isLoading: isFetching,
    error,
  };
}

export default useRampsPaymentMethods;
