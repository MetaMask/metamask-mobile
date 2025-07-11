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

const MAXIMUM_DATE = new Date(2025, 11, 31);
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
  containerStyle?: object;
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
      containerStyle,
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
      setShowDatePicker(true);
    }, [handleOnPress]);

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
      const dateValue = new Date(Number(value));
      return isNaN(dateValue.getTime()) ? DEFAULT_DATE : dateValue;
    }, [value]);

    const preventModalDismissal = () => {
      // Prevents touch events from bubbling up to the outer TouchableWithoutFeedback
      // This is a workaround to prevent the modal from being dismissed when the user taps on the date picker
    };

    return (
      <>
        <TouchableWithoutFeedback onPress={handleOpenPicker}>
          <View style={styles.touchableArea}>
            <DepositTextField
              startAccessory={
                <Icon name={IconName.Calendar} size={IconSize.Md} />
              }
              label={label}
              placeholder={formatDateForDisplay(DEFAULT_DATE)}
              value={formatDateForDisplay(valueAsDate)}
              error={error}
              containerStyle={containerStyle}
              ref={ref || fieldRef}
              pointerEvents="none"
              readOnly
              {...textFieldProps}
            />
          </View>
        </TouchableWithoutFeedback>

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={valueAsDate}
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
                      value={valueAsDate}
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
