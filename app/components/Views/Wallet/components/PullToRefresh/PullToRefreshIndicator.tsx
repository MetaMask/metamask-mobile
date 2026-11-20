import React from 'react';
import { RiveView, Alignment, Fit } from '@rive-app/react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PULL_REFRESH_INDICATOR_HEIGHT,
  PULL_REFRESH_THRESHOLD,
  RIVE_ARTBOARD_NAME,
  RIVE_HEIGHT,
  RIVE_STATE_MACHINE_NAME,
  RIVE_WIDTH,
} from './pullToRefreshConstants';
import { PullToRefreshTestIds } from './PullToRefresh.testIds';

type RiveViewProps = React.ComponentProps<typeof RiveView>;

interface PullToRefreshIndicatorProps {
  riveFile: NonNullable<RiveViewProps['file']>;
  instance: NonNullable<RiveViewProps['dataBind']>;
  setHybridRef: RiveViewProps['hybridRef'];
  onError: RiveViewProps['onError'];
  pullDistance: SharedValue<number>;
  pullProgress: SharedValue<number>;
  refreshingShared: SharedValue<boolean>;
  indicatorOutroActive: SharedValue<boolean>;
  refreshCommitRequested: SharedValue<boolean>;
  indicatorTopInset: number;
  indicatorBottomInset: number;
}

const PullToRefreshIndicator = ({
  riveFile,
  instance,
  setHybridRef,
  onError,
  pullDistance,
  pullProgress,
  refreshingShared,
  indicatorOutroActive,
  refreshCommitRequested,
  indicatorTopInset,
  indicatorBottomInset,
}: PullToRefreshIndicatorProps): React.JSX.Element => {
  const tw = useTailwind();
  const indicatorSlotHeight =
    PULL_REFRESH_INDICATOR_HEIGHT + indicatorBottomInset;
  const riveStyle = tw.style('flex-grow-0 flex-shrink-0');
  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: indicatorOutroActive.value
      ? 1
      : refreshingShared.value || refreshCommitRequested.value
        ? 1
        : Math.min(Math.max(pullProgress.value / 20, 0), 1),
    transform: [
      {
        translateY:
          Math.min(Math.max(pullDistance.value, 0), PULL_REFRESH_THRESHOLD) -
          PULL_REFRESH_THRESHOLD,
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      testID={PullToRefreshTestIds.INDICATOR}
      style={[
        tw.style(
          'items-center self-center flex-grow-0 flex-shrink-0 justify-center overflow-hidden absolute z-0',
        ),
        {
          top: indicatorTopInset,
          height: indicatorSlotHeight,
          width: RIVE_WIDTH,
        },
      ]}
    >
      <Animated.View
        style={[
          tw.style(
            'items-center self-center flex-grow-0 flex-shrink-0 justify-center',
          ),
          {
            height: indicatorSlotHeight,
            width: RIVE_WIDTH,
          },
          indicatorAnimatedStyle,
        ]}
      >
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={RIVE_ARTBOARD_NAME}
          stateMachineName={RIVE_STATE_MACHINE_NAME}
          dataBind={instance}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={[
            riveStyle,
            {
              height: RIVE_HEIGHT,
              width: RIVE_WIDTH,
            },
          ]}
          onError={onError}
          testID={PullToRefreshTestIds.RIVE}
        />
      </Animated.View>
    </Animated.View>
  );
};

export default PullToRefreshIndicator;
