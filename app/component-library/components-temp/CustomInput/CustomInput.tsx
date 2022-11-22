// Third party dependencies.
import React, { useEffect, useState } from 'react';
import { TextInput, Text, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import formatNumber from '../../../util/formatNumber';
import { strings } from '../../../../locales/i18n';

// Internal dependencies.
import { CustomInputProps } from './CustomInput.types';
import stylesheet from './CustomInput.styles';

const CustomInput = ({
  ticker,
  maxAvailableValue,
  defaultValue,
  getUpdatedValue,
}: CustomInputProps) => {
  const [value, onChangeValue] = useState(defaultValue || '');
  const [isDefaultValuePassed, setIsDefaultValuePassed] = useState(false);

  useEffect(() => {
    getUpdatedValue(value);
    setIsDefaultValuePassed(false);
  }, [value, getUpdatedValue]);

  useEffect(() => {
    if (defaultValue) {
      setIsDefaultValuePassed(true);
    }
  }, [defaultValue]);

  const showMaxValue = () => {
    onChangeValue(maxAvailableValue);
  };

  const { styles } = useStyles(stylesheet, {});

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {isDefaultValuePassed ? (
          <Text style={styles.warningValue}>
            <Text>{`${formatNumber(value)} ${ticker}`}</Text>
          </Text>
        ) : (
          <TextInput
            multiline
            onChangeText={onChangeValue}
            value={formatNumber(value)}
            placeholder={`Enter a number here (${ticker})`}
            keyboardType="numeric"
            style={[styles.input]}
          />
        )}
      </View>
      {!isDefaultValuePassed && (
        <Text style={styles.maxValueText} onPress={showMaxValue}>
          {strings('input.max_value')}
        </Text>
      )}
    </View>
  );
};

export default CustomInput;
