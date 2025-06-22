import React, { useState, useRef, useMemo, forwardRef } from 'react';
import {
  TouchableWithoutFeedback,
  Platform,
  StyleSheet,
  Modal,
  View,
  Button,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import DepositTextField from '../DepositTextField';
import { useStyles } from '../../../../../hooks/useStyles';
import { Theme } from '../../../../../../util/theme/models';

const MAXIMUM_DATE = new Date(2025, 11, 31);
const MINIMUM_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(2000, 0, 1);

export const getDateDisplayValue = (value: string): Date => {
  if (value) {
    const parts = value.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts.map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (
        !isNaN(parsedDate.getTime()) &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      ) {
        return parsedDate;
      }
    }
  }

  return DEFAULT_DATE;
};

export const formatDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

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
  placeholder?: string;
  error?: string;
  containerStyle?: object;
  onSubmitEditing?: () => void;
}

const DepositDateField = forwardRef<TextInput, DepositDateFieldProps>(
  (
    {
      label,
      placeholder = 'MM/DD/YYYY',
      value,
      onChangeText,
      error,
      containerStyle,
      onSubmitEditing,
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const fieldRef = useRef<TextInput>(null);

    const dateDisplayValue = useMemo(() => getDateDisplayValue(value), [value]);

    const handleClosePicker = () => {
      setShowDatePicker(false);
      setSelectedDate(null);
    };

    // @ts-expect-error - first param is not used
    const handleDateChangeAndroid = (_, date?: Date) => {
      setShowDatePicker(false);
      if (date) {
        setSelectedDate(date);
        onChangeText(formatDate(date));
        onSubmitEditing?.();
      }
    };

    // @ts-expect-error - first param is not used
    const handleDateChangeIos = (_, date?: Date) => {
      if (date) {
        setSelectedDate(date);
      }
    };

    const handleConfirmIos = () => {
      setShowDatePicker(false);
      if (selectedDate) {
        onChangeText(formatDate(selectedDate));
        onSubmitEditing?.();
      }
    };

    const preventModalDismissal = () => {
      // Prevents touch events from bubbling up to the outer TouchableWithoutFeedback
    };

    return (
      <>
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(true)}>
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
              placeholder={placeholder}
              value={value}
              error={error}
              containerStyle={containerStyle}
              ref={ref || fieldRef}
              pointerEvents="none"
              readOnly
            />
          </View>
        </TouchableWithoutFeedback>

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={dateDisplayValue}
            mode="date"
            display="default"
            onChange={handleDateChangeAndroid}
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
                        onPress={handleConfirmIos}
                        color={theme.colors.primary.default}
                      />
                    </View>
                    <DateTimePicker
                      value={dateDisplayValue}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChangeIos}
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
