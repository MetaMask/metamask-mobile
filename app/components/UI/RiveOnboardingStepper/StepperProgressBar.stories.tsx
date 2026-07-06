import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import StepperProgressBar from './StepperProgressBar';

const PLACEHOLDER_BACKGROUND_IMAGE = {
  uri: 'https://picsum.photos/seed/stepper-progress-bar/800/200',
};

const backgroundStyles = StyleSheet.create({
  image: {
    height: '100%',
    width: '100%',
  },
});

interface StepperProgressBarStoryProps {
  totalSteps?: number;
  currentStepIndex?: number;
}

const StepperProgressBarStory = ({
  totalSteps = 4,
  currentStepIndex = 1,
}: StepperProgressBarStoryProps) => {
  const progress = useSharedValue(currentStepIndex === 0 ? 1 : 0);

  useEffect(() => {
    if (currentStepIndex === 0) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, { duration: 5000 });
  }, [currentStepIndex, progress]);

  return (
    <Box twClassName="relative h-24 overflow-hidden">
      <Image
        source={PLACEHOLDER_BACKGROUND_IMAGE}
        style={backgroundStyles.image}
        resizeMode="cover"
      />
      <Box twClassName="absolute inset-0 p-4 pt-6">
        <StepperProgressBar
          totalSteps={totalSteps}
          currentStepIndex={currentStepIndex}
          progress={progress}
          // eslint-disable-next-line @metamask/design-tokens/color-no-hex
          progressBarColor="#ffffff"
        />
      </Box>
    </Box>
  );
};

const StepperProgressBarMeta = {
  title: 'Components / UI / RiveOnboardingStepper / StepperProgressBar',
  component: StepperProgressBar,
};

export default StepperProgressBarMeta;

export const Default = {
  render: () => <StepperProgressBarStory />,
};
