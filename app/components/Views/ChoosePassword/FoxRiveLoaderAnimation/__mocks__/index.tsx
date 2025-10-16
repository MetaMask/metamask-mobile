import React from 'react';
import { View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

interface FoxRiveLoaderAnimationProps {
  onAnimationComplete?: () => void;
}

const FoxRiveLoaderAnimation: React.FC<FoxRiveLoaderAnimationProps> = ({
  onAnimationComplete,
}) => {
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    if (!completedRef.current) {
      const timer = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onAnimationComplete?.();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [onAnimationComplete]);

  React.useEffect(
    () => () => {
      completedRef.current = false;
    },
    [],
  );

  return (
    <Box testID="mock-onboarding-success-animation">
      <View testID="mock-static-image" />
    </Box>
  );
};

export default FoxRiveLoaderAnimation;
