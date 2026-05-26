import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionPayToken } from './useTransactionPayToken';

interface UseDismissOnPaymentChangeOptions {
  dismissOnPayTokenChange?: boolean;
}

/**
 * Dismisses the current navigation route the first time the active
 * transaction's payment selection changes after the component mounts. By
 * default this observes both transaction pay-token changes and fiat payment
 * method changes.
 *
 * Initial values are captured on mount, so the hook does not fire for the
 * values that were already on the controller when the sheet opened.
 * `dismissOnPayTokenChange` can be disabled for flows where the transaction
 * pay token may still be hydrating in the background after the picker opens.
 */
export function useDismissOnPaymentChange({
  dismissOnPayTokenChange = true,
}: UseDismissOnPaymentChangeOptions = {}): void {
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
      !dismissOnPayTokenChange ||
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

    if (!navigation.isFocused()) {
      isDismissingRef.current = true;
      return;
    }

    isDismissingRef.current = true;
    navigation.goBack();
  }, [dismissOnPayTokenChange, navigation, payToken, selectedPaymentMethodId]);
}
