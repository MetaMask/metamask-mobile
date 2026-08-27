import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { Theme, useTheme } from '@metamask/design-system-twrnc-preset';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;
const { HoursPerDay, MaximumDurationMinutes, MinutesPerHour } =
  PERPS_TWAP_UI_CONFIG;

interface PerpsProTwapDurationBottomSheetProps {
  twap: PerpsProTwapModel;
  onClose: () => void;
}

const PerpsProTwapDurationBottomSheet = ({
  twap,
  onClose,
}: PerpsProTwapDurationBottomSheetProps) => {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetRef>(null);
  const pendingAndroidDateRef = useRef<Date | undefined>(undefined);
  const durationMinutes =
    (Number.parseInt(twap.days, 10) || 0) * HoursPerDay * MinutesPerHour +
    (Number.parseInt(twap.hours, 10) || 0) * MinutesPerHour +
    (Number.parseInt(twap.minutes, 10) || 0);
  const pickerValue = new Date(0);
  // The native clock wraps at midnight, so 0:00 represents the 24h maximum.
  const pickerMinutes =
    durationMinutes === MaximumDurationMinutes
      ? 0
      : Math.min(durationMinutes, MaximumDurationMinutes - 1);
  pickerValue.setUTCHours(
    Math.floor(pickerMinutes / MinutesPerHour),
    pickerMinutes % MinutesPerHour,
  );
  const themeVariant = theme === Theme.Dark ? 'dark' : 'light';
  const pickerModeProps =
    Platform.OS === 'ios'
      ? { mode: 'countdown' as const, themeVariant }
      : { mode: 'time' as const, is24Hour: true };

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const applyDuration = useCallback(
    (date: Date) => {
      const clockMinutes =
        date.getUTCHours() * MinutesPerHour + date.getUTCMinutes();
      const isMaximumDuration = clockMinutes === 0;
      twap.onDaysChange(isMaximumDuration ? '1' : '');
      twap.onHoursChange(String(isMaximumDuration ? 0 : date.getUTCHours()));
      twap.onMinutesChange(String(date.getUTCMinutes()));
    },
    [twap],
  );

  const handleSheetClose = useCallback(() => {
    const pendingAndroidDate = pendingAndroidDateRef.current;
    pendingAndroidDateRef.current = undefined;
    onClose();
    if (pendingAndroidDate) {
      applyDuration(pendingAndroidDate);
    }
  }, [applyDuration, onClose]);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        pendingAndroidDateRef.current = event.type === 'set' ? date : undefined;
        handleClose();
      } else if (event.type === 'set' && date) {
        applyDuration(date);
      }
    },
    [applyDuration, handleClose],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleSheetClose}
      testID={ids.TWAP_DURATION_SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: ids.TWAP_DURATION_SHEET_CLOSE }}
      >
        {strings('perps.pro_order_form.twap.running_time')}
      </BottomSheetHeader>
      <Box twClassName="items-center gap-3 px-4 pb-4">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings(
            'perps.pro_order_form.twap.valid_range',
            PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
          )}
        </Text>
        <DateTimePicker
          testID={ids.TWAP_DURATION_PICKER}
          value={pickerValue}
          display="spinner"
          timeZoneName="UTC"
          onChange={handleChange}
          {...pickerModeProps}
        />
        {twap.durationError ? (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.ErrorDefault}
            testID={ids.TWAP_DURATION_ERROR}
          >
            {twap.durationError}
          </Text>
        ) : null}
      </Box>
    </BottomSheet>
  );
};

export default PerpsProTwapDurationBottomSheet;
