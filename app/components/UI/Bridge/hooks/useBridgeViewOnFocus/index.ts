import { useFocusEffect } from '@react-navigation/native';
import { RefObject, useCallback } from 'react';
import { TokenInputAreaRef } from '../../components/TokenInputArea';
import { SwapsKeypadRef } from '../../components/SwapsKeypad/types';

interface Params {
  inputRef: RefObject<TokenInputAreaRef>;
  keypadRef: RefObject<SwapsKeypadRef>;
}

export const useBridgeViewOnFocus = ({ inputRef, keypadRef }: Params) => {
  useFocusEffect(
    useCallback(
      () => () => {
        inputRef.current?.blur();
        keypadRef.current?.close();
      },
      [inputRef, keypadRef],
    ),
  );
};
