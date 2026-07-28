import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
} from 'react';
import { BackHandler } from 'react-native';
import { useConfirmationContext } from '../../context/confirmation-context';

const useMMPayNavigation = (
  isKeyboardVisible: boolean,
  setIsKeyboardVisible: Dispatch<SetStateAction<boolean>>,
  keyboardEverShown?: MutableRefObject<boolean>,
  skipBackToKeyboard = false,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { mmPayRequestInProgressNavHandler } = useConfirmationContext();

  useEffect(() => {
    const showKeyboard = () => setIsKeyboardVisible(true);
    const neverShown = keyboardEverShown && !keyboardEverShown.current;

    const allowBack = isKeyboardVisible || skipBackToKeyboard || neverShown;
    mmPayRequestInProgressNavHandler.current = allowBack ? false : showKeyboard;
    navigation.setOptions({
      gestureEnabled: !!allowBack,
    });

    if (isKeyboardVisible || neverShown) {
      return () => {
        mmPayRequestInProgressNavHandler.current = false;
      };
    }

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mmPayRequestInProgressNavHandler.current) {
        showKeyboard();
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
    isKeyboardVisible,
    navigation,
    setIsKeyboardVisible,
    keyboardEverShown,
    skipBackToKeyboard,
  ]);
};

export default useMMPayNavigation;
