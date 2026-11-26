import React from 'react';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonVariant,
  FontFamily,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import { PredictError, PredictErrorCode } from '../../../errors';
import type { PredictBalance } from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

const formatUsd = (value: string): string =>
  `$${new BigNumber(value).toFixed(2, BigNumber.ROUND_HALF_UP)}`;

const BalanceAmount = ({
  available,
  depositStatus,
  privacyMode,
}: {
  available: string;
  depositStatus?: React.ReactNode;
  privacyMode: boolean;
}): React.ReactElement => (
  <Box gap={1} testID={PredictHomeTestIds.BALANCE}>
    <SensitiveText
      variant={TextVariant.AmountDisplayLg}
      fontFamily={FontFamily.Hero}
      isHidden={privacyMode}
      length={SensitiveTextLength.Medium}
      testID={PredictHomeTestIds.BALANCE_AMOUNT}
    >
      {formatUsd(available)}
    </SensitiveText>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {strings('predict_next.available_balance')}
    </Text>
    {depositStatus}
  </Box>
);

export const BalanceSummary = ({
  balance,
  isLoading,
  error,
  onRetry,
  depositStatus,
  showZeroBalance = false,
}: {
  balance?: PredictBalance;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  depositStatus?: React.ReactNode;
  /** A known inactive account has no readable Balance, so show `$0.00`
   * instead of the read's loading or failure state. */
  showZeroBalance?: boolean;
}): React.ReactElement | null => {
  const privacyMode = useSelector(selectPrivacyMode);

  // Retrying cannot lift a regional block, so it gets no retry button.
  if (
    !balance &&
    error instanceof PredictError &&
    error.code === PredictErrorCode.GEO_BLOCKED
  ) {
    return (
      <Text
        variant={TextVariant.BodyMd}
        testID={PredictHomeTestIds.BALANCE_GEO_BLOCKED}
      >
        {strings('predict_next.unavailable_in_region')}
      </Text>
    );
  }

  // Before activation the Balance read has nothing to show, and its failure
  // is not actionable. A known inactive account reads as `$0.00`.
  if (showZeroBalance) {
    return (
      <BalanceAmount
        available="0"
        depositStatus={depositStatus}
        privacyMode={privacyMode}
      />
    );
  }

  if (isLoading) {
    return (
      <Box gap={2} testID={PredictHomeTestIds.BALANCE_LOADING}>
        <Skeleton height={40} width={160} />
        <Skeleton height={20} width={120} />
      </Box>
    );
  }

  if (!balance && error) {
    return (
      <Box gap={2} testID={PredictHomeTestIds.BALANCE_ERROR}>
        <Text variant={TextVariant.BodyMd}>
          {strings('predict_next.balance_unavailable.title')}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('predict_next.balance_unavailable.description')}
        </Text>
        <Box twClassName="self-start">
          <Button
            variant={ButtonVariant.Secondary}
            onPress={onRetry}
            testID={PredictHomeTestIds.BALANCE_RETRY}
          >
            {strings('predict_next.balance_unavailable.retry')}
          </Button>
        </Box>
      </Box>
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <BalanceAmount
      available={balance.available}
      depositStatus={depositStatus}
      privacyMode={privacyMode}
    />
  );
};
