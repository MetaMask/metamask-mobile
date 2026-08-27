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
  const durationMinutes =
    (Number.parseInt(twap.days, 10) || 0) * HoursPerDay * MinutesPerHour +
    (Number.parseInt(twap.hours, 10) || 0) * MinutesPerHour +
    (Number.parseInt(twap.minutes, 10) || 0);
  const pickerValue = new Date(0);
  // Native duration pickers end at 23:59; the controller still accepts 24h.
  const pickerMinutes = Math.min(durationMinutes, MaximumDurationMinutes - 1);
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

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'set' && date) {
        const nextMinutes =
          date.getUTCHours() * MinutesPerHour + date.getUTCMinutes();
        twap.onDaysChange('');
        twap.onHoursChange(String(Math.floor(nextMinutes / MinutesPerHour)));
        twap.onMinutesChange(String(nextMinutes % MinutesPerHour));
      }
      if (Platform.OS === 'android') {
        handleClose();
      }
    },
    [handleClose, twap],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
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
