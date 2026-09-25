import React, { useCallback, useEffect, useRef } from 'react';
import { type TextInput } from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import {
  Box,
  FontWeight,
  Label,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { hasTestOverrides } from '../../../../../util/test/utils';
import { KOL_INVITE_FIXTURE } from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

const CELL_COUNT = KOL_INVITE_FIXTURE.codeLength;

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

/**
 * Six-cell referral code entry. Invites arrive with the code already filled
 * in; tapping a cell clears the code from that cell onwards so the user can
 * retype it, and an empty field advances cell by cell as they type.
 */
const ReferralInviteCodeField: React.FC<ReferralInviteCodeFieldProps> = ({
  referralCode,
  onChangeReferralCode,
  testIds = DEFAULT_TEST_IDS,
  twClassName,
}) => {
  const tw = useTailwind();
  const inputRef = useBlurOnFulfill({
    value: referralCode,
    cellCount: CELL_COUNT,
  });
  const shouldAutoFocusRef = useRef(referralCode.length === 0);

  useEffect(() => {
    if (shouldAutoFocusRef.current) {
      inputRef.current?.focus();
    }
  }, [inputRef]);

  const handleChangeCode = useCallback(
    (value: string) => {
      onChangeReferralCode(
        value
          .replace(/[^a-zA-Z0-9]/gu, '')
          .toUpperCase()
          .slice(0, CELL_COUNT),
      );
    },
    [onChangeReferralCode],
  );

  const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
    value: referralCode,
    setValue: handleChangeCode,
  });

  return (
    <Box twClassName={twClassName} testID={testIds.field}>
      <Label fontWeight={FontWeight.Medium}>
        {strings('rewards.kol.invite_referral_code')}
      </Label>
      <CodeField
        {...codeFieldProps}
        ref={inputRef as React.RefObject<TextInput>}
        value={referralCode}
        onChangeText={handleChangeCode}
        cellCount={CELL_COUNT}
        rootStyle={tw.style('mt-2 w-full flex-row gap-2')}
        autoComplete="off"
        accessibilityLabel={strings('rewards.kol.invite_referral_code')}
        testID={testIds.input}
        renderCell={({ index, symbol, isFocused }) => (
          <Box
            key={index}
            onLayout={getCellOnLayoutHandler(index)}
            twClassName="h-14 flex-1 items-center justify-center rounded-xl border bg-muted"
            style={tw.style(
              isFocused ? 'border-primary-default' : 'border-muted',
            )}
          >
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Medium}
            >
              {/* Cursor uses setInterval which keeps the JS thread non-idle,
                  stalling E2E synchronization. Omit it in E2E builds. */}
              {symbol || (isFocused && !hasTestOverrides ? <Cursor /> : null)}
            </Text>
          </Box>
        )}
      />
    </Box>
  );
};

export default ReferralInviteCodeField;
