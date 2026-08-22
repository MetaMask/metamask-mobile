import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

interface SegmentProps {
  isFilled: boolean;
}

const Segment: React.FC<SegmentProps> = ({ isFilled }) => {
  const tw = useTailwind();
  const fillStyle = useAnimatedStyle(
    () => ({ opacity: withTiming(isFilled ? 1 : 0, { duration: 220 }) }),
    [isFilled],
  );

  return (
    <Box twClassName="flex-1 h-1 rounded-full bg-muted overflow-hidden">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          tw.style('rounded-full bg-icon-default'),
          fillStyle,
        ]}
      />
    </Box>
  );
};

export interface DeckProgressBarProps {
  /** Number of cards already consumed. */
  progress: number;
  total: number;
}

/** Thin segmented progress bar: one segment per card, fills as cards go. */
const DeckProgressBar: React.FC<DeckProgressBarProps> = ({
  progress,
  total,
}) => (
  // gap-0.5 keeps a 20-segment bar readable on narrow screens.
  <Box twClassName="flex-row gap-0.5 px-4">
    {Array.from({ length: total }, (_, index) => (
      <Segment key={index} isFilled={index < progress} />
    ))}
  </Box>
);

export default DeckProgressBar;
