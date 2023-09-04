// Third party dependencies.
import React from 'react';
import { TextInput, View } from 'react-native';

import { strings } from '../../../../../locales/i18n';
import formatNumber from '../../../../util/formatNumber';
import { dotAndCommaDecimalFormatter } from '../../../../util/number';
import Text, { TextVariant } from '../../../components/Texts/Text';
// External dependencies.
import { useStyles } from '../../../hooks';
import {
  CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
  CUSTOM_SPEND_CAP_INPUT_TEST_ID,
  CUSTOM_SPEND_CAP_MAX_TEST_ID,
} from './CustomInput.constants';
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
  tokenDecimal,
}: CustomInputProps) => {
  const handleUpdate = (text: string) => {
    const decimalIndex = text.indexOf('.');
    const fractionalLength = text.substring(decimalIndex + 1).length;

    if (decimalIndex !== -1 && fractionalLength > Number(tokenDecimal)) {
      return;
    }
    setValue(dotAndCommaDecimalFormatter(text));
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
      testID={CUSTOM_SPEND_CAP_INPUT_TEST_ID}
    >
      <View style={styles.body}>
        {!isEditDisabled ? (
          <TextInput
            testID={CUSTOM_SPEND_CAP_INPUT_INPUT_ID}
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
          <Text
            style={isInputGreaterThanBalance && styles.warningValue}
          >{`${formatNumber(value)} ${ticker}`}</Text>
        )}
      </View>
      {!isEditDisabled && (
        <Text
          testID={CUSTOM_SPEND_CAP_MAX_TEST_ID}
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
