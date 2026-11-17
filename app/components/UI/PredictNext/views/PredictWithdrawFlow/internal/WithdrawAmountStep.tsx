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
  TextField,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import type { PredictAmount } from '../../../types';
import { formatUsd } from '../../../utils/formatUsd';
import { PredictWithdrawFlowTestIds } from './PredictWithdrawFlow.testIds';
import {
  MINIMUM_WITHDRAW_AMOUNT,
  type PredictWithdrawAmountIssue,
} from './withdrawAmount';

interface WithdrawAmountStepProps {
  /** The typed amount, or `''` when the whole balance is being swept. */
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
  onAmountChange: (amount: string) => void;
  onMax: () => void;
}

const amountIssueCopy = (issue: Exclude<PredictWithdrawAmountIssue, null>) =>
  issue === 'below_minimum'
    ? strings('predict_next.withdraw.below_minimum', {
        amount: formatUsd(MINIMUM_WITHDRAW_AMOUNT.toFixed(2)),
      })
    : strings('predict_next.withdraw.over_balance');

/** The amount the field shows: the typed one, or the whole balance a sweep
 * withdraws. `Max` is not an amount the person typed, so it renders the
 * balance the venue will sweep rather than an editable figure. */
const fieldValue = (
  amount: string,
  availableBalance: PredictAmount | undefined,
  isSweeping: boolean,
): string => {
  if (!isSweeping) {
    return amount;
  }
  return availableBalance ? formatUsd(availableBalance) : '';
};

/**
 * Entry step: the amount to withdraw, validated against the Venue minimum and
 * the cached balance before a Preview is requested. `Max` sweeps the whole
 * available balance; the Venue caps a sweep itself, so no maximum is invented
 * here.
 */
export const WithdrawAmountStep = ({
  amount,
  availableBalance,
  isSweeping,
  amountIssue,
  canSweep,
  isOffline,
  isRequesting,
  onAmountChange,
  onMax,
}: WithdrawAmountStepProps) => {
  const hasBalance = availableBalance !== undefined;
  const isLocked = isSweeping || isRequesting || isOffline;

  return (
    <Box gap={3}>
      <Box gap={2}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('predict_next.withdraw.amount_label')}
        </Text>
        <TextField
          value={fieldValue(amount, availableBalance, isSweeping)}
          onChangeText={onAmountChange}
          placeholder={strings('predict_next.withdraw.amount_placeholder')}
          isDisabled={isLocked}
          isError={amountIssue !== null}
          inputProps={{
            keyboardType: 'decimal-pad',
            accessibilityLabel: strings('predict_next.withdraw.amount_label'),
          }}
          startAccessory={
            <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
              $
            </Text>
          }
          testID={PredictWithdrawFlowTestIds.AMOUNT_INPUT}
        />
        {amountIssue === null ? null : (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            testID={PredictWithdrawFlowTestIds.AMOUNT_ERROR}
          >
            {amountIssueCopy(amountIssue)}
          </Text>
        )}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-between gap-3"
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
      </Box>
      {isOffline ? (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={strings('predict_next.withdraw.offline')}
          testID={PredictWithdrawFlowTestIds.OFFLINE_BANNER}
        />
      ) : null}
    </Box>
  );
};
