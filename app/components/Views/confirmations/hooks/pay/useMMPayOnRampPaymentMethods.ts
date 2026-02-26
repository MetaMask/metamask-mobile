import { useEffect, useMemo } from 'react';
import type { PaymentMethod } from '@metamask/ramps-controller';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';

export interface UseMMPayOnRampPaymentMethodsParams {
  assetId?: string;
  enabled?: boolean;
}

export interface UseMMPayOnRampPaymentMethodsResult {
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (paymentMethod: PaymentMethod | null) => void;
  isLoading: boolean;
  error: string | null;
  hasPaymentMethods: boolean;
}

/**
 * Ensures the desired buy asset is selected in RampsController and returns
 * the payment methods resource state for that current ramp context.
 */
export function useMMPayOnRampPaymentMethods({
  assetId,
  enabled = true,
}: UseMMPayOnRampPaymentMethodsParams): UseMMPayOnRampPaymentMethodsResult {
  const {
    selectedToken,
    setSelectedToken,
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentMethodsLoading,
    paymentMethodsError,
  } = useRampsController();

  useEffect(() => {
    if (!enabled || !assetId) {
      return;
    }

    const selectedAssetId = selectedToken?.assetId;
    if (
      selectedAssetId &&
      selectedAssetId.toLowerCase() === assetId.toLowerCase()
    ) {
      return;
    }

    try {
      setSelectedToken(assetId);
    } catch {
      // Token resource may still be hydrating; caller observes loading/error state.
    }
  }, [assetId, enabled, selectedToken?.assetId, setSelectedToken]);

  return useMemo(
    () => ({
      paymentMethods,
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      isLoading: paymentMethodsLoading,
      error: paymentMethodsError,
      hasPaymentMethods: paymentMethods.length > 0,
    }),
    [
      paymentMethods,
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      paymentMethodsLoading,
      paymentMethodsError,
    ],
  );
}

export default useMMPayOnRampPaymentMethods;
