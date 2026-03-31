import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import ConnectionErrorIllustration, {
  ConnectionErrorIllustrationVariant,
} from './ConnectionErrorIllustration';

interface ConnectionErrorAction {
  label: string;
  onPress: () => void;
  testID: string;
  variant: ButtonVariant;
}

interface ConnectionErrorStateProps {
  testID: string;
  title: string;
  description: string;
  isBusy?: boolean;
  illustrationVariant: ConnectionErrorIllustrationVariant;
  actions?: ConnectionErrorAction[];
  bottomAction?: ConnectionErrorAction;
}

const ConnectionErrorState = ({
  testID,
  title,
  description,
  isBusy = false,
  illustrationVariant,
  actions = [],
  bottomAction,
}: ConnectionErrorStateProps) => {
  const tw = useTailwind();

  return (
    <Box testID={testID} twClassName="w-full flex-1 justify-between pb-4 pt-16">
      <Box twClassName="items-center">
        <ConnectionErrorIllustration variant={illustrationVariant} />

        <Box twClassName="w-full px-8">
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Medium}
            twClassName="text-center"
          >
            {title}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-2 text-center"
          >
            {description}
          </Text>
        </Box>
      </Box>

      <Box twClassName="w-full">
        {actions.length ? (
          <Box twClassName="w-full px-4">
            {actions.map((action, index) => (
              <Button
                key={action.testID}
                testID={action.testID}
                variant={action.variant}
                size={ButtonSize.Lg}
                onPress={action.onPress}
                style={tw.style(index === 0 ? 'w-full' : 'mt-4 w-full')}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        ) : null}

        {bottomAction ? (
          <Box twClassName="w-full px-4 pt-4">
            <Button
              testID={bottomAction.testID}
              variant={bottomAction.variant}
              size={ButtonSize.Lg}
              onPress={bottomAction.onPress}
              style={tw.style('w-full')}
            >
              {bottomAction.label}
            </Button>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default ConnectionErrorState;
