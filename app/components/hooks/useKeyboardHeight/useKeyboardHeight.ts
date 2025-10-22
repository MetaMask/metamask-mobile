import { useEffect, useState, useCallback } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

export const useKeyboardHeight = (): number => {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  const handleKeyboardDidShow = useCallback((event: KeyboardEvent) => {
    setKeyboardHeight(event.endCoordinates.height);
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
