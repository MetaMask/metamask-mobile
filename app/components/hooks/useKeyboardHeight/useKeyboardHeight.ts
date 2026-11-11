import { useEffect, useState, useCallback } from 'react';
import { Dimensions, Keyboard, KeyboardEvent } from 'react-native';

export const useKeyboardHeight = (): number => {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  const handleKeyboardDidShow = useCallback((event: KeyboardEvent) => {
    const { height, screenY } = event.endCoordinates;
    const screenHeight = Dimensions.get('screen').height;
    // Android's reported height can stop short of the drawn keyboard. The
    // distance from the keyboard's top to the bottom of the screen is the
    // space the composer bar actually has to clear.
    const overlap =
      screenY > 0 && screenY < screenHeight ? screenHeight - screenY : 0;
    setKeyboardHeight(Math.max(height, overlap));
  }, []);

  const handleKeyboardDidHide = useCallback(() => {
    setKeyboardHeight(0);
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardDidShow,
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      handleKeyboardDidHide,
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [handleKeyboardDidShow, handleKeyboardDidHide]);

  return keyboardHeight;
};
