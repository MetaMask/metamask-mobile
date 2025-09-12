import React, {
  useState,
  useRef,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';
import {
  TouchableWithoutFeedback,
  Platform,
  Modal,
  View,
  Button,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DepositTextField from '../DepositTextField';
import { useStyles } from '../../../../../hooks/useStyles';
import I18n from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import styleSheet from './DespostDateField.styles';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';

const MAXIMUM_DATE = new Date(Date.now());
const MINIMUM_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(2000, 0, 1);

const formatDateForDisplay = (date: Date, locale = I18n.locale): string =>
  getIntlDateTimeFormatter(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);

interface DepositDateFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  onSubmitEditing?: () => void;
  textFieldProps?: TextInputProps;
  handleOnPress?: () => void;
}

const DepositDateField = forwardRef<TextInput, DepositDateFieldProps>(
  (
    {
      label,
      value,
      onChangeText,
      error,
      onSubmitEditing,
      textFieldProps,
      handleOnPress,
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pendingDateSelection, setPendingDateSelection] =
      useState<Date | null>(null);
    const fieldRef = useRef<TextInput>(null);

    const handleOpenPicker = useCallback(() => {
      handleOnPress?.();
      // if opened with no value set the default date
      if (!value || value.trim() === '') {
        setPendingDateSelection(DEFAULT_DATE);
      }
      setShowDatePicker(true);
    }, [handleOnPress, value]);

    const handleClosePicker = useCallback(() => {
      setShowDatePicker(false);
      setPendingDateSelection(null);
    }, []);

    const processSelectedDate = useCallback(
      (date?: Date | null) => {
        if (date) {
          onChangeText(date.getTime().toString());
        }
        setShowDatePicker(false);
        onSubmitEditing?.();
      },
      [onChangeText, onSubmitEditing],
    );

    const valueAsDate = useMemo(() => {
      if (!value || value.trim() === '') {
        return null;
      }
      const dateValue = new Date(Number(value));
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }, [value]);

    const preventModalDismissal = () => {
      // Prevents touch events from bubbling up to the outer TouchableWithoutFeedback
      // This is a workaround to prevent the modal from being dismissed when the user taps on the date picker
    };

    return (
      <>
        <DepositTextField
          startAccessory={<Icon name={IconName.Calendar} size={IconSize.Md} />}
          label={label}
          placeholder={formatDateForDisplay(DEFAULT_DATE)}
          value={valueAsDate ? formatDateForDisplay(valueAsDate) : ''}
          error={error}
          ref={ref || fieldRef}
          readOnly
          inputElement={
            <TouchableOpacity
              style={styles.inputStyle}
              onPress={handleOpenPicker}
              activeOpacity={0.7}
            >
              <TextInput
                style={styles.textInputStyle}
                value={valueAsDate ? formatDateForDisplay(valueAsDate) : ''}
                placeholder={formatDateForDisplay(DEFAULT_DATE)}
                placeholderTextColor={theme.colors.text.muted}
                editable={false}
                pointerEvents="none"
                {...textFieldProps}
              />
            </TouchableOpacity>
          }
        />

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={valueAsDate || DEFAULT_DATE}
            mode="date"
            display="default"
            onChange={(_, date) => processSelectedDate(date)}
            maximumDate={MAXIMUM_DATE}
            minimumDate={MINIMUM_DATE}
          />
        )}

        {Platform.OS === 'ios' && (
          <Modal
            transparent
            animationType="fade"
            visible={showDatePicker}
            onRequestClose={handleClosePicker}
          >
            <TouchableWithoutFeedback onPress={handleClosePicker}>
              <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={preventModalDismissal}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.buttonContainer}>
                      <Button
                        title="Cancel"
                        onPress={handleClosePicker}
                        color={theme.colors.text.muted}
                      />
                      <Button
                        title="Done"
                        onPress={() =>
                          processSelectedDate(pendingDateSelection)
                        }
                        color={theme.colors.primary.default}
                      />
                    </View>
                    <DateTimePicker
                      value={valueAsDate || DEFAULT_DATE}
                      mode="date"
                      display="spinner"
                      onChange={(_, date) =>
                        setPendingDateSelection(date ?? null)
                      }
                      maximumDate={MAXIMUM_DATE}
                      minimumDate={MINIMUM_DATE}
                      style={styles.dateTimePicker}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </>
    );
  },
);

export default DepositDateField;
