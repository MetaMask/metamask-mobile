// Third party dependencies.
import React from 'react';
import { TextInput, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import formatNumber from '../../../../util/formatNumber';
import { strings } from '../../../../../locales/i18n';
import Text, { TextVariant } from '../../../components/Texts/Text';

// Internal dependencies.
import { CustomInputProps } from './CustomInput.types';
import CUSTOM_INPUT_TEST_ID from './CustomInput.constants';
import stylesheet from './CustomInput.styles';

const CustomInput = ({
  ticker,
  value,
  inputDisabled,
  setMaxSelected,
  defaultValueSelected,
  setValue,
}: CustomInputProps) => {
  const handleUpdate = (text: string) => {
    setValue(text);
  };

  const handleMaxPress = () => {
    setMaxSelected(true);
  };

  const { styles } = useStyles(stylesheet, {});

  const onChangeValueText = (text: string) => {
    handleUpdate(text);
    setMaxSelected(false);
  };

  return (
    <View style={styles.container} testID={CUSTOM_INPUT_TEST_ID}>
      <View style={styles.body}>
        {inputDisabled ? (
          <TextInput
            multiline
            onChangeText={onChangeValueText}
            value={value}
            placeholder={`Enter a number here (${ticker})`}
            keyboardType="numeric"
            style={styles.input}
          />
        ) : defaultValueSelected ? (
          <Text
            variant={TextVariant.BodyMD}
            style={styles.warningValue}
          >{`${formatNumber(value)} ${ticker}`}</Text>
        ) : null}
      </View>
      {inputDisabled && (
        <Text
          variant={TextVariant.BodySM}
          style={styles.maxValueText}
          onPress={handleMaxPress}
        >
          {strings('contract_allowance.custom_spend_cap.max')}
        </Text>
      )}
    </View>
  );
};

export default CustomInput;
