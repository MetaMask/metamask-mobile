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
 * Renders one discrete segment per visible checklist step. Segments up to and
 * including the active step are filled; upcoming steps are muted. This replaces
 * the continuous fill bar so users see how many concrete steps remain rather
 * than an abstract percentage.
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
      gap={2}
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
              'h-2 flex-1 rounded-full overflow-hidden',
              isFilled ? 'bg-success-default' : 'bg-muted',
            )}
            testID={`${testID}-segment-${index}`}
          />
        );
      })}
    </Box>
  );
};

export default WalletHomeOnboardingStepper;
