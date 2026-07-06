import React from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  Box,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import RiveOnboardingStepper from './RiveOnboardingStepper';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const PLACEHOLDER_RIVE_SOURCE = require('../../../animations/onboard_checklist_v05.riv');

const PLACEHOLDER_BACKGROUND_IMAGE = {
  uri: 'https://picsum.photos/seed/rive-onboarding-placeholder/800/1200',
};

const styles = StyleSheet.create({
  decorator: {
    height: 700,
  },
  image: {
    height: '100%',
    width: '100%',
  },
});

const PLACEHOLDER_STEPS = [
  {
    title: 'Welcome',
    body: 'Placeholder copy for the first onboarding step.',
    footerText: 'Footer note for step one',
    durationMs: 5000,
    buttonLabel: 'Next',
  },
  {
    title: 'Almost there',
    body: 'Placeholder copy for the second onboarding step.',
    footerText: 'Footer note for step two',
    durationMs: 5000,
    buttonLabel: 'Get started',
  },
];

const RiveOnboardingStepperMeta = {
  title: 'Components / UI / RiveOnboardingStepper',
  component: RiveOnboardingStepper,
  decorators: [
    (Story: React.FC) => (
      <Box twClassName="bg-default" style={styles.decorator}>
        <Story />
      </Box>
    ),
  ],
};

export default RiveOnboardingStepperMeta;

export const Default = {
  args: {
    steps: PLACEHOLDER_STEPS,
    riveConfig: {
      source: PLACEHOLDER_RIVE_SOURCE,
      stateMachineName: 'State Machine 1',
      triggerName: 'next',
    },
    renderBackground: () => (
      <Image
        source={PLACEHOLDER_BACKGROUND_IMAGE}
        style={styles.image}
        resizeMode="cover"
      />
    ),
    titleTextColor: TextColor.OverlayInverse,
    bodyTextColor: TextColor.OverlayInverse,
    footerTextColor: TextColor.OverlayInverse,
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    progressBarColor: '#ffffff',
    closeButtonIconColor: IconColor.PrimaryInverse,
    enableRiveAnimation: false,
    onClose: (stepIndex: number) => {
      // eslint-disable-next-line no-console
      console.log('Close pressed at step', stepIndex);
    },
    onComplete: (stepIndex: number) => {
      // eslint-disable-next-line no-console
      console.log('Onboarding complete at step', stepIndex);
    },
  },
};
