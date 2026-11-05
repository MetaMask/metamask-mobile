import {
  AvatarTokenSize,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import PositionTokenAvatar from '../../../../../UI/SocialFeed/components/PositionTokenAvatar';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import type { SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenCloseTestId,
  getSocialV1HotTokenSelectedChipTestId,
} from './HotTokensCarousel.testIds';
import {
  CLOSE_SLOT,
  CLOSE_SLOT_WIDTH,
  DOCK_EXIT,
  DOCK_LEFT,
  FLY_SPRING,
  REASSEMBLE,
  SELECTED_FILL,
} from './hotTokenRailMotion';

const styles = StyleSheet.create({
  chip: {
    transformOrigin: 'left',
  },
  closeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

const noop = () => undefined;

const CloseSlot: React.FC<{
  progress: SharedValue<number>;
  color: IconColor;
  testID?: string;
}> = ({ progress, color, testID }) => {
  const slotStyle = useAnimatedStyle(() => ({
    width: progress.value * CLOSE_SLOT_WIDTH,
  }));
  return (
    <Animated.View style={[styles.closeSlot, slotStyle]}>
      <Box twClassName="ml-1">
        <Icon
          name={IconName.Close}
          size={IconSize.Sm}
          color={color}
          testID={testID}
        />
      </Box>
    </Animated.View>
  );
};

export interface SelectedHotTokenChipProps {
  token: SocialV1HotToken;
  /** Identifies this docking, so a late exit cannot clear a newer chip. */
  dockKey: number;
  /**
   * Viewport x of the pill the chip flies out of. Null when the selection did
   * not come from a visible pill, so the chip rises into the dock instead.
   */
  originLeft: number | null;
  /** False when the rail mounts already filtered: the chip starts docked. */
  animatesIn: boolean;
  /** True once the filter clears; the chip plays its exit, then reports it. */
  isExiting: boolean;
  onPress: (token: SocialV1HotToken) => void;
  onExited: (dockKey: number) => void;
}

/**
 * The chip the feed is filtered on, docked at the rail's left edge. It flies
 * out of the pressed pill on a spring while taking the selected fill and
 * sliding its close icon open. Pressing it clears the filter.
 *
 * The fill change is a cross-fade: an unselected copy sits over the real chip
 * and fades out. Both copies share the close slot, so they keep one width.
 */
const SelectedHotTokenChip: React.FC<SelectedHotTokenChipProps> = ({
  token,
  dockKey,
  originLeft,
  animatesIn,
  isExiting,
  onPress,
  onExited,
}) => {
  const fliesIn = animatesIn && originLeft !== null;
  const risesIn = animatesIn && originLeft === null;
  const flightX = useSharedValue(fliesIn ? (originLeft ?? 0) - DOCK_LEFT : 0);
  const enter = useSharedValue(risesIn ? 0 : 1);
  const fill = useSharedValue(animatesIn ? 0 : 1);
  const closeSlot = useSharedValue(animatesIn ? 0 : 1);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (!animatesIn) {
      return;
    }
    fill.value = withTiming(1, SELECTED_FILL);
    closeSlot.value = withTiming(1, CLOSE_SLOT);
    if (fliesIn) {
      flightX.value = withSpring(0, FLY_SPRING);
    } else {
      enter.value = withTiming(1, {
        duration: REASSEMBLE.duration,
        easing: REASSEMBLE.easing,
      });
    }
  }, [animatesIn, closeSlot, enter, fill, flightX, fliesIn]);

  useEffect(() => {
    if (!isExiting) {
      return;
    }
    const config = { duration: DOCK_EXIT.duration, easing: DOCK_EXIT.easing };
    closeSlot.value = withTiming(0, config);
    exit.value = withTiming(1, config, (finished) => {
      'worklet';
      if (finished) {
        scheduleOnRN(onExited, dockKey);
      }
    });
  }, [closeSlot, dockKey, exit, isExiting, onExited]);

  const chipStyle = useAnimatedStyle(() => {
    const enterScale = REASSEMBLE.scale + (1 - REASSEMBLE.scale) * enter.value;
    const exitScale = 1 - (1 - DOCK_EXIT.scale) * exit.value;
    return {
      opacity: enter.value * (1 - exit.value),
      transform: [
        { translateX: flightX.value + DOCK_EXIT.shiftX * exit.value },
        { translateY: REASSEMBLE.shiftY * (1 - enter.value) },
        { scale: enterScale * exitScale },
      ],
    };
  });

  const unselectedCopyStyle = useAnimatedStyle(() => ({
    opacity: 1 - fill.value,
  }));

  const avatar = (
    <Box twClassName="mr-1">
      <PositionTokenAvatar position={token.avatar} size={AvatarTokenSize.Sm} />
    </Box>
  );

  return (
    <Animated.View
      style={[styles.chip, chipStyle]}
      pointerEvents={isExiting ? 'none' : 'auto'}
    >
      <ExplorePill
        testID={getSocialV1HotTokenSelectedChipTestId(token.id)}
        accessibilityState={{ selected: true }}
        twClassName="bg-icon-default border-transparent"
        leading={avatar}
        title={token.label}
        titleTextColor={TextColor.InfoInverse}
        onPress={() => onPress(token)}
        trailing={
          <CloseSlot
            progress={closeSlot}
            color={IconColor.IconInverse}
            testID={getSocialV1HotTokenCloseTestId(token.id)}
          />
        }
      />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, unselectedCopyStyle]}
      >
        <ExplorePill
          testID={`${getSocialV1HotTokenSelectedChipTestId(token.id)}-fill`}
          leading={avatar}
          title={token.label}
          onPress={noop}
          trailing={
            <CloseSlot progress={closeSlot} color={IconColor.IconDefault} />
          }
        />
      </Animated.View>
    </Animated.View>
  );
};

export default SelectedHotTokenChip;
