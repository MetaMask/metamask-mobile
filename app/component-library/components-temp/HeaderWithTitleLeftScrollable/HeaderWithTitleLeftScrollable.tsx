// Third party dependencies.
import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import HeaderBase from '../HeaderBase';
import TitleLeft from '../TitleLeft';
import { HeaderWithTitleLeftScrollableProps } from './HeaderWithTitleLeftScrollable.types';
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_COLLAPSED_HEIGHT,
  HeaderWithTitleLeftScrollableTestIds,
} from './HeaderWithTitleLeftScrollable.constants';

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
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
  testID = HeaderWithTitleLeftScrollableTestIds.CONTAINER,
  ...headerBaseProps
}) => {
  const tw = useTailwind();

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
        testID: HeaderWithTitleLeftScrollableTestIds.BACK_BUTTON,
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

  // Animated style for the compact title opacity (fades in as header collapses)
  const compactTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [effectiveScrollTriggerPosition * 0.5, effectiveScrollTriggerPosition],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
    };
  });

  // Animated style for the large header content (fades out as header collapses)
  const largeContentAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, effectiveScrollTriggerPosition * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      scrollY.value,
      [0, effectiveScrollTriggerPosition],
      [0, -20],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Animated style for background opacity (becomes more opaque as header collapses)
  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, effectiveScrollTriggerPosition],
      [0.95, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
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
      {/* Background layer */}
      <Animated.View
        style={[
          tw.style('absolute inset-0 bg-default'),
          backgroundAnimatedStyle,
        ]}
      />

      {/* Header content - measured for dynamic height */}
      <View onLayout={handleLayout}>
        {/* HeaderBase with compact title */}
        <HeaderBase
          testID={HeaderWithTitleLeftScrollableTestIds.HEADER_BASE}
          startButtonIconProps={resolvedStartButtonIconProps}
          twClassName={twClassName}
          {...headerBaseProps}
        >
          {/* Compact title - fades in when collapsed */}
          <Animated.View
            style={compactTitleAnimatedStyle}
            testID={HeaderWithTitleLeftScrollableTestIds.COMPACT_TITLE}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
            >
              {title}
            </Text>
          </Animated.View>
        </HeaderBase>

        {/* Large header content - fades out when collapsed */}
        <Animated.View
          style={largeContentAnimatedStyle}
          testID={HeaderWithTitleLeftScrollableTestIds.LARGE_CONTENT}
        >
          {renderLargeContent()}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default HeaderWithTitleLeftScrollable;
