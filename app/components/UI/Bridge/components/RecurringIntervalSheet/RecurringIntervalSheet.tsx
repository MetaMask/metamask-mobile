import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BottomSheet,
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

/** Matches the limit-order expiration sheet, so the new check is visible before close. */
const RECURRING_INTERVAL_CLOSE_DELAY_MS = 250;

const RecurringIntervalSheet = ({
  currentUnit,
  onSelect,
  goBack,
}: RecurringIntervalSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUnit, setSelectedUnit] =
    useState<RecurringIntervalUnit>(currentUnit);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  const handleSelect = useCallback(
    (unit: RecurringIntervalUnit) => {
      setSelectedUnit(unit);
      if (unit !== currentUnit) {
        onSelect(unit);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = setTimeout(
        closeSheet,
        RECURRING_INTERVAL_CLOSE_DELAY_MS,
      );
    },
    [closeSheet, currentUnit, onSelect],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringIntervalSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringIntervalSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.every')}
      </BottomSheetHeader>
      <Box paddingBottom={2}>
        {RECURRING_INTERVAL_UNITS.map((unit) => (
          <ListItemSelect
            key={unit}
            title={strings(`bridge.recurring.unit_option.${unit}`)}
            isSelected={selectedUnit === unit}
            showSelectedIcon
            onPress={() => handleSelect(unit)}
            testID={RecurringIntervalSheetSelectorsIDs.OPTION(unit)}
          />
        ))}
      </Box>
    </BottomSheet>
  );
};

export default RecurringIntervalSheet;
