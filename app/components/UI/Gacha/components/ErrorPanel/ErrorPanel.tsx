import React from 'react';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { GachaErrorPanelTestIds } from '../../Gacha.testIds';

export interface ErrorPanelProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  testID?: string;
}

/** Inline error block with an optional "Try again". */
const ErrorPanel = ({
  title,
  description,
  onRetry,
  testID,
}: ErrorPanelProps) => (
  <Box
    alignItems={BoxAlignItems.Center}
    gap={2}
    twClassName="py-8"
    testID={testID}
  >
    <Text variant={TextVariant.BodyMd} twClassName="text-center">
      {title}
    </Text>
    {description ? (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {description}
      </Text>
    ) : null}
    {onRetry ? (
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Md}
        onPress={onRetry}
        testID={GachaErrorPanelTestIds.RETRY}
      >
        {strings('gacha.cards.retry')}
      </Button>
    ) : null}
  </Box>
);

export default ErrorPanel;
