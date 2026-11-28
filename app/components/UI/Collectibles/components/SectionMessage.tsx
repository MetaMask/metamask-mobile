import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';

interface Props {
  message: string;
  className?: string;
  onRetry?: () => void;
  testID?: string;
}

export function SectionMessage({
  message,
  className = '',
  onRetry,
  testID,
}: Props) {
  return (
    <View
      className={`items-center gap-2 px-2 py-4 ${className}`}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        className="text-center"
      >
        {message}
      </Text>
      {onRetry ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={onRetry}
        >
          {strings('collectibles.pack_detail.retry')}
        </Button>
      ) : null}
    </View>
  );
}
