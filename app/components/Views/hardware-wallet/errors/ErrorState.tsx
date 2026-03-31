import React, { ReactNode } from 'react';
import { Image, ImageSourcePropType } from 'react-native';
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

type ErrorAction = {
  label: string;
  onPress: () => void;
  testID: string;
  variant: ButtonVariant;
};

type ErrorStateProps = {
  testID: string;
  title: string;
  description: string;
  isBusy?: boolean;
  imageSource?: ImageSourcePropType;
  imageClassName?: string;
  illustration?: ReactNode;
  primaryAction: ErrorAction;
  secondaryAction?: ErrorAction;
};

const ErrorState = ({
  testID,
  title,
  description,
  isBusy = false,
  imageSource,
  imageClassName = 'h-[240px] w-[280px]',
  illustration,
  primaryAction,
  secondaryAction,
}: ErrorStateProps) => {
  const tw = useTailwind();

  return (
    <Box testID={testID} twClassName="flex-1 justify-between pb-4 pt-16">
      <Box twClassName="items-center">
        <Box twClassName="h-[300px] w-full items-center justify-center">
          {illustration ??
            (imageSource ? (
              <Image
                resizeMode="contain"
                source={imageSource}
                style={tw.style(imageClassName)}
              />
            ) : null)}
        </Box>

        <Box twClassName="w-full px-4">
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

      <Box
        twClassName={secondaryAction ? 'w-full flex-row gap-4' : 'w-full px-4'}
      >
        {secondaryAction ? (
          <Button
            testID={secondaryAction.testID}
            variant={secondaryAction.variant}
            size={ButtonSize.Lg}
            onPress={secondaryAction.onPress}
            isDisabled={isBusy}
            style={tw.style('flex-1')}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
        <Button
          testID={primaryAction.testID}
          variant={primaryAction.variant}
          size={ButtonSize.Lg}
          onPress={primaryAction.onPress}
          isDisabled={isBusy}
          style={tw.style(secondaryAction ? 'flex-1' : 'w-full')}
        >
          {primaryAction.label}
        </Button>
      </Box>
    </Box>
  );
};

export default ErrorState;
