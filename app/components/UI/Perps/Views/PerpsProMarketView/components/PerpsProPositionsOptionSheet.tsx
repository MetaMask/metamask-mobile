import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  ButtonsAlignment,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import PerpsProModalPortal from './PerpsProModalPortal';
import { ImpactMoment, useHaptics } from '../../../../../../util/haptics';

export interface PerpsProPositionsOptionSheetProps {
  isVisible: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void;
  onClear?: () => void;
  onOpen?: () => void;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Shared modal bottom sheet shell for Pro positions filter/sort controls.
 */
const PerpsProPositionsOptionSheet = ({
  isVisible,
  title,
  onClose,
  onApply,
  onClear,
  onOpen,
  testID = 'perps-pro-positions-option-sheet',
  children,
}: PerpsProPositionsOptionSheetProps) => {
  const { playImpact, playSelection } = useHaptics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    const justOpened = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;

    if (!justOpened) {
      return;
    }

    onOpen?.();
    sheetRef.current?.onOpenBottomSheet();
  }, [isVisible, onOpen]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleApply = useCallback(() => {
    playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    onApply();
    handleClose();
  }, [handleClose, onApply, playImpact]);

  const handleClear = useCallback(() => {
    if (!onClear) {
      return;
    }
    playSelection().catch(() => undefined);
    onClear();
    handleClose();
  }, [handleClose, onClear, playSelection]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.apply'),
      onPress: handleApply,
      testID: `${testID}-apply`,
    }),
    [handleApply, testID],
  );

  const secondaryButtonProps = useMemo(
    () =>
      onClear
        ? {
            children: strings('perps.sort.clear'),
            onPress: handleClear,
            testID: `${testID}-clear`,
          }
        : undefined,
    [handleClear, onClear, testID],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <PerpsProModalPortal onRequestClose={handleClose}>
      <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
        <BottomSheetHeader
          onClose={handleClose}
          closeButtonProps={{ testID: `${testID}-close` }}
        >
          {title}
        </BottomSheetHeader>

        {children}

        <BottomSheetFooter
          primaryButtonProps={primaryButtonProps}
          secondaryButtonProps={secondaryButtonProps}
          buttonsAlignment={
            secondaryButtonProps ? ButtonsAlignment.Horizontal : undefined
          }
          twClassName="pt-4"
        />
      </BottomSheet>
    </PerpsProModalPortal>
  );
};

export default PerpsProPositionsOptionSheet;
