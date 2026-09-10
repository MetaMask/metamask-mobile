import React from 'react';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonVariant,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import type { PredictBalance } from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

const formatUsd = (value: string): string =>
  `$${new BigNumber(value).toFixed(2, BigNumber.ROUND_HALF_UP)}`;

export const BalanceSummary = ({
  balance,
  isLoading,
  isError,
  onRetry,
}: {
  balance?: PredictBalance;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) => {
  const privacyMode = useSelector(selectPrivacyMode);

  if (isLoading) {
    return (
      <Box gap={2} testID={PredictHomeTestIds.BALANCE_LOADING}>
        <Skeleton height={40} width={160} />
        <Skeleton height={20} width={120} />
      </Box>
    );
  }

  if (!balance && isError) {
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
    <Box gap={1} testID={PredictHomeTestIds.BALANCE}>
      <SensitiveText
        variant={TextVariant.DisplayLg}
        isHidden={privacyMode}
        length={SensitiveTextLength.Medium}
        testID={PredictHomeTestIds.BALANCE_AMOUNT}
      >
        {formatUsd(balance.available)}
      </SensitiveText>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('predict.available_balance')}
      </Text>
    </Box>
  );
};
