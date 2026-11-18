import React from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  SensitiveText,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import type { PredictAmount } from '../../../types';
import { formatUsd } from '../../../utils/formatUsd';
import { PredictAmountDisplay } from '../../../components/PredictAmountEntry';
import { PredictWithdrawFlowTestIds } from './PredictWithdrawFlow.testIds';
import {
  MINIMUM_WITHDRAW_AMOUNT,
  type PredictWithdrawAmountIssue,
} from './withdrawAmount';

interface WithdrawAmountStepProps {
  /** The amount as keyed in, or `''` before the first key. */
  amount: string;
  availableBalance?: PredictAmount;
  amountIssue: PredictWithdrawAmountIssue;
  /** Hides the Venue-reported available balance; the keyed amount stays. */
  isPrivacyMode: boolean;
}

/** Cents, because the venue reports sub-cent dust the person cannot
 * withdraw: `493.5900` is `$493.59`, never `$493.5900`. */
const balanceLabel = (balance: PredictAmount): string =>
  formatUsd(new BigNumber(balance).toFixed(2, BigNumber.ROUND_DOWN));

const amountIssueCopy = (issue: Exclude<PredictWithdrawAmountIssue, null>) =>
  issue === 'below_minimum'
    ? strings('predict_next.withdraw.below_minimum', {
        amount: formatUsd(MINIMUM_WITHDRAW_AMOUNT.toFixed(2)),
      })
    : strings('predict_next.withdraw.over_balance');

/**
 * Entry step: the amount to withdraw and the balance it is judged against.
 * The keypad is permanent, so the figure is an output rather than a field,
 * and the block sits in the middle of the space the keypad leaves.
 *
 * The payout account is the Venue's: the backend resolves it on the Preview,
 * so the screen names it next to Continue and offers nothing to change. The
 * exact address is on the review step.
 */
export const WithdrawAmountStep = ({
  amount,
  availableBalance,
  amountIssue,
  isPrivacyMode,
}: WithdrawAmountStepProps) => (
  <Box twClassName="flex-1 items-center justify-center px-6">
    <PredictAmountDisplay
      amount={amount}
      isActive={false}
      accessibilityLabel={strings('predict_next.withdraw.amount_label')}
    />
    <SensitiveText
      isHidden={isPrivacyMode}
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="pt-1 text-center"
      testID={PredictWithdrawFlowTestIds.AVAILABLE_BALANCE}
    >
      {availableBalance === undefined
        ? strings('predict_next.withdraw.zero_balance')
        : strings('predict_next.withdraw.available_balance', {
            amount: balanceLabel(availableBalance),
          })}
    </SensitiveText>
    {amountIssue === null ? null : (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.ErrorDefault}
        twClassName="pt-2 text-center"
        testID={PredictWithdrawFlowTestIds.AMOUNT_ERROR}
      >
        {amountIssueCopy(amountIssue)}
      </Text>
    )}
  </Box>
);
