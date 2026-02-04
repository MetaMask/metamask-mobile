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
import TextField from '../../../component-library/components/Form/TextField';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';
import stylesheet from './SnapUIDateTimePicker.styles';
import ApprovalModal from '../../Approvals/ApprovalModal';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../hooks/useStyles';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { strings } from '../../../../locales/i18n';

/**
 * The type of the SnapUIDateTimePicker.
 */
enum SnapUIDateTimePickerType {
  Date = 'date',
  Time = 'time',
  DateTime = 'datetime',
}

/**
 * The props for the SnapUIDateTimePicker component.
 */
export interface SnapUIDateTimePickerProps {
  name: string;
  type: SnapUIDateTimePickerType;
  label?: string;
  error?: string;
  placeholder?: string;
  form?: string;
  disablePast?: boolean;
  disableFuture?: boolean;
  disabled?: boolean;
}

/**
 * Formats the date for display based on the picker type.
 * @param date - The date to format.
 * @param type - The type of the picker (date, time, datetime).
 * @returns The formatted date string.
 */
function formatDateForDisplay(
  date: Date | null,
  type: SnapUIDateTimePickerType,
) {
  if (!date) {
    return undefined;
  }
  switch (type) {
    case SnapUIDateTimePickerType.Date:
      return DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_SHORT);
    case SnapUIDateTimePickerType.Time:
      return DateTime.fromJSDate(date).toLocaleString(DateTime.TIME_SIMPLE);
    case SnapUIDateTimePickerType.DateTime:
      return DateTime.fromJSDate(date).toLocaleString(DateTime.DATETIME_SHORT);
  }
}

/**
 * Normalizes the date based on the picker type.
 *
 * @param date - The date to normalize.
 * @param type - The type of the picker (date, time, datetime).
 * @returns The normalized date.
 */
function normalizeDate(date: Date, type: SnapUIDateTimePickerType): Date {
  switch (type) {
    case SnapUIDateTimePickerType.Date:
      date.setHours(0, 0, 0, 0);
      break;
    case SnapUIDateTimePickerType.Time:
      date.setSeconds(0, 0);
      break;
    case SnapUIDateTimePickerType.DateTime:
      date.setSeconds(0, 0);
      break;
    default:
      break;
  }

  return date;
}

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
  type = SnapUIDateTimePickerType.DateTime,
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

  // Internal state to manage the picker value before submission.
  const [internalValue, setInternalValue] = useState<Date>(value ?? new Date());

  // Android mode state to handle the two-step process for datetime type.
  // First step is date selection, second step is time selection.
  // We have to manage this manually as there is no native datetime picker on Android.
  const [androidMode, setAndroidMode] = useState<
    SnapUIDateTimePickerType.Date | SnapUIDateTimePickerType.Time
  >(
    type === SnapUIDateTimePickerType.DateTime
      ? SnapUIDateTimePickerType.Date
      : type,
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
    if (!date) {
      return;
    }

    setInternalValue(date);
  };

  /**
   * Submits the internal value to the snap.
   *
   * @param date - The date to submit.
   */
  const submitInternalValue = (date: Date) => {
    const normalizedDate = normalizeDate(date, type);
    const isoString = DateTime.fromJSDate(normalizedDate).toISO();

    setValue(normalizedDate);
    handleInputChange(name, isoString, form);
    setShowDatePicker(false);
  };

  /**
   * Handles submission for iOS picker.
   */
  const handleIosSubmit = () => {
    submitInternalValue(internalValue);
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
    if (!date) {
      return;
    }

    // Handle the first of two-step process for datetime type. (date selection)
    if (
      type === SnapUIDateTimePickerType.DateTime &&
      androidMode === SnapUIDateTimePickerType.Date &&
      event.type === 'set'
    ) {
      setInternalValue(date);
      setAndroidMode(SnapUIDateTimePickerType.Time);
      return;
    }

    // Handle the second of two-step process for datetime type. (time selection)
    if (
      type === SnapUIDateTimePickerType.DateTime &&
      androidMode === SnapUIDateTimePickerType.Time &&
      event.type === 'set'
    ) {
      setInternalValue(date);
      submitInternalValue(date);

      setAndroidMode(SnapUIDateTimePickerType.Date);
      return;
    }

    // Handle dismissal for datetime type when selecting a date.
    if (
      event.type === 'dismissed' &&
      type === SnapUIDateTimePickerType.DateTime &&
      androidMode === SnapUIDateTimePickerType.Date
    ) {
      setShowDatePicker(false);
      setInternalValue(value ?? new Date());
      return;
    }

    // Handle dismissal for datetime type when selecting a time.
    // This resets the mode back to date for next opening.
    if (
      event.type === 'dismissed' &&
      type === SnapUIDateTimePickerType.DateTime &&
      androidMode === SnapUIDateTimePickerType.Time
    ) {
      setAndroidMode(SnapUIDateTimePickerType.Date);
      return;
    }
    // Handle single step date or time selection.
    if (event.type === 'set') {
      setInternalValue(date);
      submitInternalValue(date);
    }

    setShowDatePicker(false);
  };

  /**
   * Handles opening the picker.
   */
  const handleOpenPicker = () => {
    setShowDatePicker(true);
  };

  /**
   * Handles closing the picker.
   * Submits the internal value before closing.
   */
  const handleClosePicker = () => {
    setShowDatePicker(false);

    // Revert to initial value if the user cancels.
    setInternalValue(value ?? new Date());
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
    <Box testID={'snap-ui-renderer__date-time-picker'}>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <TextField
        testID={`snap-ui-renderer__date-time-picker--${type}`}
        placeholder={placeholder}
        isDisabled={disabled}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        id={name}
        readOnly
        pointerEvents="none"
        value={formatDateForDisplay(value, type)}
        inputElement={
          <TouchableOpacity
            disabled={disabled}
            testID={`snap-ui-renderer__date-time-picker--${type}-touchable`}
            onPress={handleOpenPicker}
            activeOpacity={0.7}
          >
            <Input
              testID={`snap-ui-renderer__date-time-picker--${type}-input`}
              isStateStylesDisabled
              readOnly
              pointerEvents="none"
              value={formatDateForDisplay(value, type)}
              placeholder={placeholder}
            />
          </TouchableOpacity>
        }
        // We set a max height of 58px and let the input grow to fill the rest of the height next to a taller sibling element.
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ maxHeight: 58, flexGrow: 1 }}
      />

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={internalValue}
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
              value={internalValue}
              mode={type}
              display={type === 'datetime' ? 'inline' : 'spinner'}
              onChange={handleIosChange}
              maximumDate={disableFuture ? new Date() : undefined}
              minimumDate={disablePast ? new Date() : undefined}
            />
            <BottomSheetFooter
              buttonPropsArray={[
                {
                  label: strings('navigation.cancel'),
                  variant: ButtonVariants.Secondary,
                  onPress: handleClosePicker,
                },
                {
                  label: strings('navigation.ok'),
                  variant: ButtonVariants.Primary,
                  onPress: handleIosSubmit,
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
