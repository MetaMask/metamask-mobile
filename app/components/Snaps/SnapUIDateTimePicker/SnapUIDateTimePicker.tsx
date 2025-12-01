import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { DateTime } from 'luxon';
import { Box } from '@metamask/design-system-react-native';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';
import stylesheet from './SnapUIDateTimePicker.styles';
import ApprovalModal from '../../Approvals/ApprovalModal';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../hooks/useStyles';

/**
 * The props for the SnapUIDateTimePicker component.
 */
export interface SnapUIDateTimePickerProps {
  name: string;
  type: 'date' | 'time' | 'datetime';
  label?: string;
  error?: string;
  placeholder?: string;
  form?: string;
  disablePast?: boolean;
  disableFuture?: boolean;
  disabled?: boolean;
}

const formatDateForDisplay = (
  date: Date | null,
  type: 'date' | 'time' | 'datetime',
) => {
  if (!date) {
    return undefined;
  }
  switch (type) {
    case 'date':
      return DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_SHORT);
    case 'time':
      return DateTime.fromJSDate(date).toLocaleString(DateTime.TIME_SIMPLE);
    case 'datetime':
      return DateTime.fromJSDate(date).toLocaleString(DateTime.DATETIME_SHORT);
  }
};

/**
 * The SnapUIDateTimePicker component.
 *
 * @param props - The component props.
 * @param props.name - The name of the input.
 * @param props.type - The type of the picker (date, time, datetime).
 * @param props.label - The label for the picker.
 * @param props.form - The form identifier.
 * @param props.disabled - Whether the picker is disabled.
 * @param props.error - The error message to display.
 * @param props.disablePast - Whether to disable past dates (only for date and datetime types).
 * @param props.disableFuture - Whether to disable future dates (only for date and datetime types).
 * @param props.placeholder - The placeholder text for the picker.
 * @returns The DateTimePicker component.
 */
export const SnapUIDateTimePicker: FunctionComponent<
  SnapUIDateTimePickerProps
> = ({
  type = 'datetime',
  label,
  placeholder,
  name,
  form,
  disabled,
  error,
  disablePast = false,
  disableFuture = false,
}) => {
  const { handleInputChange, getValue, setCurrentFocusedInput } =
    useSnapInterfaceContext();

  const { styles } = useStyles(stylesheet, {});

  const inputRef = useRef<TextInput>(null);

  const initialValue = getValue(name, form) as string;

  const [value, setValue] = useState<Date | null>(
    initialValue ? new Date(initialValue) : null,
  );

  const [androidMode, setAndroidMode] = useState<'date' | 'time' | undefined>(
    type === 'datetime' ? 'date' : type,
  );

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      setValue(new Date(initialValue));
    }
  }, [initialValue]);

  /**
   * Handles internal value change for iOS picker.
   * Since iOS picker is displayed in a bottom sheet,
   * we only submit the value when the user confirms.
   * @param _event - The date time picker event.
   * @param date - The selected date.
   */
  const handleIosChange = (
    _event: DateTimePickerEvent,
    date: Date | undefined,
  ) => {
    setValue(date ?? null);
  };

  /**
   * Submits the internal value to the snap.
   */
  const submitInternalValue = () => {
    const isoString = value ? DateTime.fromJSDate(value).toISO() : null;

    handleInputChange(name, isoString, form);
    setShowDatePicker(false);
  };

  /**
   * Handles value change for Android picker.
   * Handles the two-step process for datetime type as no native datetime picker is available on Android.
   * @param event - The date time picker event.
   * @param date - The selected date.
   * @returns void.
   */
  const handleAndroidChange = (
    event: DateTimePickerEvent,
    date: Date | undefined,
  ) => {
    if (!date) return;

    if (type === 'datetime' && androidMode === 'date' && event.type === 'set') {
      setValue(date);
      setAndroidMode('time');
      return;
    }

    if (type === 'datetime' && androidMode === 'time' && event.type === 'set') {
      const selectedDate = new Date(value ?? new Date());
      selectedDate.setTime(date.getTime());

      setValue(selectedDate);
      setAndroidMode('date');

      const isoString = DateTime.fromJSDate(selectedDate).toISO();

      handleInputChange(name, isoString, form);
      setShowDatePicker(false);
      return;
    }

    if (event.type === 'set') {
      const isoString = DateTime.fromJSDate(date).toISO();

      setValue(date);
      handleInputChange(name, isoString, form);
    }

    setShowDatePicker(false);
  };

  /**
   * Handles opening the picker.
   */
  const handleOpenIosPicker = () => {
    setShowDatePicker(true);

    // If no value is set, default to current date/time.
    if (value === null) {
      setValue(new Date());
    }
  };

  /**
   * Handles opening the picker.
   */
  const handleOpenAndroidPicker = () => {
    setShowDatePicker(true);
  };

  /**
   * Handles closing the picker.
   * Submits the internal value before closing.
   */
  const handleClosePicker = () => {
    submitInternalValue();
    setShowDatePicker(false);

    // Revert to initial value if the user cancels.
    setValue(initialValue ? new Date(initialValue) : null);
  };

  /**
   * Handles focus event on the input.
   */
  const handleFocus = () => setCurrentFocusedInput(name);

  /**
   * Handles blur event on the input.
   */
  const handleBlur = () => setCurrentFocusedInput(null);

  return (
    <Box>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}

      <TextField
        size={TextFieldSize.Lg}
        placeholder={placeholder}
        isDisabled={disabled}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        id={name}
        readOnly
        testID={`${name}-snap-ui-date-time-picker`}
        value={formatDateForDisplay(value, type)}
        inputElement={
          <TouchableOpacity
            onPress={
              Platform.OS === 'ios'
                ? handleOpenIosPicker
                : handleOpenAndroidPicker
            }
            activeOpacity={0.7}
          >
            <TextInput
              value={formatDateForDisplay(value, type)}
              placeholder={placeholder}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
        }
        // We set a max height of 58px and let the input grow to fill the rest of the height next to a taller sibling element.
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ maxHeight: 58, flexGrow: 1 }}
      />

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          // Default selection to current date/time.
          value={value ?? new Date()}
          display="default"
          mode={androidMode}
          onChange={handleAndroidChange}
          maximumDate={disableFuture ? new Date() : undefined}
          minimumDate={disablePast ? new Date() : undefined}
        />
      )}

      {Platform.OS === 'ios' && (
        <ApprovalModal
          isVisible={showDatePicker}
          onCancel={handleClosePicker}
          avoidKeyboard
        >
          <View style={styles.modal}>
            <DateTimePicker
              // Default selection to current date/time.
              value={value ?? new Date()}
              mode={type}
              display={type === 'datetime' ? 'inline' : 'spinner'}
              onChange={handleIosChange}
              maximumDate={disableFuture ? new Date() : undefined}
              minimumDate={disablePast ? new Date() : undefined}
            />
            <BottomSheetFooter
              buttonPropsArray={[
                {
                  label: 'Cancel',
                  variant: ButtonVariants.Secondary,
                  onPress: handleClosePicker,
                },
                {
                  label: 'OK',
                  variant: ButtonVariants.Primary,
                  onPress: submitInternalValue,
                },
              ]}
            />
          </View>
        </ApprovalModal>
      )}
      {error && <HelpText severity={HelpTextSeverity.Error}>{error}</HelpText>}
    </Box>
  );
};
