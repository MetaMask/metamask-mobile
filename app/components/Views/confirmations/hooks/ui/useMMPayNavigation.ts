import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { type Dispatch, type SetStateAction, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useConfirmationContext } from '../../context/confirmation-context';
import { CustomAmountStage } from '../custom-amount/useCustomAmountStage';

/**
 * Intercepts navbar / hardware / gesture back on MM Pay review stages so the
 * user returns to the amount page instead of dismissing the confirmation.
 * On the amount page, back leaves the flow as usual.
 *
 * @param stage - Current custom-amount UI stage.
 * @param setStage - Stage setter; used to reopen AmountInput on back.
 * @param skipBackToAmountInput - When true, skip interception (leave on back).
 */
const useMMPayNavigation = (
  stage: CustomAmountStage,
  setStage: Dispatch<SetStateAction<CustomAmountStage | null>>,
  skipBackToAmountInput = false,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { mmPayRequestInProgressNavHandler } = useConfirmationContext();

  const isAmountInput = stage === CustomAmountStage.AmountInput;

  useEffect(() => {
    const showAmountInput = () => setStage(CustomAmountStage.AmountInput);

    // Amount page (or explicit skip): allow normal leave/reject. Review stages
    // (Loading / ShowTotals / NoQuote): intercept and reopen amount input —
    // including deposit-prefill flows that never showed AmountInput first.
    const allowBack = isAmountInput || skipBackToAmountInput;
    mmPayRequestInProgressNavHandler.current = allowBack
      ? false
      : showAmountInput;
    navigation.setOptions({
      gestureEnabled: !!allowBack,
    });

    if (allowBack) {
      return () => {
        mmPayRequestInProgressNavHandler.current = false;
      };
    }

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mmPayRequestInProgressNavHandler.current) {
        showAmountInput();
        return true;
      }
      return false;
    });

    return () => {
      mmPayRequestInProgressNavHandler.current = false;
      backSub.remove();
    };
  }, [
    mmPayRequestInProgressNavHandler,
    isAmountInput,
    navigation,
    setStage,
    skipBackToAmountInput,
  ]);
};

export default useMMPayNavigation;
