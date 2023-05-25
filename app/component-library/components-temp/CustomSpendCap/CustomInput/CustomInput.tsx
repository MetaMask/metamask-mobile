// Third party dependencies.
import React from 'react';
import { TextInput, View } from 'react-native';

import { strings } from '../../../../../locales/i18n';
import formatNumber from '../../../../util/formatNumber';
import Text, { TextVariant } from '../../../components/Texts/Text';
// External dependencies.
import { useStyles } from '../../../hooks';
import CUSTOM_INPUT_TEST_ID from './CustomInput.constants';
import stylesheet from './CustomInput.styles';
// Internal dependencies.
import { CustomInputProps } from './CustomInput.types';

const CustomInput = ({
  ticker,
  value,
  setMaxSelected,
  isInputGreaterThanBalance,
  setValue,
  isEditDisabled,
}: CustomInputProps) => {
  const handleUpdate = (text: string) => {
    setValue(text);
  };

  const handleMaxPress = () => {
    setMaxSelected(true);
  };

  const {
    styles,
    theme: { colors },
  } = useStyles(stylesheet, {});

  const onChangeValueText = (text: string) => {
    handleUpdate(text);
    setMaxSelected(false);
  };

  return (
    <View
      style={[
        styles.container,
        isEditDisabled && {
          ...styles.container,
          ...styles.fixedPadding,
          backgroundColor: colors.background.alternative,
        },
      ]}
      testID={CUSTOM_INPUT_TEST_ID}
    >
      <View style={styles.body}>
        {!isEditDisabled ? (
          <TextInput
            multiline
            onChangeText={onChangeValueText}
            value={value}
            placeholder={strings(
              'contract_allowance.custom_spend_cap.enter_number',
            )}
            keyboardType="numeric"
            style={[
              styles.input,
              isInputGreaterThanBalance && styles.warningValue,
            ]}
          />
        ) : (
          <Text style={isInputGreaterThanBalance && styles.warningValue}>{`${formatNumber(value)} ${ticker}`}</Text>
        )}
      </View>
      {!isEditDisabled && (
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
