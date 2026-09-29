import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ExploreSearchBar from '../../../TrendingView/components/ExploreSearchBar/ExploreSearchBar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import {
  HOME_SEARCH_TRANSITION_DURATION,
  type HomepageSearchReturnTransition as HomepageSearchReturnTransitionState,
} from '../../../../TrendingView/search/homepageSearchTransition';
import { strings } from '../../../../../../locales/i18n';

interface HomepageSearchReturnTransitionProps {
  transition: HomepageSearchReturnTransitionState;
  onComplete: () => void;
}

const noop = () => undefined;
const INTERACTIVE_ACCESSORY_WIDTH = 32;
const HOMEPAGE_SEARCH_ICON_WIDTH = 20;

const ReturnTransitionStartAccessory = ({
  progress,
}: {
  progress: SharedValue<number>;
}) => {
  const tw = useTailwind();
  const accessoryStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [HOMEPAGE_SEARCH_ICON_WIDTH, INTERACTIVE_ACCESSORY_WIDTH],
    ),
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.4, 1], [0.8, 1, 1]),
      },
    ],
  }));
  const searchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [1, 0, 0]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.4, 1], [1, 0.8, 0.8]),
      },
    ],
  }));

  return (
    <Animated.View
      style={[tw.style('h-8 items-center justify-center'), accessoryStyle]}
    >
      <Animated.View
        style={[
          tw.style('absolute inset-0 items-center justify-center'),
          arrowStyle,
        ]}
      >
        <Icon
          name={IconName.Arrow2Left}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Animated.View>
      <Animated.View
        style={[
          tw.style('absolute inset-0 items-center justify-center'),
          searchStyle,
        ]}
      >
        <Icon
          name={IconName.Search}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Animated.View>
    </Animated.View>
  );
};

const HomepageSearchReturnTransition = ({
  transition,
  onComplete,
}: HomepageSearchReturnTransitionProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const progress = useSharedValue(1);
  const { origin, showPastePill } = transition;

  const animatedStyle = useAnimatedStyle(
    () => ({
      height: origin.height,
      left: interpolate(progress.value, [0, 1], [origin.x, 16]),
      position: 'absolute',
      right: interpolate(
        progress.value,
        [0, 1],
        [screenWidth - origin.x - origin.width, 16],
      ),
      top: origin.y,
      zIndex: 10,
    }),
    [origin, screenWidth],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      progress.value = withTiming(
        0,
        {
          duration: HOME_SEARCH_TRANSITION_DURATION,
          easing: Easing.inOut(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(onComplete);
          }
        },
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [onComplete, progress]);

  return (
    <Animated.View pointerEvents="none" style={animatedStyle}>
      <ExploreSearchBar
        type="interactive"
        searchQuery=""
        onSearchChange={noop}
        onCancel={noop}
        startAccessory={<ReturnTransitionStartAccessory progress={progress} />}
        placeholder={strings('wallet.homepage_search_placeholder')}
        autoFocus={false}
        dismissVariant="back"
        showPastePill={showPastePill}
        onPastePress={noop}
        rowTwClassName="flex-1"
      />
    </Animated.View>
  );
};

export default HomepageSearchReturnTransition;
