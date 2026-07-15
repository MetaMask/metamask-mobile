import { useFocusEffect } from '@react-navigation/native';
import { RefObject, useCallback, useRef } from 'react';
import { TokenInputAreaRef } from '../../components/TokenInputArea';
import { SwapsKeypadRef } from '../../components/SwapsKeypad/types';

interface Params {
  inputRef: RefObject<TokenInputAreaRef | null>;
  keypadRef: RefObject<SwapsKeypadRef | null>;
  autoFocusSourceAmountInput?: boolean;
}

export const useBridgeViewOnFocus = ({
  inputRef,
  keypadRef,
  autoFocusSourceAmountInput = false,
}: Params) => {
  const hasAutoFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (autoFocusSourceAmountInput && !hasAutoFocusedRef.current) {
        const input = inputRef.current;
        const keypad = keypadRef.current;

        input?.focus();
        keypad?.open();

        if (input && keypad) {
          hasAutoFocusedRef.current = true;
        }
      }

      return () => {
        inputRef.current?.blur();
        keypadRef.current?.close();
      };
    }, [autoFocusSourceAmountInput, inputRef, keypadRef]),
  );
};
