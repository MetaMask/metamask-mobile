import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  RECURRING_INTERVAL_UNITS,
  type RecurringIntervalUnit,
} from '../../utils/recurringSchedule';
import { RecurringIntervalSheetSelectorsIDs } from './RecurringIntervalSheet.testIds';
import type { RecurringIntervalSheetProps } from './RecurringIntervalSheet.types';

const RecurringIntervalSheet = ({
  isVisible,
  currentUnit,
  onClose,
  onConfirm,
}: RecurringIntervalSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [pendingUnit, setPendingUnit] =
    useState<RecurringIntervalUnit>(currentUnit);

  useEffect(() => {
    if (isVisible) {
      setPendingUnit(currentUnit);
    }
  }, [currentUnit, isVisible]);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(pendingUnit);
    closeSheet();
  }, [closeSheet, onConfirm, pendingUnit]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringIntervalSheetSelectorsIDs.SHEET}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringIntervalSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.every')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingBottom={2}>
        {RECURRING_INTERVAL_UNITS.map((unit) => (
          <ListItemSelect
            key={unit}
            title={strings(`bridge.recurring.unit_option.${unit}`)}
            isSelected={pendingUnit === unit}
            showSelectedIcon
            onPress={() => setPendingUnit(unit)}
            testID={RecurringIntervalSheetSelectorsIDs.OPTION(unit)}
          />
        ))}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.recurring.confirm'),
          onPress: handleConfirm,
          testID: RecurringIntervalSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default RecurringIntervalSheet;
