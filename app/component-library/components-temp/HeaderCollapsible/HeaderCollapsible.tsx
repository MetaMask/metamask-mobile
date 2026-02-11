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
import { HeaderCollapsibleProps } from './HeaderCollapsible.types';

const DEFAULT_EXPANDED_HEIGHT = 140;
const DEFAULT_COLLAPSED_HEIGHT = 56;

/**
 * HeaderCollapsible is a collapsing header component that transitions
 * between an expanded state (with custom content) and a compact sticky state (with HeaderBase)
 * based on scroll position.
 *
 * Uses Reanimated for performant scroll-linked animations.
 *
 * @example
 * ```tsx
 * return (
 *   <View style={{ flex: 1 }}>
 *     <HeaderCollapsible
 *       title="Send"
 *       onBack={handleBack}
 *       expandedContent={
 *         <TitleStandard
 *           topLabel="Send"
 *           title="$4.42"
 *         />
 *       }
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
const HeaderCollapsible: React.FC<HeaderCollapsibleProps> = ({
  title,
  titleProps,
  subtitle,
  subtitleProps,
  children,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  expandedContent,
  scrollTriggerPosition,
  scrollY,
  startButtonIconProps,
  endButtonIconProps,
  twClassName = '',
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

  const [measuredCollapsedHeight, setMeasuredCollapsedHeight] = useState(
    DEFAULT_COLLAPSED_HEIGHT,
  );
  const animatedCollapsedHeight = useSharedValue(DEFAULT_COLLAPSED_HEIGHT);

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

  const handleHeaderBaseLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      if (height > 0 && height !== measuredCollapsedHeight) {
        setMeasuredCollapsedHeight(height);
        animatedCollapsedHeight.value = height;
      }
    },
    [measuredCollapsedHeight, animatedCollapsedHeight],
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
      [animatedMeasuredHeight.value, animatedCollapsedHeight.value],
      Extrapolation.CLAMP,
    );

    return {
      height,
    };
  });

  // Derived value: triggers timed animation when large content is fully hidden
  const compactTitleProgress = useDerivedValue(() => {
    const triggerPosition =
      effectiveScrollTriggerPosition - animatedCollapsedHeight.value;
    const isFullyHidden = scrollY.value >= triggerPosition;

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

  // Animated style for the expanded content (moves up behind header, synced 1:1 with scroll)
  const expandedContentAnimatedStyle = useAnimatedStyle(() => {
    // Move up by full header height so expanded content clears the header (no peaking).
    // Clamp between 0 and -measuredHeight so content stays fully above y=0 when collapsed.
    const translateY = Math.min(
      Math.max(-scrollY.value, -animatedMeasuredHeight.value),
      0,
    );

    return {
      transform: [{ translateY }],
    };
  });

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
            twClassName={`-mt-0.5 ${subtitleProps?.twClassName}`.trim()}
          >
            {subtitle}
          </Text>
        )}
      </Box>
    );
  };

  const containerStyle = useMemo(
    () => [
      tw.style('absolute left-0 right-0 z-10 overflow-hidden'),
      { top: isInsideSafeAreaView ? insets.top : 0 },
      headerAnimatedStyle,
    ],
    [tw, isInsideSafeAreaView, insets.top, headerAnimatedStyle],
  );

  return (
    <Animated.View style={containerStyle} testID={testID}>
      {/* Header content - measured for dynamic height */}
      <View onLayout={handleLayout}>
        <View onLayout={handleHeaderBaseLayout}>
          <HeaderBase
            startButtonIconProps={resolvedStartButtonIconProps}
            endButtonIconProps={resolvedEndButtonIconProps}
            {...headerBaseProps}
            twClassName={`${twClassName} bg-default px-2`.trim()}
          >
            {/* Compact title - fades in when collapsed */}
            <Animated.View style={compactTitleAnimatedStyle}>
              {renderCompactContent()}
            </Animated.View>
          </HeaderBase>
        </View>

        {/* Expanded content - clips as it moves up behind header */}
        <Box twClassName="overflow-hidden">
          <Animated.View style={expandedContentAnimatedStyle}>
            {expandedContent}
          </Animated.View>
        </Box>
      </View>
    </Animated.View>
  );
};

export default HeaderCollapsible;
