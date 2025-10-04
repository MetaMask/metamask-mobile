import React from 'react';
import { View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

interface OnboardingSuccessAnimationProps {
  startAnimation: boolean;
  onAnimationComplete: () => void;
  autoComplete?: boolean;
  mode?: 'setup' | 'ready';
}

const OnboardingSuccessAnimation: React.FC<OnboardingSuccessAnimationProps> = ({
  onAnimationComplete,
}) => {
  React.useEffect(() => {
    // Simulate animation completion after a short delay
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 100);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <Box testID="mock-onboarding-success-animation">
      <View testID="mock-static-image" />
    </Box>
  );
};

export default OnboardingSuccessAnimation;
