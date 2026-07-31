import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useConfirmationContext } from '../../context/confirmation-context';
import { CustomAmountStage } from '../custom-amount/useCustomAmountStage';

const useMMPayNavigation = (
  stage: CustomAmountStage,
  setStage: Dispatch<SetStateAction<CustomAmountStage | null>>,
  skipBackToAmountInput = false,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { mmPayRequestInProgressNavHandler } = useConfirmationContext();

  const isAmountInput = stage === CustomAmountStage.AmountInput;

  // Track whether the amount input has ever been shown, so the back gesture is
  // allowed to leave the screen before the user has had a chance to edit.
  const wasAmountInputVisibleRef = useRef(isAmountInput);
  if (isAmountInput) {
    wasAmountInputVisibleRef.current = true;
  }

  useEffect(() => {
    const showAmountInput = () => setStage(CustomAmountStage.AmountInput);
    const neverShown = !wasAmountInputVisibleRef.current;

    const allowBack = isAmountInput || skipBackToAmountInput || neverShown;
    mmPayRequestInProgressNavHandler.current = allowBack
      ? false
      : showAmountInput;
    navigation.setOptions({
      gestureEnabled: !!allowBack,
    });

    if (isAmountInput || neverShown) {
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
