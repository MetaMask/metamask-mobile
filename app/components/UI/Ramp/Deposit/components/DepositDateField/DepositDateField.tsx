import React, { useState, useRef, useMemo } from 'react';
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
    },
    touchableArea: {
      width: '100%',
    },
  });
};

interface DepositDateFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  testID?: string;
  containerStyle?: object;
  maximumDate?: Date;
  minimumDate?: Date;
  nextInputRef?: React.RefObject<TextInput>;
}

const DepositDateField = ({
  label,
  placeholder = 'MM/DD/YYYY',
  value,
  onChangeText,
  error,
  testID,
  containerStyle,
  maximumDate,
  minimumDate,
  nextInputRef,
}: DepositDateFieldProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const fieldRef = useRef<TextInput>(null);

  const getDateValue = useMemo(() => {
    if (value) {
      const [month, day, year] = value.split('/').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date();
  }, [value]);

  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const focusNextInput = () => {
    if (nextInputRef?.current) {
      nextInputRef.current.focus();
    }
  };

  // @ts-expect-error - first param is not used
  const handleDateChange = (_, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);

      if (Platform.OS === 'android') {
        onChangeText(formatDate(date));
        focusNextInput();
      }
    }
  };

  const handleConfirm = () => {
    setShowDatePicker(false);

    if (selectedDate) {
      onChangeText(formatDate(selectedDate));
    }

    focusNextInput();
  };

  return (
    <>
      <TouchableWithoutFeedback
        onPress={() => setShowDatePicker(true)}
        testID={`${testID}-touchable`}
      >
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
            testID={testID}
            containerStyle={containerStyle}
            ref={fieldRef}
            pointerEvents="none"
            onPress={() => setShowDatePicker(true)}
          />
        </View>
      </TouchableWithoutFeedback>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          testID={`${testID}-picker`}
          value={getDateValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={handleConfirm}
        >
          <View style={styles.modalContainer}>
            <View style={styles.pickerContainer}>
              <View style={styles.buttonContainer}>
                <Button
                  title="Done"
                  onPress={handleConfirm}
                  color={theme.colors.primary.default}
                />
              </View>
              <DateTimePicker
                testID={`${testID}-picker`}
                value={getDateValue}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                style={{ backgroundColor: theme.colors.background.default }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

export default DepositDateField;
