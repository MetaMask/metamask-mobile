import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  Icon,
  IconName,
  IconSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  Theme,
  useTailwind,
  useTheme,
} from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import SelectField from './SelectField';
import CardFormField from './CardFormField';

const MAXIMUM_DATE = new Date(Date.now());
const MINIMUM_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(2000, 0, 1);

const formatDateForDisplay = (date: Date, locale = I18n.locale): string =>
  getIntlDateTimeFormatter(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);

interface CardDateFieldProps {
  label: string;
  /** Epoch milliseconds as a string (same contract as Ramp DepositDateField). */
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  testID?: string;
  errorTestID?: string;
}

/**
 * Date-of-birth style field built on the Card SelectField trigger so it
 * matches the other MMDS fields (label, 48pt field, HelpText) instead of the
 * Ramp DepositDateField, which renders the legacy TextField and its own label
 * and margins. Opens the native date picker: the system dialog on Android;
 * on iOS a spinner inside an MMDS BottomSheet (header with the field label
 * and close, footer Cancel / OK), hosted in a transparent Modal as the shipped
 * Perps TWAP duration sheet does. The spinner follows the app theme via
 * `themeVariant`.
 */
const CardDateField = ({
  label,
  value,
  onChangeText,
  error,
  testID,
  errorTestID,
}: CardDateFieldProps) => {
  const tw = useTailwind();
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const themeVariant = theme === Theme.Dark ? 'dark' : 'light';

  const valueAsDate = useMemo(() => {
    if (!value || value.trim() === '') {
      return null;
    }
    const date = new Date(Number(value));
    return isNaN(date.getTime()) ? null : date;
  }, [value]);

  const openPicker = useCallback(() => {
    setPendingDate(valueAsDate ?? DEFAULT_DATE);
    setIsPickerOpen(true);
  }, [valueAsDate]);

  // Unmounts the picker; on iOS this runs from the sheet's onClose, after
  // its exit animation.
  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPendingDate(null);
  }, []);

  const commit = useCallback(
    (date?: Date | null) => {
      if (date) {
        onChangeText(date.getTime().toString());
      }
      closePicker();
    },
    [onChangeText, closePicker],
  );

  const dismissSheet = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.onCloseBottomSheet();
    } else {
      closePicker();
    }
  }, [closePicker]);

  const confirmSheet = useCallback(() => {
    const date = pendingDate;
    if (sheetRef.current) {
      sheetRef.current.onCloseBottomSheet(() => commit(date));
    } else {
      commit(date);
    }
  }, [commit, pendingDate]);

  return (
    <>
      <CardFormField
        label={label}
        errorText={error || null}
        errorTestID={errorTestID}
      >
        <SelectField
          value={valueAsDate ? formatDateForDisplay(valueAsDate) : undefined}
          placeholder={formatDateForDisplay(DEFAULT_DATE)}
          onPress={openPicker}
          isError={Boolean(error)}
          hideIcon
          startAccessory={<Icon name={IconName.Calendar} size={IconSize.Md} />}
          accessibilityLabel={
            valueAsDate
              ? `${label}, ${formatDateForDisplay(valueAsDate)}`
              : label
          }
          testID={testID}
        />
      </CardFormField>

      {Platform.OS === 'android' && isPickerOpen && (
        <DateTimePicker
          value={valueAsDate ?? DEFAULT_DATE}
          mode="date"
          display="default"
          // The Android dialog also fires onChange on cancel ('dismissed'),
          // passing the original value back. Only a confirmed pick ('set') is
          // saved; anything else just closes the dialog.
          onChange={(event, date) =>
            event.type === 'set' ? commit(date) : closePicker()
          }
          maximumDate={MAXIMUM_DATE}
          minimumDate={MINIMUM_DATE}
        />
      )}

      {Platform.OS === 'ios' && isPickerOpen && (
        // The plain View keeps transparent Modals stable on Android, matching
        // PerpsProModalPortal.
        <View>
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={dismissSheet}
          >
            <ModalSafeAreaProvider>
              <GestureHandlerRootView style={tw.style('flex-1')}>
                <BottomSheet
                  ref={sheetRef}
                  onClose={closePicker}
                  testID={testID ? `${testID}-sheet` : undefined}
                >
                  <BottomSheetHeader
                    onClose={dismissSheet}
                    closeButtonProps={{
                      testID: testID ? `${testID}-sheet-close` : undefined,
                    }}
                  >
                    {label}
                  </BottomSheetHeader>
                  <Box twClassName="items-center px-4">
                    <DateTimePicker
                      value={pendingDate ?? valueAsDate ?? DEFAULT_DATE}
                      mode="date"
                      display="spinner"
                      themeVariant={themeVariant}
                      onChange={(_, date) => setPendingDate(date ?? null)}
                      maximumDate={MAXIMUM_DATE}
                      minimumDate={MINIMUM_DATE}
                    />
                  </Box>
                  <BottomSheetFooter
                    secondaryButtonProps={{
                      children: strings('navigation.cancel'),
                      onPress: dismissSheet,
                      testID: testID ? `${testID}-cancel` : undefined,
                    }}
                    primaryButtonProps={{
                      children: strings('navigation.ok'),
                      onPress: confirmSheet,
                      testID: testID ? `${testID}-confirm` : undefined,
                    }}
                  />
                </BottomSheet>
              </GestureHandlerRootView>
            </ModalSafeAreaProvider>
          </Modal>
        </View>
      )}
    </>
  );
};

export default CardDateField;
