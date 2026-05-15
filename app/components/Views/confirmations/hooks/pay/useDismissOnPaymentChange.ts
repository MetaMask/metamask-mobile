import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionPayToken } from './useTransactionPayToken';

/**
 * Dismisses the current navigation route the first time the active
 * transaction's payment selection changes after the component mounts. Used by
 * `PayWithBottomSheet` so that picking a token in the underlying
 * `PayWithModal` OR selecting a fiat payment method collapses the picker back
 * to the confirmation screen.
 *
 * Initial values are captured on mount, so the hook does not fire for the
 * values that were already on the controller when the sheet opened.
 */
export function useDismissOnPaymentChange(): void {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const fiatPayment = useTransactionPayFiatPayment();
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  const initialPayTokenRef = useRef(payToken);
  const initialSelectedPaymentMethodIdRef = useRef(selectedPaymentMethodId);
  const isDismissingRef = useRef(false);

  useEffect(() => {
    if (isDismissingRef.current) {
      return;
    }

    const initialPayToken = initialPayTokenRef.current;
    const payTokenMatchesInitial =
      (!initialPayToken && !payToken) ||
      (!!initialPayToken &&
        !!payToken &&
        isMatchingPayToken(payToken, {
          address: initialPayToken.address,
          chainId: initialPayToken.chainId,
        }));

    const fiatMatchesInitial =
      selectedPaymentMethodId === initialSelectedPaymentMethodIdRef.current;

    if (payTokenMatchesInitial && fiatMatchesInitial) {
      return;
    }

    isDismissingRef.current = true;
    navigation.goBack();
  }, [navigation, payToken, selectedPaymentMethodId]);
}
