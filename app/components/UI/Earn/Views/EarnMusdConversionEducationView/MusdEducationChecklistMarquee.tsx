import React, { useCallback, useEffect } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
// component-library TagBase: DSRN Tag has no startAccessory + Rectangle shape support
import TagBase from '../../../../../component-library/base-components/TagBase';
import {
  TagShape,
  TagSeverity,
} from '../../../../../component-library/base-components/TagBase/TagBase.types';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import { strings } from '../../../../../../locales/i18n';
import { EARN_TEST_IDS } from '../../constants/testIds';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { useTheme } from '../../../../../util/theme';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../util/deviceCapability/types';

/** Slow ticker. One loop of the five tags takes several seconds. */
const PIXELS_PER_SECOND = 36;

const CHECKLIST_KEYS = [
  'earn.musd_conversion.education.checklist.dollar_backed',
  'earn.musd_conversion.education.checklist.no_lockups',
  'earn.musd_conversion.education.checklist.daily_bonus',
  'earn.musd_conversion.education.checklist.metamask_stablecoins',
  'earn.musd_conversion.education.checklist.no_metamask_fee',
] as const;

const FADE_WIDTH = 16;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fade: {
    width: FADE_WIDTH,
    height: '100%',
  },
});

const wrapOffset = (x: number, width: number): number => {
  'worklet';
  if (width <= 0) {
    return 0;
  }
  const wrapped = x % width;
  return wrapped < 0 ? wrapped + width : wrapped;
};

/**
 * The crawl is local animation. Network tier does not fetch or skip it.
 * Low-RAM hardware keeps the static wrap. Unknown hardware keeps the crawl.
 */
export function shouldScrollMusdEducationTags(
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
  prefersReducedMotion: boolean,
): boolean {
  const networkDoesNotGateScroll =
    networkTier === 'NONE' ||
    networkTier === 'SLOW_CELLULAR' ||
    networkTier === 'FAST_CELLULAR' ||
    networkTier === 'WIFI' ||
    networkTier === null;

  return (
    networkDoesNotGateScroll && !prefersReducedMotion && hardwareTier !== 'LOW'
  );
}

const ChecklistTags = ({
  idSuffix = '',
  onLayout,
  hideFromAccessibility = false,
  wrap = false,
}: {
  idSuffix?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  hideFromAccessibility?: boolean;
  wrap?: boolean;
}) => {
  const { colors } = useTheme();
  const tagStyle = StyleSheet.create({
    base: {
      backgroundColor: colors.background.section,
      borderRadius: 6,
    },
  });

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={wrap ? BoxJustifyContent.Center : BoxJustifyContent.Start}
      testID={
        onLayout
          ? EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.CHECKLIST
          : undefined
      }
      twClassName={wrap ? 'mt-4 w-full flex-wrap gap-1' : 'shrink-0 gap-1 pr-1'}
      onLayout={onLayout}
      accessibilityElementsHidden={hideFromAccessibility}
      importantForAccessibility={
        hideFromAccessibility ? 'no-hide-descendants' : 'auto'
      }
    >
      {CHECKLIST_KEYS.map((key) => (
        <Box key={`${key}${idSuffix}`} twClassName="shrink-0">
          <TagBase
            shape={TagShape.Rectangle}
            severity={TagSeverity.Neutral}
            gap={4}
            style={tagStyle.base}
            startAccessory={
              <Icon
                name={IconName.CheckBold}
                size={IconSize.Sm}
                color={IconColor.SuccessDefault}
              />
            }
            textProps={{
              variant: ComponentTextVariant.BodySMMedium,
              numberOfLines: 1,
            }}
          >
            {strings(key)}
          </TagBase>
        </Box>
      ))}
    </Box>
  );
};

const MusdEducationChecklistMarquee = () => {
  const tw = useTailwind();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const prefersReducedMotion = useReducedMotion() === true;
  const shouldScroll = shouldScrollMusdEducationTags(
    hardwareTier,
    networkTier,
    prefersReducedMotion,
  );

  const offset = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const scrolling = useSharedValue(false);

  const tick = useCallback(
    (frame: { timeSincePreviousFrame: number | null }) => {
      'worklet';
      const width = trackWidth.value;
      if (!scrolling.value || width <= 0) {
        return;
      }
      const dtMs = frame.timeSincePreviousFrame ?? 0;
      if (dtMs <= 0) {
        return;
      }
      offset.value = wrapOffset(
        offset.value + (PIXELS_PER_SECOND * dtMs) / 1000,
        width,
      );
    },
    [offset, scrolling, trackWidth],
  );

  const frameCallback = useFrameCallback(tick, false);

  useEffect(() => {
    scrolling.value = shouldScroll;
    frameCallback.setActive(shouldScroll);
    if (!shouldScroll) {
      offset.value = 0;
    }
    return () => {
      frameCallback.setActive(false);
    };
  }, [frameCallback, offset, scrolling, shouldScroll]);

  const handleTrackLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));

  if (!shouldScroll) {
    return <ChecklistTags wrap />;
  }

  return (
    <MaskedView
      pointerEvents="none"
      style={tw.style('mt-4 w-full overflow-hidden')}
      maskElement={
        <Box flexDirection={BoxFlexDirection.Row} twClassName="h-full flex-1">
          <LinearGradient
            colors={['transparent', 'black']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fade}
          />
          <Box twClassName="h-full flex-1 bg-black" />
          <LinearGradient
            colors={['black', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fade}
          />
        </Box>
      }
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <ChecklistTags onLayout={handleTrackLayout} />
        <ChecklistTags idSuffix="-loop" hideFromAccessibility />
      </Animated.View>
    </MaskedView>
  );
};

export default MusdEducationChecklistMarquee;
