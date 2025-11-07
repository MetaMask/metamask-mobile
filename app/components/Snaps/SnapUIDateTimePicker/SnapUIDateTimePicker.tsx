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
import { Platform, TextInput, TouchableOpacity } from 'react-native';
import ApprovalModal from '../../Approvals/ApprovalModal';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';

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

/**
 * Styles for the SnapUIDateTimePicker component.
 */

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

  const inputRef = useRef<TextInput>(null);

  const initialValue = getValue(name, form) as string;

  const [value, setValue] = useState<Date | null>(
    initialValue ? new Date(initialValue) : null,
  );

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      setValue(new Date(initialValue));
    }
  }, [initialValue]);

  const handleInternalValueChange = (
    _event: DateTimePickerEvent,
    date: Date | undefined,
  ) => {
    setValue(date ?? null);
  };

  const submitInternalValue = () => {
    const isoString = value ? DateTime.fromJSDate(value).toISO() : null;

    handleInputChange(name, isoString, form);
  };

  const handleChange = (
    _event: DateTimePickerEvent,
    date: Date | undefined,
  ) => {
    if (!date) return;

    const isoString = DateTime.fromJSDate(date).toISO();

    setValue(date);
    handleInputChange(name, isoString, form);
  };

  const handleOpenPicker = () => {
    setShowDatePicker(true);
  };

  const handleClosePicker = () => {
    setShowDatePicker(false);
  };

  const handleFocus = () => setCurrentFocusedInput(name);
  const handleBlur = () => setCurrentFocusedInput(null);

  return (
    <Box>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <TouchableOpacity onPress={handleOpenPicker} activeOpacity={0.7}>
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
          value={
            value
              ? DateTime.fromJSDate(value).toLocaleString(DateTime.DATETIME_MED)
              : undefined
          }
          // We set a max height of 58px and let the input grow to fill the rest of the height next to a taller sibling element.
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ maxHeight: 58, flexGrow: 1 }}
        />
      </TouchableOpacity>
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={type}
          display="default"
          onChange={handleChange}
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
          <DateTimePicker
            value={value ?? new Date()}
            mode={type}
            display="spinner"
            onChange={handleInternalValueChange}
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
                label: 'Confirm',
                variant: ButtonVariants.Primary,
                onPress: submitInternalValue,
              },
            ]}
          />
        </ApprovalModal>
      )}
      {error && <HelpText severity={HelpTextSeverity.Error}>{error}</HelpText>}
    </Box>
  );
};
