import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPaymentMethods,
  selectPaymentMethodsRequest,
  selectSelectedPaymentMethod,
} from '../../../../selectors/rampsController';
import type {
  PaymentMethod,
  PaymentMethodsResponse,
  RequestSelectorResult,
} from '@metamask/ramps-controller';


/**
 * Options for the useRampsPaymentMethods hook to track request state.
 */
export interface UseRampsPaymentMethodsOptions {
  /**
   * Region code for tracking request state.
   */
  region?: string;
  /**
   * Fiat currency code for tracking request state.
   */
  fiat?: string;
  /**
   * CAIP-19 cryptocurrency identifier for tracking request state.
   */
  assetId?: string;
  /**
   * Provider ID path for tracking request state.
   */
  provider?: string;
}

/**
 * Result returned by the useRampsPaymentMethods hook.
 */
export interface UseRampsPaymentMethodsResult {
  /**
   * The list of payment methods available for the current context.
   * Populated after calling fetchPaymentMethods or when setSelectedToken is called.
   */
  paymentMethods: PaymentMethod[];
  /**
   * The currently selected payment method, or null if none is selected.
   */
  selectedPaymentMethod: PaymentMethod | null;
  /**
   * Whether the payment methods request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * Set the selected payment method in the controller state.
   */
  setSelectedPaymentMethod: (paymentMethod: PaymentMethod | null) => void;
}

/**
 * Hook to get payment methods state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * Payment methods are filtered by region, fiat, asset, and provider.
 * The fetchPaymentMethods function requires assetId and provider parameters.
 *
 * To track loading/error state for a specific request, provide the request
 * parameters (region, fiat, assetId, provider) as options to the hook.
 *
 * @param options - Optional parameters to track a specific request's loading/error state.
 * @returns Payment methods state and fetch function.
 */
export function useRampsPaymentMethods(
  options?: UseRampsPaymentMethodsOptions,
): UseRampsPaymentMethodsResult {
  const paymentMethods = useSelector(selectPaymentMethods);
  const selectedPaymentMethod = useSelector(selectSelectedPaymentMethod);

  const userRegion = useSelector(
    (state: Parameters<typeof selectPaymentMethods>[0]) =>
      state.engine.backgroundState.RampsController?.userRegion,
  );

  const regionCode = useMemo(
    () => options?.region ?? userRegion?.regionCode ?? '',
    [options?.region, userRegion?.regionCode],
  );

  const fiatCode = useMemo(
    () => options?.fiat ?? userRegion?.country?.currency ?? '',
    [options?.fiat, userRegion?.country?.currency],
  );

  const requestSelector = useMemo(
    () =>
      selectPaymentMethodsRequest(
        regionCode,
        fiatCode,
        options?.assetId ?? '',
        options?.provider ?? '',
      ),
    [regionCode, fiatCode, options?.assetId, options?.provider],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<PaymentMethodsResponse>;

  console.log('[useRampsPaymentMethods] Hook state:', {
    selectedPaymentMethod,
    paymentMethodsCount: paymentMethods?.length ?? 0,
    paymentMethods: paymentMethods?.map((pm) => ({ id: pm.id, name: pm.name })) ?? [],
    userRegion,
    userRegionCurrency: userRegion?.country?.currency ?? null,
    regionCode,
    fiatCode,
    optionsAssetId: options?.assetId ?? null,
    optionsProvider: options?.provider ?? null,
    isFetching,
    error,
  });

  const setSelectedPaymentMethod = useCallback(
    (paymentMethod: PaymentMethod | null) => {
        if(paymentMethod?.id) {
          Engine.context.RampsController.setSelectedPaymentMethod(paymentMethod.id);
        } else {
          throw new Error('Payment method ID is required');
        }
    },
    [],
  );

  return {
    paymentMethods,
    selectedPaymentMethod,
    isLoading: isFetching,
    error,
    setSelectedPaymentMethod,
  };
}

export default useRampsPaymentMethods;
