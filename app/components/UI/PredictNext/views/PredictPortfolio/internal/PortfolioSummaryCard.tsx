import React from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictBalance } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';

const formatUsd = (value: string): string =>
  `$${new BigNumber(value).toFixed(2, BigNumber.ROUND_HALF_UP)}`;

interface PortfolioSummaryCardProps {
  balance?: PredictBalance;
  isError: boolean;
  isLoading: boolean;
  isPrivacyMode: boolean;
  onRetry: () => void;
}

export const PortfolioSummaryCard = ({
  balance,
  isError,
  isLoading,
  isPrivacyMode,
  onRetry,
}: PortfolioSummaryCardProps) => (
  <Box
    twClassName="my-4 flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
    testID={PredictPortfolioScreenTestIds.SUMMARY_CARD}
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('predict_next.available_balance')}
    </Text>
    {isLoading ? (
      <Skeleton
        height={20}
        width={80}
        testID={PredictPortfolioScreenTestIds.BALANCE_LOADING}
      />
    ) : isError || !balance ? (
      <Box alignItems={BoxAlignItems.End} gap={1}>
        <Text
          variant={TextVariant.BodyMd}
          testID={PredictPortfolioScreenTestIds.BALANCE_ERROR}
        >
          —
        </Text>
        <Button
          variant={ButtonVariant.Tertiary}
          onPress={onRetry}
          testID={PredictPortfolioScreenTestIds.BALANCE_RETRY}
        >
          {strings('predict_next.balance_unavailable.retry')}
        </Button>
      </Box>
    ) : (
      <SensitiveText
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        isHidden={isPrivacyMode}
        length={SensitiveTextLength.Medium}
        testID={PredictPortfolioScreenTestIds.BALANCE_VALUE}
      >
        {formatUsd(balance.available)}
      </SensitiveText>
    )}
  </Box>
);
