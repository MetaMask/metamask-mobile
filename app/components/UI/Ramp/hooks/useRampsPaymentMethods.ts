import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectPaymentMethods } from '../../../../selectors/rampsController';
import { type PaymentMethod } from '@metamask/ramps-controller';
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
  const {
    data: paymentMethods,
    selected: selectedPaymentMethod,
    isLoading,
    error,
  } = useSelector(selectPaymentMethods);

  const setSelectedPaymentMethod = useCallback(
    (paymentMethod: PaymentMethod | null) =>
      Engine.context.RampsController.setSelectedPaymentMethod(
        paymentMethod?.id,
      ),
    [],
  );

  return {
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isLoading,
    error,
  };
}

export default useRampsPaymentMethods;
