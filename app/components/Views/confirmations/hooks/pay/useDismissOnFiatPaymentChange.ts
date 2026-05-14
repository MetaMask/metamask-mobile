import { RefObject, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

/**
 * Dismisses the current navigation route whenever the active transaction's
 * fiat `selectedPaymentMethodId` changes after the component mounts. Used by
 * `PayWithBottomSheet` so that selecting a fiat payment method (Debit/Credit,
 * Apple Pay, Google Pay, etc.) collapses the picker back to the confirmation
 * screen.
 *
 * The initial `selectedPaymentMethodId` is captured on mount, so the hook
 * does not fire for the value that was already on the controller when the
 * sheet opened.
 */
export function useDismissOnFiatPaymentChange(
  dismissedRef?: RefObject<boolean>,
): void {
  const navigation = useNavigation();
  const fiatPayment = useTransactionPayFiatPayment();
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const initialSelectedPaymentMethodIdRef = useRef(selectedPaymentMethodId);
  const localDismissedRef = useRef<boolean>(false);
  const effectiveDismissedRef: { current: boolean } =
    dismissedRef ?? localDismissedRef;

  useEffect(() => {
    if (effectiveDismissedRef.current) {
      return;
    }

    if (selectedPaymentMethodId === initialSelectedPaymentMethodIdRef.current) {
      return;
    }

    effectiveDismissedRef.current = true;
    navigation.goBack();
  }, [effectiveDismissedRef, navigation, selectedPaymentMethodId]);
}
