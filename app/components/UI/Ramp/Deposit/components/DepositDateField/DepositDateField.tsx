import React, { useState, useRef, forwardRef, useCallback } from 'react';
import {
  TouchableWithoutFeedback,
  Platform,
  StyleSheet,
  Modal,
  View,
  Button,
  TextInput,
  TextInputProps,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import DepositTextField from '../DepositTextField';
import { useStyles } from '../../../../../hooks/useStyles';
import { Theme } from '../../../../../../util/theme/models';
import I18n from '../../../../../../../locales/i18n';

const MAXIMUM_DATE = new Date(2025, 11, 31);
const MINIMUM_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(2000, 0, 1);

const formatDateForDisplay = (date: Date, locale = I18n.locale): string =>
  new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    calendarIcon: {
      color: theme.colors.text.default,
      marginRight: 8,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.overlay.default,
    },
    pickerContainer: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 8,
    },
    touchableArea: {
      width: '100%',
    },
    dateTimePicker: {
      backgroundColor: theme.colors.background.default,
    },
  });
};

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

    const handleOpenPicker = () => {
      handleOnPress?.();
      setShowDatePicker(true);
    };

    const handleClosePicker = () => {
      setShowDatePicker(false);
      setPendingDateSelection(null);
    };

    const processSelectedDate = useCallback(
      (date?: Date | null) => {
        if (date) {
          setShowDatePicker(false);
          onChangeText(date.getTime().toString());
          onSubmitEditing?.();
        }
      },
      [onChangeText, onSubmitEditing],
    );

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
                <IonicIcon
                  name="calendar-outline"
                  size={20}
                  style={styles.calendarIcon}
                />
              }
              label={label}
              placeholder={formatDateForDisplay(DEFAULT_DATE)}
              value={formatDateForDisplay(new Date(Number(value)))}
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
            value={new Date(Number(value))}
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
                        onPress={() => {
                          processSelectedDate(pendingDateSelection);
                        }}
                        color={theme.colors.primary.default}
                      />
                    </View>
                    <DateTimePicker
                      value={new Date(Number(value))}
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
