import { RefObject, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import { useTransactionPayToken } from './useTransactionPayToken';

/**
 * Dismisses the current navigation route whenever the active transaction's
 * pay token changes after the component mounts. Used by `PayWithBottomSheet`
 * so that picking a token in the underlying `PayWithModal` collapses the
 * picker stack back to the confirmation screen.
 *
 * The initial `payToken` is captured on mount, so the hook does not fire
 * for the value that was already on the controller when the sheet opened.
 */
export function useDismissOnPayTokenChange(
  dismissedRef?: RefObject<boolean>,
): void {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const initialPayTokenRef = useRef(payToken);
  const localDismissedRef = useRef<boolean>(false);
  const effectiveDismissedRef: { current: boolean } =
    dismissedRef ?? localDismissedRef;

  useEffect(() => {
    if (effectiveDismissedRef.current) {
      return;
    }

    const initial = initialPayTokenRef.current;
    const matchesInitial =
      (!initial && !payToken) ||
      (!!initial &&
        !!payToken &&
        isMatchingPayToken(payToken, {
          address: initial.address,
          chainId: initial.chainId,
        }));

    if (matchesInitial) {
      return;
    }

    effectiveDismissedRef.current = true;
    navigation.goBack();
  }, [effectiveDismissedRef, navigation, payToken]);
}
