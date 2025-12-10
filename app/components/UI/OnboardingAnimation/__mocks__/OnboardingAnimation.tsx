import React, { useEffect } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

interface OnboardingAnimationMockProps {
  children: React.ReactNode;
  startOnboardingAnimation: boolean;
  setStartFoxAnimation: (value: boolean) => void;
}

const OnboardingAnimationMock = ({
  children,
  startOnboardingAnimation,
  setStartFoxAnimation,
}: OnboardingAnimationMockProps) => {
  const tw = useTailwind();

  useEffect(() => {
    if (startOnboardingAnimation) {
      setStartFoxAnimation(true);
    }
  }, [startOnboardingAnimation, setStartFoxAnimation]);

  return (
    <Box
      testID="onboarding-animation-mock"
      twClassName="w-full items-center justify-center"
      style={tw.style('px-4 py-6')}
    >
      {children}
    </Box>
  );
};

export default OnboardingAnimationMock;
