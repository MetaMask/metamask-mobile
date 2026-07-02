import React from 'react';
import { View } from 'react-native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface WalletHomeOnboardingStepperProps {
  /** Total number of discrete segments to render (one per visible checklist step). */
  totalSteps: number;
  /** Zero-based index of the step the user is currently on. */
  currentStepIndex: number;
  /** Screen-reader announcement describing current/total progress. */
  accessibilityLabel: string;
  /** Test ID applied to the container (kept stable across arms for E2E selectors). */
  testID: string;
}

/**
 * Treatment indicator for the onboarding checklist stepper experiment (TMCU-828).
 *
 * Renders one discrete segment per visible checklist step (4px tall, 4px gap
 * per Home 2026 Figma). Segments up to and including the active step use
 * success-default; upcoming segments use success-muted.
 */
const WalletHomeOnboardingStepper = ({
  totalSteps,
  currentStepIndex,
  accessibilityLabel,
  testID,
}: WalletHomeOnboardingStepperProps) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      gap={1}
      twClassName="w-full"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const isFilled = index <= currentStepIndex;
        return (
          <View
            key={index}
            style={tw.style(
              'h-1 flex-1 rounded-lg',
              isFilled ? 'bg-success-default' : 'bg-success-muted',
            )}
            testID={`${testID}-segment-${index}`}
          />
        );
      })}
    </Box>
  );
};

export default WalletHomeOnboardingStepper;
