// Third party dependencies.
import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// External dependencies.
import {
  Text,
  TextVariant,
  FontWeight,
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderBase from '../../components/HeaderBase';
import TitleLeft from '../TitleLeft';
import { HeaderWithTitleLeftScrollableProps } from './HeaderWithTitleLeftScrollable.types';
const DEFAULT_EXPANDED_HEIGHT = 140;
const DEFAULT_COLLAPSED_HEIGHT = 48;

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  overflowHidden: {
    overflow: 'hidden',
  },
});

/**
 * HeaderWithTitleLeftScrollable is a collapsing header component that transitions
 * between an expanded state (with TitleLeft) and a compact sticky state (with HeaderBase)
 * based on scroll position.
 *
 * Uses Reanimated for performant scroll-linked animations.
 *
 * @example
 * ```tsx
 * const { onScroll, scrollY, expandedHeight } = useHeaderWithTitleLeftScrollable();
 *
 * return (
 *   <View style={{ flex: 1 }}>
 *     <HeaderWithTitleLeftScrollable
 *       title="Send"
 *       onBack={handleBack}
 *       titleLeftProps={{
 *         topLabel: "Send",
 *         title: "$4.42",
 *         endAccessory: <NFTImage />
 *       }}
 *       scrollY={scrollY}
 *     />
 *     <ScrollView
 *       onScroll={onScroll}
 *       scrollEventThrottle={16}
 *       contentContainerStyle={{ paddingTop: expandedHeight }}
 *     >
 *       <Content />
 *     </ScrollView>
 *   </View>
 * );
 * ```
 */
const HeaderWithTitleLeftScrollable: React.FC<
  HeaderWithTitleLeftScrollableProps
> = ({
  title,
  onBack,
  backButtonProps,
  titleLeft,
  titleLeftProps,
  scrollTriggerPosition,
  scrollY,
  startButtonIconProps,
  twClassName,
  onExpandedHeightChange,
  testID,
  ...headerBaseProps
}) => {
  // Measure actual content height for dynamic sizing
  const [measuredHeight, setMeasuredHeight] = useState(DEFAULT_EXPANDED_HEIGHT);
  const animatedMeasuredHeight = useSharedValue(DEFAULT_EXPANDED_HEIGHT);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      if (height > 0 && height !== measuredHeight) {
        setMeasuredHeight(height);
        animatedMeasuredHeight.value = withTiming(height, { duration: 0 });
        onExpandedHeightChange?.(height);
      }
    },
    [measuredHeight, animatedMeasuredHeight, onExpandedHeightChange],
  );

  // Use scrollTriggerPosition if provided, otherwise use measured height
  const effectiveScrollTriggerPosition =
    scrollTriggerPosition ?? measuredHeight;

  // Build startButtonIconProps with back button if onBack or backButtonProps is provided
  const resolvedStartButtonIconProps = useMemo(() => {
    if (startButtonIconProps) {
      return startButtonIconProps;
    }

    if (onBack || backButtonProps) {
      const backProps: ButtonIconProps = {
        iconName: IconName.ArrowLeft,
        ...(backButtonProps || {}),
        onPress: backButtonProps?.onPress ?? onBack,
      };
      return backProps;
    }

    return undefined;
  }, [startButtonIconProps, onBack, backButtonProps]);

  // Animated style for the header container height (uses measured content height)
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, effectiveScrollTriggerPosition],
      [animatedMeasuredHeight.value, DEFAULT_COLLAPSED_HEIGHT],
      Extrapolation.CLAMP,
    );

    return {
      height,
    };
  });

  // Derived value: triggers timed animation when large content is fully hidden
  const compactTitleProgress = useDerivedValue(() => {
    const largeContentHeight =
      animatedMeasuredHeight.value - DEFAULT_COLLAPSED_HEIGHT;
    const isFullyHidden = scrollY.value >= largeContentHeight;

    // Animate to 1 when hidden, 0 when visible (with timing)
    return withTiming(isFullyHidden ? 1 : 0, { duration: 150 });
  });

  // Animated style for the compact title (timed fade up when large content is fully hidden)
  const compactTitleAnimatedStyle = useAnimatedStyle(() => {
    const progress = compactTitleProgress.value;

    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 8 }], // Fade up from 8px below
    };
  });

  // Animated style for the large header content (moves up behind header, synced 1:1 with scroll)
  const largeContentAnimatedStyle = useAnimatedStyle(() => {
    const largeContentHeight =
      animatedMeasuredHeight.value - DEFAULT_COLLAPSED_HEIGHT;
    // Move up 1:1 with scroll, clamped between 0 and -largeContentHeight
    // Math.min(..., 0) prevents moving down on overscroll
    // Math.max(..., -largeContentHeight) prevents moving up too far
    const translateY = Math.min(
      Math.max(-scrollY.value, -largeContentHeight),
      0,
    );

    return {
      transform: [{ translateY }],
    };
  });

  // Render large content section
  // Render large content: custom node > titleLeftProps > default title
  const renderLargeContent = () => {
    if (titleLeft) {
      return titleLeft;
    }
    // Spread titleLeftProps over default title (titleLeftProps.title overrides if provided)
    return <TitleLeft title={title} {...titleLeftProps} />;
  };

  return (
    <Animated.View
      style={[styles.absoluteContainer, headerAnimatedStyle]}
      testID={testID}
    >
      {/* Header content - measured for dynamic height */}
      <View onLayout={handleLayout}>
        {/* HeaderBase with compact title */}
        <HeaderBase
          startButtonIconProps={resolvedStartButtonIconProps}
          twClassName={
            twClassName ? `bg-default px-2 ${twClassName}` : 'bg-default px-2'
          }
          {...headerBaseProps}
        >
          {/* Compact title - fades in when collapsed */}
          <Animated.View style={compactTitleAnimatedStyle}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
            >
              {title}
            </Text>
          </Animated.View>
        </HeaderBase>

        {/* Large header content - clips as it moves up behind header */}
        <View style={styles.overflowHidden}>
          <Animated.View style={largeContentAnimatedStyle}>
            {renderLargeContent()}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
};

export default HeaderWithTitleLeftScrollable;
