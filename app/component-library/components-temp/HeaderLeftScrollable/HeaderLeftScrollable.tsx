// Third party dependencies.
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

// External dependencies.
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import { HeaderLeftScrollableProps } from './HeaderLeftScrollable.types';
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_COLLAPSED_HEIGHT,
  TOOLBAR_HEIGHT,
  HeaderLeftScrollableTestIds,
} from './HeaderLeftScrollable.constants';

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
 * HeaderLeftScrollable is a collapsing header component that transitions between
 * a large expanded state and a compact sticky state based on scroll position.
 *
 * Uses Reanimated for performant scroll-linked animations.
 * The collapseThreshold defaults to expandedHeight if not provided.
 *
 * @example
 * ```tsx
 * const { onScroll, scrollY, expandedHeight } = useHeaderLeftScrollable();
 *
 * return (
 *   <View style={{ flex: 1 }}>
 *     <HeaderLeftScrollable
 *       title="Notes"
 *       leftIcon={{ iconName: IconName.ArrowLeft, onPress: handleBack }}
 *       rightIcon={{ iconName: IconName.Close, onPress: handleClose }}
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
const HeaderLeftScrollable: React.FC<HeaderLeftScrollableProps> = ({
  title,
  leftIcon,
  rightIcon,
  largeHeaderContent,
  collapseThreshold = DEFAULT_EXPANDED_HEIGHT,
  scrollY,
  testID = HeaderLeftScrollableTestIds.CONTAINER,
}) => {
  const tw = useTailwind();

  // Animated style for the header container height
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, collapseThreshold],
      [DEFAULT_EXPANDED_HEIGHT, DEFAULT_COLLAPSED_HEIGHT],
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
      [collapseThreshold * 0.5, collapseThreshold],
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
      [0, collapseThreshold * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      scrollY.value,
      [0, collapseThreshold],
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
      [0, collapseThreshold],
      [0.95, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
    };
  });

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

      {/* Header content */}
      <Box twClassName="flex-1">
        {/* Toolbar row with icon buttons and compact title */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4"
          style={{ height: TOOLBAR_HEIGHT }}
          testID={HeaderLeftScrollableTestIds.TOOLBAR}
        >
          {/* Left icon button */}
          <Box twClassName="w-10 items-start">
            {leftIcon && (
              <ButtonIcon
                iconName={leftIcon.iconName}
                size={ButtonIconSize.Md}
                onPress={leftIcon.onPress}
                testID={leftIcon.testID ?? HeaderLeftScrollableTestIds.LEFT_ICON}
              />
            )}
          </Box>

          {/* Compact title (center) - fades in when collapsed */}
          <Animated.View
            style={[tw.style('flex-1 items-center'), compactTitleAnimatedStyle]}
            testID={HeaderLeftScrollableTestIds.COMPACT_TITLE}
          >
            <Text variant={TextVariant.HeadingSm} numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>

          {/* Right icon button */}
          <Box twClassName="w-10 items-end">
            {rightIcon && (
              <ButtonIcon
                iconName={rightIcon.iconName}
                size={ButtonIconSize.Md}
                onPress={rightIcon.onPress}
                testID={rightIcon.testID ?? HeaderLeftScrollableTestIds.RIGHT_ICON}
              />
            )}
          </Box>
        </Box>

        {/* Large header content - fades out when collapsed */}
        <Animated.View
          style={[tw.style('px-4 flex-1'), largeContentAnimatedStyle]}
          testID={HeaderLeftScrollableTestIds.LARGE_CONTENT}
        >
          {largeHeaderContent ?? (
            <Text
              variant={TextVariant.HeadingLg}
              testID={HeaderLeftScrollableTestIds.LARGE_TITLE}
            >
              {title}
            </Text>
          )}
        </Animated.View>
      </Box>
    </Animated.View>
  );
};

export default HeaderLeftScrollable;

