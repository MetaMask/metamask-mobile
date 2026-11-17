import React from 'react';
import {
  Box,
  BoxAlignItems,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import type {
  PredictWithdrawReceipt,
  PredictWithdrawRejectionCode,
} from '../../../types';
import { formatUsd } from '../../../utils/formatUsd';
import { PredictWithdrawFlowTestIds } from './PredictWithdrawFlow.testIds';

interface RejectionCopy {
  title: string;
  body: string;
}

const rejectionCopy = (code: PredictWithdrawRejectionCode): RejectionCopy => {
  switch (code) {
    case 'insufficient_balance':
      return {
        title: strings('predict_next.withdraw.rejection.insufficient_balance'),
        body: strings(
          'predict_next.withdraw.rejection.insufficient_balance_body',
        ),
      };
    case 'amount_below_minimum':
      return {
        title: strings('predict_next.withdraw.rejection.amount_below_minimum'),
        body: strings(
          'predict_next.withdraw.rejection.amount_below_minimum_body',
        ),
      };
    case 'step_up_verification_required':
      return {
        title: strings(
          'predict_next.withdraw.rejection.step_up_verification_required',
        ),
        body: strings(
          'predict_next.withdraw.rejection.step_up_verification_required_body',
        ),
      };
    case 'venue_rejected':
      return {
        title: strings('predict_next.withdraw.rejection.venue_rejected'),
        body: strings('predict_next.withdraw.rejection.venue_rejected_body'),
      };
  }
};

interface StatusCopy {
  title: string;
  body?: string;
  tone: TextColor;
  icon: IconName;
  iconColor: IconColor;
}

const STATUS_COPY: Record<
  Exclude<PredictWithdrawReceipt['status'], 'rejected'>,
  StatusCopy
> = {
  pending: {
    title: strings('predict_next.withdraw.status.processing.title'),
    body: strings('predict_next.withdraw.status.processing.body'),
    tone: TextColor.TextDefault,
    icon: IconName.Loading,
    iconColor: IconColor.IconDefault,
  },
  processing: {
    title: strings('predict_next.withdraw.status.processing.title'),
    body: strings('predict_next.withdraw.status.processing.body'),
    tone: TextColor.TextDefault,
    icon: IconName.Loading,
    iconColor: IconColor.IconDefault,
  },
  settled: {
    title: strings('predict_next.withdraw.status.settled.title'),
    body: strings('predict_next.withdraw.status.settled.body'),
    tone: TextColor.SuccessDefault,
    icon: IconName.CheckBold,
    iconColor: IconColor.SuccessDefault,
  },
  failed: {
    title: strings('predict_next.withdraw.status.failed.title'),
    body: strings('predict_next.withdraw.status.failed.body'),
    tone: TextColor.ErrorDefault,
    icon: IconName.CircleX,
    iconColor: IconColor.ErrorDefault,
  },
  returned: {
    title: strings('predict_next.withdraw.status.returned.title'),
    body: strings('predict_next.withdraw.status.returned.body'),
    tone: TextColor.WarningDefault,
    icon: IconName.Info,
    iconColor: IconColor.WarningDefault,
  },
};

/** The amount the Venue reports as withdrawn, once it reports one. */
const withdrawnValue = (receipt: PredictWithdrawReceipt): string | null =>
  receipt.withdrawnAmount === null ? null : formatUsd(receipt.withdrawnAmount);

interface WithdrawStatusStepProps {
  receipt: PredictWithdrawReceipt;
  isPrivacyMode: boolean;
}

/**
 * Outcome step. A settled Withdrawal shows the amount the Venue actually
 * withdrew — for a sweep that is its own figure, not the requested one — and
 * says what a partial sweep left behind. A rejection says why nothing moved.
 */
export const WithdrawStatusStep = ({
  receipt,
  isPrivacyMode,
}: WithdrawStatusStepProps) => {
  if (receipt.status === 'rejected') {
    const copy = rejectionCopy(
      receipt.rejectionCode ??
        // The contract guarantees the code on a rejection; a receipt without
        // one is treated as the Venue's refusal rather than an empty screen.
        'venue_rejected',
    );
    return (
      <Box gap={2} testID={PredictWithdrawFlowTestIds.STATUS}>
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.ErrorDefault}
          testID={PredictWithdrawFlowTestIds.STATUS_REJECTION}
        >
          {copy.title}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {copy.body}
        </Text>
      </Box>
    );
  }

  const copy = STATUS_COPY[receipt.status];
  const withdrawn = withdrawnValue(receipt);
  const isSettled = receipt.status === 'settled';
  const isSweep = receipt.mode === 'sweep_all';

  return (
    <Box gap={2} testID={PredictWithdrawFlowTestIds.STATUS}>
      <Box
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="py-2"
        testID={PredictWithdrawFlowTestIds.status(receipt.status)}
      >
        <Icon name={copy.icon} size={IconSize.Xl} color={copy.iconColor} />
        <Text variant={TextVariant.HeadingSm} color={copy.tone}>
          {copy.title}
        </Text>
        {isSettled && withdrawn !== null ? (
          <SensitiveText
            variant={TextVariant.DisplayMd}
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Medium}
            testID={PredictWithdrawFlowTestIds.STATUS_AMOUNT}
          >
            {withdrawn}
          </SensitiveText>
        ) : null}
        {isSettled && isSweep ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('predict_next.withdraw.status.sweep_remainder')}
          </Text>
        ) : null}
      </Box>
      {receipt.needsManualReview ? (
        <Box gap={1}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings('predict_next.withdraw.status.manual_review.title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('predict_next.withdraw.status.manual_review.body')}
          </Text>
        </Box>
      ) : copy.body ? (
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {copy.body}
        </Text>
      ) : null}
    </Box>
  );
};
