import {
  BottomSheet,
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { Theme, useTheme } from '@metamask/design-system-twrnc-preset';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;
const { HoursPerDay, MaximumDurationMinutes, MinutesPerHour } =
  PERPS_TWAP_UI_CONFIG;
const NativeCountdownReapplyOffsetMs = 1;
const NativeCountdownDateSearchDays = 7;

type CreateIosCountdownDateCandidate = (
  referenceMs: number,
  dayOffset: number,
  hours: number,
  minutes: number,
  milliseconds: number,
) => Date;

const createIosCountdownDateCandidate: CreateIosCountdownDateCandidate = (
  referenceMs,
  dayOffset,
  hours,
  minutes,
  milliseconds,
) => {
  const date = new Date(referenceMs);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, milliseconds);
  return date;
};

export const createFutureIosCountdownDate = (
  clockMinutes: number,
  referenceMs: number,
  reapplyAfterLayout: boolean,
  createCandidate: CreateIosCountdownDateCandidate = createIosCountdownDateCandidate,
) => {
  const requestedHours = Math.floor(clockMinutes / MinutesPerHour);
  const requestedMinutes = clockMinutes % MinutesPerHour;

  for (
    let dayOffset = 1;
    dayOffset <= NativeCountdownDateSearchDays;
    dayOffset++
  ) {
    const date = createCandidate(
      referenceMs,
      dayOffset,
      requestedHours,
      requestedMinutes,
      reapplyAfterLayout ? NativeCountdownReapplyOffsetMs : 0,
    );
    if (
      date.getTime() > referenceMs &&
      date.getHours() === requestedHours &&
      date.getMinutes() === requestedMinutes
    ) {
      return date;
    }
  }

  throw new Error('Unable to create a future iOS countdown date');
};

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
  const iosCountdownReferenceMs = useRef(Date.now()).current;
  const [isIosCountdownReady, setIsIosCountdownReady] = useState(false);
  const durationMinutes =
    (Number.parseInt(twap.days, 10) || 0) * HoursPerDay * MinutesPerHour +
    (Number.parseInt(twap.hours, 10) || 0) * MinutesPerHour +
    (Number.parseInt(twap.minutes, 10) || 0);
  // Android time mode wraps 0:00 to 24h. iOS countdown cannot display 24h,
  // so 23:59 is its safe display ceiling while the stored draft remains 24h.
  const pickerMinutes =
    durationMinutes === MaximumDurationMinutes
      ? Platform.OS === 'android'
        ? 0
        : MaximumDurationMinutes - 1
      : Math.min(durationMinutes, MaximumDurationMinutes - 1);
  const pickerValue =
    Platform.OS === 'ios'
      ? createFutureIosCountdownDate(
          pickerMinutes,
          iosCountdownReferenceMs,
          isIosCountdownReady,
        )
      : new Date(0);
  if (Platform.OS === 'android') {
    const pickerHours = Math.floor(pickerMinutes / MinutesPerHour);
    const remainingPickerMinutes = pickerMinutes % MinutesPerHour;
    pickerValue.setUTCHours(pickerHours, remainingPickerMinutes);
  }
  const themeVariant = theme === Theme.Dark ? 'dark' : 'light';
  const pickerModeProps =
    Platform.OS === 'ios'
      ? { mode: 'countdown' as const, themeVariant }
      : { mode: 'time' as const, is24Hour: true, timeZoneName: 'UTC' };

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handlePickerLayout = useCallback(() => {
    // Fabric applies `date` before `mode`. A 1 ms timestamp change after native
    // layout reapplies the same clock minute after countdown mode is mounted.
    setIsIosCountdownReady(true);
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const applyDuration = useCallback(
    (date: Date) => {
      const clockMinutes =
        Platform.OS === 'ios'
          ? date.getHours() * MinutesPerHour + date.getMinutes()
          : date.getUTCHours() * MinutesPerHour + date.getUTCMinutes();
      const isMaximumDuration = Platform.OS === 'android' && clockMinutes === 0;
      const isStoredIosMaximumAtDisplayCeiling =
        Platform.OS === 'ios' &&
        durationMinutes === MaximumDurationMinutes &&
        clockMinutes === MaximumDurationMinutes - 1;
      if (isStoredIosMaximumAtDisplayCeiling) {
        return;
      }
      twap.onDaysChange(isMaximumDuration ? '1' : '');
      twap.onHoursChange(
        String(
          isMaximumDuration ? 0 : Math.floor(clockMinutes / MinutesPerHour),
        ),
      );
      twap.onMinutesChange(String(clockMinutes % MinutesPerHour));
    },
    [durationMinutes, twap],
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
      <Box twClassName="items-end px-4 pt-1">
        <ButtonIcon
          iconName={IconName.ArrowDown}
          size={ButtonIconSize.Md}
          onPress={handleClose}
          testID={ids.TWAP_DURATION_SHEET_CLOSE}
          accessibilityLabel={strings('perps.pro_order_form.twap.running_time')}
        />
      </Box>
      <Box twClassName="items-center gap-3 px-4 pb-4">
        <DateTimePicker
          testID={ids.TWAP_DURATION_PICKER}
          value={pickerValue}
          display="spinner"
          onChange={handleChange}
          onLayout={handlePickerLayout}
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
