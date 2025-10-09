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
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    if (slideOut && !completedRef.current) {
      // Simulate immediate completion for slideOut
      completedRef.current = true;
      onAnimationComplete();
    }
  }, [slideOut, onAnimationComplete]);

  React.useEffect(() => {
    if (!slideOut && !completedRef.current) {
      const timer = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onAnimationComplete();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [slideOut, onAnimationComplete]);

  React.useEffect(() => () => {
      completedRef.current = false;
    }, []);

  return (
    <Box testID="mock-onboarding-success-animation">
      <View testID="mock-static-image" />
    </Box>
  );
};

export default OnboardingSuccessAnimation;
