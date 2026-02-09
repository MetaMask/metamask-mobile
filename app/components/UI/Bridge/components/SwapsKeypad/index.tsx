import React, {
  useMemo,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';
import Keypad, { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { Box } from '../../../Box/Box';
import { createSwapsKeypadStyles } from './styles';
import { QuickPickButtons } from './QuickPickButtons';
import { BridgeToken } from '../../types';
import { QuickPickButtonOption, SwapsKeypadRef } from './types';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BigNumber } from 'bignumber.js';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { useTheme } from '../../../../../util/theme';
import BottomSheetDialog from '../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog';
import { BottomSheetDialogRef } from '../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog';

interface SwapsKeypadProps {
  value: string;
  currency: string;
  decimals: number;
  onChange: (data: KeypadChangeData) => void;
  token?: BridgeToken;
  tokenBalance: ReturnType<typeof useLatestBalance>;
  onMaxPress: () => void;
  isQuoteSponsored?: boolean;
}

export const SwapsKeypad = forwardRef<SwapsKeypadRef, SwapsKeypadProps>(
  (
    {
      value,
      currency,
      decimals,
      onChange,
      token,
      tokenBalance,
      onMaxPress,
      isQuoteSponsored,
    },
    ref,
  ) => {
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

    const onQuickOptionPress = useCallback(
      (percentage: number) => () => {
        if (!tokenBalance?.displayBalance) return '0';

        const balance = new BigNumber(tokenBalance.displayBalance);
        const amount = balance.multipliedBy(percentage / 100);

        onChange({
          value: amount.toString(),
          valueAsNumber: Number(amount),
          pressedKey: Keys.Initial,
        });
      },
      [tokenBalance, onChange],
    );

    const standardQuickPickOptions = useMemo(
      () =>
        [
          {
            label: '25%',
            onPress: onQuickOptionPress(25),
          },
          {
            label: '50%',
            onPress: onQuickOptionPress(50),
          },
          {
            label: '75%',
            onPress: onQuickOptionPress(75),
          },
          {
            label: '90%',
            onPress: onQuickOptionPress(90),
          },
        ] satisfies QuickPickButtonOption[],
      [onQuickOptionPress],
    );

    const gasslessQuickPickOptions = useMemo(
      () =>
        [
          {
            label: '25%',
            onPress: onQuickOptionPress(25),
          },
          {
            label: '50%',
            onPress: onQuickOptionPress(50),
          },
          {
            label: '75%',
            onPress: onQuickOptionPress(75),
          },
          {
            label: 'Max',
            onPress: onMaxPress,
          },
        ] satisfies QuickPickButtonOption[],
      [onMaxPress, onQuickOptionPress],
    );

    const shouldRenderQuickPickOptions = useMemo(
      () => new BigNumber(tokenBalance?.displayBalance || 0).gt(0),
      [tokenBalance],
    );

    const shouldRenderMaxOption = useShouldRenderMaxOption(
      token,
      tokenBalance?.displayBalance,
      isQuoteSponsored,
    );
    const quickPickOptions = shouldRenderMaxOption
      ? gasslessQuickPickOptions
      : standardQuickPickOptions;

    if (!isRendered) {
      return null;
    }

    return (
      <BottomSheetDialog
        style={styles.keypadDialog}
        ref={bottomSheetRef}
        isInteractable
        onClose={handleClose}
      >
        <Box style={styles.keypadContainer}>
          <QuickPickButtons
            options={quickPickOptions}
            show={shouldRenderQuickPickOptions}
          />
          <Keypad
            value={value}
            onChange={onChange}
            currency={currency}
            decimals={decimals}
          />
        </Box>
      </BottomSheetDialog>
    );
  },
);
