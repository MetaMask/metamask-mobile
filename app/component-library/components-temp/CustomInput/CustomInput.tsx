import React, { useEffect, useState } from 'react';
import { TextInput, Text, View } from 'react-native';
import { CustomInputProps } from './CustomInput.types';
import stylesheet from './CustomInput.styles';
import { useStyles } from '../../hooks';

const CustomInput = ({
  ticker,
  isMaxValue,
  showMaxValue,
  maxOptionSelected,
  maxAvailableValue,
}: CustomInputProps) => {
  const [newNumber, onChangeNumber] = useState('');

  useEffect(() => {
    if (maxOptionSelected) {
      onChangeNumber(maxAvailableValue);
    }
  }, [maxOptionSelected, maxAvailableValue]);

  const { styles } = useStyles(stylesheet, {});

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <TextInput
          multiline
          onChangeText={onChangeNumber}
          value={newNumber}
          placeholder={`Enter a number here (${ticker})`}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      {isMaxValue && (
        <Text style={styles.maxValueText} onPress={showMaxValue}>
          Max
        </Text>
      )}
    </View>
  );
};

export default CustomInput;
