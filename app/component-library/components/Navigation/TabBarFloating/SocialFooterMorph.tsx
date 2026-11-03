import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { IconName } from '@metamask/design-system-react-native';

import TabBarFloatingItem from './TabBarFloatingItem';
import type { SocialFooterDurations } from './socialFooterMotion';

export type SocialFooterTab = 'trending' | 'following' | 'leaderboard' | 'live';

const SOCIAL_TABS: {
  id: SocialFooterTab;
  label: string;
  iconName: IconName;
}[] = [
  { id: 'trending', label: 'Trending', iconName: IconName.TrendUp },
  { id: 'following', label: 'Following', iconName: IconName.People },
  { id: 'leaderboard', label: 'Leaderboard', iconName: IconName.Star },
  { id: 'live', label: 'Live', iconName: IconName.Activity },
];

const SLOT_COUNT = 4;

export interface SocialFooterHomeTab {
  key: string;
  node: React.ReactNode;
}

export interface SocialFooterMorphProps {
  homeTabs: SocialFooterHomeTab[];
  active: boolean;
  activeTab: SocialFooterTab;
  durations: SocialFooterDurations;
  onTabPress: (tab: SocialFooterTab) => void;
}

const easeIn = Easing.in(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  slot: {
    flex: 1,
  },
  front: {
    zIndex: 2,
  },
  socialRow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
});

const useHomeSlotStyle = (
  index: number,
  progress: SharedValue<number>,
  width: SharedValue<number>,
) =>
  useAnimatedStyle(() => {
    const slot = width.value > 0 ? width.value / SLOT_COUNT : 0;
    const collapse = interpolate(
      progress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const takeover = interpolate(
      progress.value,
      [1, 2],
      [0, 1],
      Extrapolation.CLAMP,
    );

    if (index >= 2) {
      const slotsTowardHome = index === 2 ? 1 : 3;
      return {
        opacity: interpolate(collapse, [0, 0.7, 1], [1, 1, 0]),
        transform: [
          { translateX: -slotsTowardHome * slot * collapse },
          { scale: interpolate(collapse, [0, 1], [1, 0.12]) },
        ],
      };
    }

    const towardCenter = (1.5 - index) * slot;
    return {
      opacity: interpolate(takeover, [0, 0.45], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: towardCenter * takeover },
        { scale: interpolate(takeover, [0, 1], [1, 0.2]) },
      ],
    };
  });

const useSocialSlotStyle = (
  index: number,
  progress: SharedValue<number>,
  width: SharedValue<number>,
) =>
  useAnimatedStyle(() => {
    const slot = width.value > 0 ? width.value / SLOT_COUNT : 0;
    const expand = interpolate(
      progress.value,
      [1, 2],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const fromCenter = (1.5 - index) * slot;
    return {
      opacity: interpolate(expand, [0, 0.2, 1], [0, 1, 1]),
      transform: [
        { translateX: fromCenter * (1 - expand) },
        { scale: interpolate(expand, [0, 1], [0.2, 1]) },
      ],
    };
  });

/**
 * Replaces the home pill items when Social is opened.
 * Money and Social collapse into Explore and Home, then Trending, Following,
 * Leaderboard, and Live grow out of the center.
 */
const SocialFooterMorph = ({
  homeTabs,
  active,
  activeTab,
  durations,
  onTabPress,
}: SocialFooterMorphProps) => {
  const progress = useSharedValue(active ? 2 : 0);
  const width = useSharedValue(0);
  const wasActive = useRef(active);
  const [socialInteractive, setSocialInteractive] = useState(active);
  const homeStyle0 = useHomeSlotStyle(0, progress, width);
  const homeStyle1 = useHomeSlotStyle(1, progress, width);
  const homeStyle2 = useHomeSlotStyle(2, progress, width);
  const homeStyle3 = useHomeSlotStyle(3, progress, width);
  const socialStyle0 = useSocialSlotStyle(0, progress, width);
  const socialStyle1 = useSocialSlotStyle(1, progress, width);
  const socialStyle2 = useSocialSlotStyle(2, progress, width);
  const socialStyle3 = useSocialSlotStyle(3, progress, width);
  const homeStyles = [homeStyle0, homeStyle1, homeStyle2, homeStyle3];
  const socialStyles = [socialStyle0, socialStyle1, socialStyle2, socialStyle3];

  const handleLayout = (event: LayoutChangeEvent) => {
    // Reanimated shared values are updated by assignment.
    // eslint-disable-next-line react-compiler/react-compiler
    width.value = event.nativeEvent.layout.width;
  };

  useEffect(() => {
    // Reanimated shared values are updated by assignment.
    /* eslint-disable react-compiler/react-compiler */
    if (wasActive.current === active) {
      return;
    }
    wasActive.current = active;

    const snap = durations.collapse === 0 && durations.expand === 0;
    if (snap) {
      progress.value = active ? 2 : 0;
      setSocialInteractive(active);
      return;
    }

    if (active) {
      setSocialInteractive(false);
      progress.value = withSequence(
        withTiming(1, { duration: durations.collapse, easing: easeIn }),
        withDelay(
          durations.hold,
          withTiming(2, { duration: durations.expand, easing: easeOut }),
        ),
      );
      return;
    }

    setSocialInteractive(false);
    progress.value = withSequence(
      withTiming(1, { duration: durations.expand, easing: easeIn }),
      withDelay(
        durations.hold,
        withTiming(0, { duration: durations.collapse, easing: easeOut }),
      ),
    );
    /* eslint-enable react-compiler/react-compiler */
  }, [active, durations, progress]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    if (durations.collapse === 0) {
      setSocialInteractive(true);
      return undefined;
    }
    const timeoutId = setTimeout(
      () => setSocialInteractive(true),
      durations.collapse + durations.hold,
    );
    return () => clearTimeout(timeoutId);
  }, [active, durations.collapse, durations.hold]);

  return (
    <View style={styles.row} onLayout={handleLayout}>
      <View
        style={styles.row}
        pointerEvents={active ? 'none' : 'auto'}
        accessibilityElementsHidden={active}
      >
        {homeTabs.slice(0, SLOT_COUNT).map((tab, index) => (
          <Animated.View
            key={tab.key}
            style={[styles.slot, homeStyles[index], index >= 2 && styles.front]}
          >
            {tab.node}
          </Animated.View>
        ))}
      </View>
      <View
        style={styles.socialRow}
        pointerEvents={socialInteractive ? 'auto' : 'none'}
        accessibilityElementsHidden={!socialInteractive}
      >
        {SOCIAL_TABS.map((tab, index) => (
          <Animated.View
            key={tab.id}
            style={[styles.slot, socialStyles[index]]}
          >
            <TabBarFloatingItem
              testID={`tab-bar-social-${tab.id}`}
              iconName={tab.iconName}
              label={tab.label}
              isActive={activeTab === tab.id}
              onPress={() => onTabPress(tab.id)}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

export default SocialFooterMorph;
