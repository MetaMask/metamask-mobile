import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
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
  /** The amount as keyed in, or `''` when the whole balance is swept. */
  amount: string;
  availableBalance?: PredictAmount;
  /** True when `Max` selected a sweep of the whole available balance. */
  isSweeping: boolean;
  amountIssue: PredictWithdrawAmountIssue;
  /** False when `Max` cannot be offered: no balance read yet, or a balance
   * below the Venue's floor. */
  canSweep: boolean;
  isOffline: boolean;
  /** True while a Withdraw Preview is in flight. */
  isRequesting: boolean;
  onMax: () => void;
}

const amountIssueCopy = (issue: Exclude<PredictWithdrawAmountIssue, null>) =>
  issue === 'below_minimum'
    ? strings('predict_next.withdraw.below_minimum', {
        amount: formatUsd(MINIMUM_WITHDRAW_AMOUNT.toFixed(2)),
      })
    : strings('predict_next.withdraw.over_balance');

/** The figure the display shows: the keyed amount, or the whole balance a
 * sweep withdraws. `Max` is not an amount the person keyed in, so it shows
 * the balance the venue will sweep rather than a figure to edit. */
const displayAmount = (
  amount: string,
  availableBalance: PredictAmount | undefined,
  isSweeping: boolean,
): string => {
  if (!isSweeping) {
    return amount;
  }
  // `availableBalance` is canonical (no symbol); the display adds the prefix.
  return availableBalance ?? '';
};

/**
 * Entry step: the amount to withdraw, validated against the Venue minimum and
 * the cached balance before a Preview is requested. `Max` sweeps the whole
 * available balance; the Venue caps a sweep itself, so no maximum is invented
 * here.
 *
 * The payout account is the Venue's: the backend resolves it on the Preview,
 * so the Receive row names the one this build pays and offers nothing to
 * change. The exact address is on the review step.
 */
export const WithdrawAmountStep = ({
  amount,
  availableBalance,
  isSweeping,
  amountIssue,
  canSweep,
  isOffline,
  isRequesting,
  onMax,
}: WithdrawAmountStepProps) => {
  const hasBalance = availableBalance !== undefined;

  return (
    <Box>
      <Box twClassName="items-center pb-1 pt-6">
        <PredictAmountDisplay
          amount={displayAmount(amount, availableBalance, isSweeping)}
          // The keypad is always on screen here, so the figure is an output,
          // not a control: no caret and nothing to tap.
          isActive={false}
          accessibilityLabel={strings('predict_next.withdraw.amount_label')}
        />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between gap-3 px-4 pt-1"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="shrink"
          testID={PredictWithdrawFlowTestIds.AVAILABLE_BALANCE}
        >
          {hasBalance
            ? strings('predict_next.withdraw.available_balance', {
                amount: formatUsd(availableBalance),
              })
            : strings('predict_next.withdraw.zero_balance')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={onMax}
          isDisabled={!canSweep || isSweeping || isRequesting || isOffline}
          testID={PredictWithdrawFlowTestIds.MAX}
        >
          {strings('predict_next.withdraw.max')}
        </Button>
      </Box>
      {amountIssue === null ? null : (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          twClassName="px-4 pt-2"
          testID={PredictWithdrawFlowTestIds.AMOUNT_ERROR}
        >
          {amountIssueCopy(amountIssue)}
        </Text>
      )}
      <Box twClassName="px-4 pt-6">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-between gap-3"
          testID={PredictWithdrawFlowTestIds.RECEIVE}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('predict_next.withdraw.receive_row')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={PredictWithdrawFlowTestIds.RECEIVE_VALUE}
          >
            {strings('predict_next.withdraw.receive_sandbox_wallet')}
          </Text>
        </Box>
      </Box>
      {isOffline ? (
        <Box twClassName="px-4 pt-3">
          <BannerAlert
            severity={BannerAlertSeverity.Warning}
            description={strings('predict_next.withdraw.offline')}
            testID={PredictWithdrawFlowTestIds.OFFLINE_BANNER}
          />
        </Box>
      ) : null}
    </Box>
  );
};
