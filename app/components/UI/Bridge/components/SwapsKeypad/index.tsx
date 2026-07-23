import React, {
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  PropsWithChildren,
} from 'react';
import {
  BottomSheetDialog,
  type BottomSheetDialogRef,
  Box,
} from '@metamask/design-system-react-native';
import Keypad, { KeypadChangeData } from '../../../../Base/Keypad';
import { SwapsKeypadRef } from './types';

interface SwapsKeypadProps {
  value: string;
  currency: string;
  decimals: number;
  onChange: (data: KeypadChangeData) => void;
}

export const SwapsKeypad = forwardRef<
  SwapsKeypadRef,
  PropsWithChildren<SwapsKeypadProps>
>(({ value, currency, decimals, onChange, children }, ref) => {
  const bottomSheetRef = useRef<BottomSheetDialogRef>(null);
  const isOpenRef = useRef(false);
  const [isRendered, setIsRendered] = useState(false);

  const handleClose = useCallback(() => {
    isOpenRef.current = false;
    setIsRendered(false);
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      if (!isOpenRef.current) {
        setIsRendered(true);
        isOpenRef.current = true;
      }
    },
    close: () => {
      if (isOpenRef.current) {
        bottomSheetRef.current?.onCloseDialog();
      }
    },
    isOpen: () => isOpenRef.current,
  }));

  if (!isRendered) {
    return null;
  }

  return (
    <BottomSheetDialog
      ref={bottomSheetRef}
      isInteractable={false}
      onClose={handleClose}
      onStartShouldSetResponder={() =>
        // Prevents the native gesture system from bubbling up
        // the event to BottomSheetDialog, causing keypad to close
        // when user click anywhere inside the keypad area that is
        // not a pressable component.
        // This is required because
        true
      }
    >
      <Box twClassName="content-end px-4 gap-4 pt-4">
        {children}
        <Keypad
          value={value}
          onChange={onChange}
          currency={currency}
          decimals={decimals}
        />
      </Box>
    </BottomSheetDialog>
  );
});
