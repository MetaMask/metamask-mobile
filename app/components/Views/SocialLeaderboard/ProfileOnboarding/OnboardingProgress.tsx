import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type {
  ProfileOnboardingPath,
  ProfileOnboardingStep,
} from './profileOnboardingDraft';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

const MANUAL_PROGRESS_SEGMENT_COUNT = 4;
const X_PROGRESS_SEGMENT_COUNT = 3;

/** How long the active segment takes to fill. */
export const PROGRESS_FILL_MS = 280;

const PROGRESS_FILL_EASING = Easing.out(Easing.cubic);

const progressSegmentCount = (path: ProfileOnboardingPath): number =>
  path === 'x' ? X_PROGRESS_SEGMENT_COUNT : MANUAL_PROGRESS_SEGMENT_COUNT;

const progressFilledCount = (
  step: ProfileOnboardingStep,
  path: ProfileOnboardingPath,
): number => {
  if (path === 'x') {
    switch (step) {
      case 'x-identity':
      case 'avatar':
        return 1;
      case 'account':
        return 2;
      case 'ready':
        return 3;
      default:
        return 0;
    }
  }

  switch (step) {
    case 'username':
      return 1;
    case 'avatar':
      return 2;
    case 'account':
      return 3;
    case 'ready':
      return 4;
    default:
      return 0;
  }
};

const fillTestId = (index: number) =>
  `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-fill-${index}`;

/**
 * One track. Its black fill grows from 0% to 100% when it becomes the active
 * step, and shrinks back when the user leaves it. Segments that stay filled
 * are left alone, so only the newly active bar moves.
 */
const ProgressSegment: React.FC<{ filled: boolean; index: number }> = ({
  filled,
  index,
}) => {
  const tw = useTailwind();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion && filled ? 1 : 0);

  useEffect(() => {
    const target = filled ? 1 : 0;
    progress.value = reducedMotion
      ? target
      : withTiming(target, {
          duration: PROGRESS_FILL_MS,
          easing: PROGRESS_FILL_EASING,
        });
  }, [filled, progress, reducedMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Box
      twClassName="flex-1 h-1 rounded-full bg-muted overflow-hidden"
      testID={`${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-${index}`}
    >
      <Animated.View
        style={[tw.style('h-full bg-icon-default'), fillStyle]}
        testID={fillTestId(index)}
      />
    </Box>
  );
};

/**
 * Sits above the header, so it carries the top inset. A static inset rather
 * than a safe-area edge, which recalculates mid push transition (TSA-970).
 */
const OnboardingProgress: React.FC<{
  step: ProfileOnboardingStep;
  path: ProfileOnboardingPath;
  topInset: number;
}> = ({ step, path, topInset }) => {
  const filledCount = progressFilledCount(step, path);
  const segmentCount = progressSegmentCount(path);
  if (filledCount === 0) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      gap={1}
      paddingHorizontal={4}
      style={{ paddingTop: topInset + 8 }}
      testID={SocialProfileOnboardingSelectorsIDs.PROGRESS}
    >
      {Array.from({ length: segmentCount }, (_, index) => (
        <ProgressSegment
          key={`progress-${index}`}
          index={index}
          filled={index < filledCount}
        />
      ))}
    </Box>
  );
};

export default OnboardingProgress;
