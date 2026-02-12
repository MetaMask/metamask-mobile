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

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        // Always auto-focus and open keypad on initial mount
        isFirstFocus.current = false;
        inputRef.current?.focus();
        keypadRef.current?.open();
      }

      return () => {
        inputRef.current?.blur();
        keypadRef.current?.close();
      };
    }, [inputRef, keypadRef]),
  );
};
