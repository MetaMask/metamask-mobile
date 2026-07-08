import { useNavigation } from '@react-navigation/native';
import { type Dispatch, type SetStateAction, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useConfirmationContext } from '../../context/confirmation-context';

const useMMPayNavigation = (
  isKeyboardVisible: boolean,
  setIsKeyboardVisible: Dispatch<SetStateAction<boolean>>,
) => {
  const navigation = useNavigation();
  const { mmPayRequestInProgressNavHandler } = useConfirmationContext();

  useEffect(() => {
    const showKeyboard = () => setIsKeyboardVisible(true);

    mmPayRequestInProgressNavHandler.current = isKeyboardVisible
      ? false
      : showKeyboard;
    navigation.setOptions({ gestureEnabled: isKeyboardVisible });

    if (isKeyboardVisible) {
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
  ]);
};

export default useMMPayNavigation;
