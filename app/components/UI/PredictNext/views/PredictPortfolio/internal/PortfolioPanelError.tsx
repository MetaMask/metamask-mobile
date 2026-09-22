import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

interface PortfolioPanelErrorProps {
  onRetry: () => void;
  testID: string;
  retryTestID: string;
}

/** Inline failure state for one independently loaded Portfolio panel. */
export const PortfolioPanelError = ({
  onRetry,
  testID,
  retryTestID,
}: PortfolioPanelErrorProps) => (
  <Box testID={testID} twClassName="items-center py-8">
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="mb-3 text-center"
    >
      {strings('predict_next.portfolio.load_failed')}
    </Text>
    <Button
      variant={ButtonVariant.Tertiary}
      onPress={onRetry}
      testID={retryTestID}
    >
      {strings('predict_next.portfolio.load_failed_retry')}
    </Button>
  </Box>
);
