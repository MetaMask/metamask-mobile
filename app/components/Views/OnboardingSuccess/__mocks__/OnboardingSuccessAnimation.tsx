import React from 'react';
import { View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

interface OnboardingSuccessAnimationProps {
  startAnimation: boolean;
  onAnimationComplete: () => void;
  slideOut?: boolean;
  mode?: 'setup' | 'success';
  trigger?: string;
  showText?: boolean;
}

const OnboardingSuccessAnimation: React.FC<OnboardingSuccessAnimationProps> = ({
  onAnimationComplete,
  slideOut = false,
}) => {
  React.useEffect(() => {
    if (slideOut) {
      onAnimationComplete();
    }
  }, [slideOut, onAnimationComplete]);

  React.useEffect(() => {
    if (!slideOut) {
      // Simulate animation
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [slideOut, onAnimationComplete]);

  return (
    <Box testID="mock-onboarding-success-animation">
      <View testID="mock-static-image" />
    </Box>
  );
};

export default OnboardingSuccessAnimation;
