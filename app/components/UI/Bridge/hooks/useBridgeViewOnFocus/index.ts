import { useFocusEffect } from '@react-navigation/native';
import { RefObject, useCallback, useRef } from 'react';
import { TokenInputAreaRef } from '../../components/TokenInputArea';
import { SwapsKeypadRef } from '../../components/SwapsKeypad/types';

interface Params {
  inputRef: RefObject<TokenInputAreaRef>;
  keypadRef: RefObject<SwapsKeypadRef>;
}

export const useBridgeViewOnFocus = ({ inputRef, keypadRef }: Params) => {
  // Track whether this is the very first time the screen gains focus
  const isFirstFocus = useRef(true);
  // Track whether the keypad was open before the screen lost focus,
  // so we can restore the correct state when navigating back
  const wasKeypadOpenBeforeBlur = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        // Always auto-focus and open keypad on initial mount
        isFirstFocus.current = false;
        inputRef.current?.focus();
        keypadRef.current?.open();
      } else if (wasKeypadOpenBeforeBlur.current) {
        // Only restore focus/keypad if it was open before navigating away
        inputRef.current?.focus();
        keypadRef.current?.open();
      }
      return () => {
        // Capture keypad state before closing so we can restore it later
        wasKeypadOpenBeforeBlur.current = keypadRef.current?.isOpen() ?? false;
        inputRef.current?.blur();
        keypadRef.current?.close();
      };
    }, [inputRef, keypadRef]),
  );
};
