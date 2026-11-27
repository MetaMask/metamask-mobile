import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
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

/** Full-panel failure state for one independently loaded Portfolio panel. */
export const PortfolioPanelError = ({
  onRetry,
  testID,
  retryTestID,
}: PortfolioPanelErrorProps) => (
  <Box testID={testID} className="flex-1 items-center justify-center px-6">
    <Icon
      name={IconName.Warning}
      size={IconSize.Xl}
      color={IconColor.IconMuted}
      twClassName="mb-4"
    />
    <Text
      variant={TextVariant.HeadingMd}
      color={TextColor.TextDefault}
      className="mb-2 text-center"
    >
      {strings('predict_next.portfolio.load_failed')}
    </Text>
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={onRetry}
      className="w-full self-center"
      testID={retryTestID}
    >
      {strings('predict_next.portfolio.load_failed_retry')}
    </Button>
  </Box>
);
