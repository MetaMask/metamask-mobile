import React from 'react';
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface WalletHomeOnboardingProgressBarProps {
  progressRatio: SharedValue<number>;
  accessibilityLabel: string;
  testID: string;
}

/**
 * Continuous checklist progress fill. Animates layout `width` on the UI thread
 * via Reanimated (not legacy JS `Animated`), preserving fully rounded caps on
 * both edges like the pre-migration bar.
 */
const WalletHomeOnboardingProgressBar = ({
  progressRatio,
  accessibilityLabel,
  testID,
}: WalletHomeOnboardingProgressBarProps) => {
  const tw = useTailwind();
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressRatio.value * 100}%`,
  }));

  return (
    <Box
      twClassName="h-2 w-full rounded-full bg-muted overflow-hidden"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Reanimated.View
        style={[tw.style('h-full rounded-full bg-success-default'), fillStyle]}
      />
    </Box>
  );
};

export default WalletHomeOnboardingProgressBar;
