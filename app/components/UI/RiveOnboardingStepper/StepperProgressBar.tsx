import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { RiveOnboardingStepperTestIds } from './RiveOnboardingStepper.testIds';

interface StepperProgressBarProps {
  totalSteps: number;
  currentStepIndex: number;
  progress: SharedValue<number>;
  progressBarColor: string;
}

const BAR_HEIGHT = 2;
const BAR_GAP = 4;
const INACTIVE_OPACITY = 0.3;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: BAR_GAP,
    width: '100%',
  },
  segmentTrack: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  segmentFill: {
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: BAR_HEIGHT / 2,
    transformOrigin: 'left center',
  },
});

enum StepperProgressBarState {
  Completed = 'completed',
  Active = 'active',
  Upcoming = 'upcoming',
}
interface SegmentProps {
  color: string;
  state: StepperProgressBarState;
  progress: SharedValue<number>;
  testID?: string;
}

const Segment = React.memo(
  ({ color, state, progress, testID }: SegmentProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      if (state === StepperProgressBarState.Completed) {
        return { transform: [{ scaleX: 1 }], opacity: 1 };
      }
      if (state === StepperProgressBarState.Upcoming) {
        return { transform: [{ scaleX: 1 }], opacity: INACTIVE_OPACITY };
      }
      return {
        transform: [{ scaleX: progress.value }],
        opacity: 1,
      };
    });

    return (
      <View
        style={[styles.segmentTrack, { backgroundColor: `${color}4D` }]}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.segmentFill,
            { backgroundColor: color },
            animatedStyle,
          ]}
        />
      </View>
    );
  },
);

const StepperProgressBar = ({
  totalSteps,
  currentStepIndex,
  progress,
  progressBarColor,
}: StepperProgressBarProps) => (
  <View
    style={styles.container}
    testID={RiveOnboardingStepperTestIds.PROGRESS_BAR}
  >
    {Array.from({ length: totalSteps }, (_, index) => {
      const state =
        index < currentStepIndex
          ? StepperProgressBarState.Completed
          : index === currentStepIndex
            ? StepperProgressBarState.Active
            : StepperProgressBarState.Upcoming;
      return (
        <Segment
          key={index}
          color={progressBarColor}
          state={state}
          progress={progress}
          testID={`${RiveOnboardingStepperTestIds.PROGRESS_SEGMENT}-${index}`}
        />
      );
    })}
  </View>
);

export default StepperProgressBar;
