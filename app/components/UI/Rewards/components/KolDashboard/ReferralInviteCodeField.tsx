import React, { useCallback } from 'react';
import { Box, Label, TextField } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_INVITE_FIXTURE } from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

const CODE_LENGTH = KOL_INVITE_FIXTURE.codeLength;

export interface ReferralInviteCodeFieldTestIds {
  field: string;
  input: string;
}

const DEFAULT_TEST_IDS: ReferralInviteCodeFieldTestIds = {
  field: KOL_DASHBOARD_SELECTORS.INVITE_CODE_FIELD,
  input: KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT,
};

export interface ReferralInviteCodeFieldProps {
  referralCode: string;
  onChangeReferralCode: (value: string) => void;
  testIds?: ReferralInviteCodeFieldTestIds;
  twClassName?: string;
}

/** Referral codes are alphanumeric, upper-case and fixed length. */
export const normalizeReferralCode = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/gu, '')
    .toUpperCase()
    .slice(0, CODE_LENGTH);

/**
 * Labelled referral code entry using the design-system `TextField`, matching
 * the inputs on the other onboarding screens. Invites arrive with the code
 * already filled in; an empty field focuses itself so the user can type one.
 */
const ReferralInviteCodeField: React.FC<ReferralInviteCodeFieldProps> = ({
  referralCode,
  onChangeReferralCode,
  testIds = DEFAULT_TEST_IDS,
  twClassName = '',
}) => {
  const handleChangeCode = useCallback(
    (value: string) => {
      onChangeReferralCode(normalizeReferralCode(value));
    },
    [onChangeReferralCode],
  );

  return (
    <Box
      twClassName={`flex flex-col gap-y-2 ${twClassName}`}
      testID={testIds.field}
    >
      <Label>{strings('rewards.kol.invite_referral_code')}</Label>
      <TextField
        value={referralCode}
        onChangeText={handleChangeCode}
        autoFocus={referralCode.length === 0}
        inputProps={{
          autoCapitalize: 'characters',
          autoCorrect: false,
          autoComplete: 'off',
          maxLength: CODE_LENGTH,
          accessibilityLabel: strings('rewards.kol.invite_referral_code'),
          testID: testIds.input,
        }}
      />
    </Box>
  );
};

export default ReferralInviteCodeField;
