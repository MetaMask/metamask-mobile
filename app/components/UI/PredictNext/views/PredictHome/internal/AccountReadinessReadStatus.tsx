import React from 'react';
import {
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
import type {
  AccountReadinessConnection,
  AccountReadinessValue,
} from '../../../onboarding/accountReadiness.types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface AccountReadinessReadStatusProps {
  connection: AccountReadinessConnection;
  readError: AccountReadinessValue['readError'];
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * The read-only companion to a readiness card (or on its own when there is
 * nothing cached). It never starts setup and cannot dismiss a known card.
 */
export const AccountReadinessReadStatus = ({
  connection,
  readError,
  isRefreshing,
  onRefresh,
}: AccountReadinessReadStatusProps) => {
  const message =
    connection === 'offline'
      ? strings('predict_next.account_readiness.offline')
      : readError === 'unavailable'
        ? strings('predict_next.account_readiness.read_failed')
        : strings('predict_next.account_readiness.slow_connection');

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      flexDirection={BoxFlexDirection.Row}
      gap={3}
      testID={PredictHomeTestIds.ACCOUNT_READINESS_READ_STATUS}
      twClassName="px-1"
    >
      <Text
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        color={TextColor.TextAlternative}
        twClassName="flex-1"
        variant={TextVariant.BodySm}
      >
        {message}
      </Text>
      {connection === 'offline' ? null : (
        <Button
          accessibilityLabel={strings('predict_next.account_readiness.refresh')}
          isDisabled={isRefreshing}
          onPress={onRefresh}
          size={ButtonSize.Sm}
          testID={PredictHomeTestIds.ACCOUNT_READINESS_REFRESH}
          variant={ButtonVariant.Tertiary}
        >
          {strings('predict_next.account_readiness.refresh')}
        </Button>
      )}
    </Box>
  );
};
