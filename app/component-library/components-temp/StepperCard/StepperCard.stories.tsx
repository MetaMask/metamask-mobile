import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import StepperCard from './StepperCard';
import type { StepperCardStep } from './StepperCard.types';

const PLACEHOLDER_IMAGE = {
  uri: 'https://picsum.photos/seed/stepper-card-placeholder/800/450',
};

const StepperCardStory = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: StepperCardStep[] = [
    {
      title: 'Get started',
      description: 'Placeholder copy for the first step in the flow.',
      image: PLACEHOLDER_IMAGE,
      primaryCta: {
        text: 'Continue',
        onPress: () => setCurrentStep(1),
      },
      secondaryCta: {
        text: 'Skip',
        onPress: () => setCurrentStep(2),
      },
    },
    {
      title: 'Almost there',
      description: 'Placeholder copy for the second step in the flow.',
      image: {
        uri: 'https://picsum.photos/seed/stepper-card-step-two/800/450',
      },
      primaryCta: {
        text: 'Finish',
        onPress: () => setCurrentStep(2),
      },
    },
  ];

  return (
    <Box twClassName="p-4">
      <StepperCard
        steps={steps}
        currentStep={currentStep}
        onComplete={() => {
          // eslint-disable-next-line no-console
          console.log('StepperCard complete');
        }}
        testID="stepper-card"
      />
    </Box>
  );
};

const StepperCardMeta = {
  title: 'Components Temp / StepperCard',
  component: StepperCard,
};

export default StepperCardMeta;

export const Default = {
  render: () => <StepperCardStory />,
};
