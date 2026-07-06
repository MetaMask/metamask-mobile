import React from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  Box,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import StepperContent from './StepperContent';

const PLACEHOLDER_BACKGROUND_IMAGE = {
  uri: 'https://picsum.photos/seed/stepper-content/800/400',
};

const backgroundStyles = StyleSheet.create({
  image: {
    height: '100%',
    width: '100%',
  },
});

interface StepperContentStoryProps {
  title?: string;
  body?: string;
  showCloseButton?: boolean;
}

const StepperContentStory = ({
  title = 'Welcome to MetaMask',
  body = 'Placeholder body copy for the onboarding step. Keep to about two lines.',
  showCloseButton = true,
}: StepperContentStoryProps) => (
  <Box twClassName="relative h-48 overflow-hidden">
    <Image
      source={PLACEHOLDER_BACKGROUND_IMAGE}
      style={backgroundStyles.image}
      resizeMode="cover"
    />
    <Box twClassName="absolute inset-0 px-4 pt-4">
      <StepperContent
        title={title}
        body={body}
        titleTextColor={TextColor.OverlayInverse}
        bodyTextColor={TextColor.OverlayInverse}
        closeButtonIconColor={IconColor.PrimaryInverse}
        onClose={
          showCloseButton
            ? () => {
                // eslint-disable-next-line no-console
                console.log('Close pressed');
              }
            : undefined
        }
      />
    </Box>
  </Box>
);

const StepperContentMeta = {
  title: 'Components / UI / RiveOnboardingStepper / StepperContent',
  component: StepperContent,
};

export default StepperContentMeta;

export const Default = {
  render: () => <StepperContentStory />,
};

export const WithoutCloseButton = {
  render: () => <StepperContentStory showCloseButton={false} />,
};
