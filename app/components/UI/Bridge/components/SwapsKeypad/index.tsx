import React, {
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  PropsWithChildren,
} from 'react';
import Keypad, { KeypadChangeData } from '../../../../Base/Keypad';
import { Box } from '../../../Box/Box';
import { createSwapsKeypadStyles } from './styles';
import { SwapsKeypadRef } from './types';
import { useTheme } from '../../../../../util/theme';
import BottomSheetDialog from '../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog';
import { BottomSheetDialogRef } from '../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog';

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
  const theme = useTheme();
  const styles = createSwapsKeypadStyles(theme);
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
      style={styles.keypadDialog}
      ref={bottomSheetRef}
      isInteractable
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
      <Box style={styles.keypadContainer}>
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
