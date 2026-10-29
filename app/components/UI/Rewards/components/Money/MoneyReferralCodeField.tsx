import React from 'react';
import {
  Box,
  FontWeight,
  Label,
  Text,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MONEY_REFERRAL_CODE_MAX_LENGTH } from '../../utils/moneyReferralCode';

export interface MoneyReferralCodeFieldTestIds {
  field: string;
  input: string;
  error: string;
}

interface MoneyReferralCodeFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  errorMessage: string;
  isDisabled: boolean;
  testIds: MoneyReferralCodeFieldTestIds;
  twClassName?: string;
}

/** Label, input, and error line for a Money referral invite code. */
const MoneyReferralCodeField = ({
  label,
  value,
  onChangeText,
  errorMessage,
  isDisabled,
  testIds,
  twClassName,
}: MoneyReferralCodeFieldProps) => (
  <Box
    twClassName={`flex flex-col gap-y-2 ${twClassName ?? ''}`}
    testID={testIds.field}
  >
    <Label fontWeight={FontWeight.Medium}>{label}</Label>
    <TextField
      value={value}
      onChangeText={onChangeText}
      isDisabled={isDisabled}
      isError={Boolean(errorMessage)}
      autoFocus={value.length === 0}
      inputProps={{
        autoCapitalize: 'characters',
        autoCorrect: false,
        autoComplete: 'off',
        maxLength: MONEY_REFERRAL_CODE_MAX_LENGTH,
        accessibilityLabel: label,
        testID: testIds.input,
      }}
    />
    {Boolean(errorMessage) && (
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-error-default mt-1"
        testID={testIds.error}
      >
        {errorMessage}
      </Text>
    )}
  </Box>
);

export default MoneyReferralCodeField;
