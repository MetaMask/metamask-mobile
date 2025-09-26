import React from 'react';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { RootState } from '../../../../../reducers';
import { useColorScheme } from 'react-native';

interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number; // 0-based index
  variant?: 'dots' | 'bars';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  totalSteps,
  currentStep,
  variant = 'bars',
}) => {
  const tw = useTailwind();
  const appTheme: AppThemeKey = useSelector(
    (state: RootState) => state.user.appTheme,
  );
  const osColorScheme = useColorScheme();
  const activeColor =
    appTheme === AppThemeKey.dark || osColorScheme === 'dark'
      ? 'bg-white'
      : 'bg-black';

  if (variant === 'dots') {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
        testID="progress-indicator-container"
      >
        {Array.from({ length: totalSteps }, (_, index) => (
          <Box
            key={index}
            style={tw.style(
              'w-2 h-2 rounded-full',
              index === currentStep - 1 ? activeColor : 'bg-border-muted',
            )}
          />
        ))}
      </Box>
    );
  }

  // Default: bars variant
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Center}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1"
      testID="progress-indicator-container"
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <Box
          key={index}
          style={tw.style(
            'h-2 rounded-xl',
            index === currentStep - 1
              ? `w-6 ${activeColor} ` // Current step is wider
              : 'w-2 bg-border-muted', // Future steps
          )}
        />
      ))}
    </Box>
  );
};

export default ProgressIndicator;
