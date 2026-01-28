// Third party dependencies.
import React, { useMemo, useState, useCallback } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
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
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal dependencies.
import HeaderBase from '../../components/HeaderBase';
import TitleLeft from '../TitleLeft';
import { HeaderWithTitleLeftScrollableProps } from './HeaderWithTitleLeftScrollable.types';

const DEFAULT_EXPANDED_HEIGHT = 140;
const DEFAULT_COLLAPSED_HEIGHT = 56;

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
  titleProps,
  subtitle,
  subtitleProps,
  children,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  titleLeft,
  titleLeftProps,
  scrollTriggerPosition,
  scrollY,
  startButtonIconProps,
  endButtonIconProps,
  twClassName,
  onExpandedHeightChange,
  testID,
  isInsideSafeAreaView = false,
  ...headerBaseProps
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Measure actual content height for dynamic sizing
  const [measuredHeight, setMeasuredHeight] = useState(DEFAULT_EXPANDED_HEIGHT);
  const animatedMeasuredHeight = useSharedValue(DEFAULT_EXPANDED_HEIGHT);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      if (height > 0 && height !== measuredHeight) {
        setMeasuredHeight(height);
        animatedMeasuredHeight.value = height;
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

  // Build endButtonIconProps with close button if onClose or closeButtonProps is provided
  const resolvedEndButtonIconProps = useMemo(() => {
    const props: ButtonIconProps[] = [];

    if (onClose || closeButtonProps) {
      const closeProps: ButtonIconProps = {
        iconName: IconName.Close,
        ...(closeButtonProps || {}),
        onPress: closeButtonProps?.onPress ?? onClose,
      };
      props.push(closeProps);
    }

    if (endButtonIconProps) {
      props.push(...endButtonIconProps);
    }

    return props.length > 0 ? props : undefined;
  }, [endButtonIconProps, onClose, closeButtonProps]);

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
    // Use effectiveScrollTriggerPosition to sync with header collapse animation
    const triggerPosition =
      effectiveScrollTriggerPosition - DEFAULT_COLLAPSED_HEIGHT;
    const isFullyHidden = scrollY.value >= triggerPosition;

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

  // Render compact title content
  // If children is provided, use it; otherwise render default title + subtitle
  const renderCompactContent = () => {
    if (children) {
      return children;
    }
    return (
      <Box alignItems={BoxAlignItems.Center}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
          {...titleProps}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            {...subtitleProps}
            twClassName={`-mt-0.5 ${subtitleProps?.twClassName ?? ''}`.trim()}
          >
            {subtitle}
          </Text>
        )}
      </Box>
    );
  };
  const containerStyle = useMemo(
    () => [
      tw.style('absolute left-0 right-0 z-10'),
      { top: isInsideSafeAreaView ? insets.top : 0 },
      headerAnimatedStyle,
    ],
    [tw, isInsideSafeAreaView, insets.top, headerAnimatedStyle],
  );

  return (
    <Animated.View style={containerStyle} testID={testID}>
      {/* Header content - measured for dynamic height */}
      <View onLayout={handleLayout}>
        {/* HeaderBase with compact title */}
        <HeaderBase
          startButtonIconProps={resolvedStartButtonIconProps}
          endButtonIconProps={resolvedEndButtonIconProps}
          twClassName={
            twClassName ? `${twClassName} bg-default px-2` : 'bg-default px-2'
          }
          {...headerBaseProps}
        >
          {/* Compact title - fades in when collapsed */}
          <Animated.View style={compactTitleAnimatedStyle}>
            {renderCompactContent()}
          </Animated.View>
        </HeaderBase>

        {/* Large header content - clips as it moves up behind header */}
        <Box twClassName="overflow-hidden">
          <Animated.View style={largeContentAnimatedStyle}>
            {renderLargeContent()}
          </Animated.View>
        </Box>
      </View>
    </Animated.View>
  );
};

export default HeaderWithTitleLeftScrollable;
