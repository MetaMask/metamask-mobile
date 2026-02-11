import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface SegmentedProgressBarProps {
  currentStep: number; // 0 to 3
  totalSteps: number;
}

const SegmentedProgressBar = ({ currentStep, totalSteps }: SegmentedProgressBarProps) => {
  const tw = useTailwind();
  
  return (
    <Box twClassName="flex-row gap-1 mb-4 h-1 w-full">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <Box
          key={index}
          style={tw.style(
            'flex-1 rounded-full',
            index < currentStep ? 'bg-success-default' : 'bg-background-alternative'
          )}
        />
      ))}
    </Box>
  );
};

export default SegmentedProgressBar;
