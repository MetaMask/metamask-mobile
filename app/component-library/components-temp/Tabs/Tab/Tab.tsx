// Third party dependencies.
import React, { useContext, useRef, useCallback } from 'react';
import { Animated, Pressable, View } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, { IconSize, IconColor } from '../../../components/Icons/Icon';

// Internal dependencies.
import { TabProps } from './Tab.types';
import { TabIconAnimationContext } from './TabIconAnimationContext';

const ICON_SIZE_LG = 24;
const ICON_MARGIN_BOTTOM = 4;

const Tab: React.FC<TabProps> = ({
  label,
  iconName,
  isActive,
  isDisabled = false,
  onPress,
  testID,
  onLayout,
  fillWidth = false,
  ...pressableProps
}) => {
  const tw = useTailwind();
  const viewRef = useRef<View>(null);
  const { iconCollapseAnim } = useContext(TabIconAnimationContext);

  // translateY slides the icon upward out of the clipping boundary (overflow:hidden
  // on the outer View) without changing layout — keeps tab bar height fixed so
  // there is no layout cascade. Both transform and opacity run on the native thread.
  const iconAnimatedStyle = iconCollapseAnim
    ? {
        opacity: iconCollapseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
        transform: [
          {
            translateY: iconCollapseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -(ICON_SIZE_LG + ICON_MARGIN_BOTTOM)],
            }),
          },
        ],
      }
    : undefined;

  const handleOnLayout = useCallback(
    (layoutEvent: Parameters<NonNullable<typeof onLayout>>[0]) => {
      if (onLayout) {
        onLayout(layoutEvent);
      }
    },
    [onLayout],
  );

  return (
    <View
      ref={viewRef}
      onLayout={handleOnLayout}
      style={[
        fillWidth
          ? tw.style('flex-1')
          : tw.style('flex-shrink-0 overflow-hidden'),
      ]}
    >
      <Pressable
        style={tw.style(
          iconName
            ? 'px-0 pt-1 pb-2 flex-col items-center justify-center relative'
            : 'px-0 py-1 flex-row items-center justify-center relative',
          isDisabled && 'opacity-50',
        )}
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        testID={testID}
        {...pressableProps}
      >
        {iconName ? (
          // Icon mode: icon animates away on scroll, label stays visible
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
          >
            <Animated.View
              style={[
                { height: ICON_SIZE_LG, marginBottom: ICON_MARGIN_BOTTOM },
                iconAnimatedStyle,
              ]}
            >
              <Icon
                name={iconName}
                size={IconSize.Lg}
                color={
                  isDisabled
                    ? IconColor.Muted
                    : isActive
                      ? IconColor.Default
                      : IconColor.Alternative
                }
              />
            </Animated.View>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={
                isActive && !isDisabled ? FontWeight.Bold : FontWeight.Regular
              }
              twClassName={
                isDisabled
                  ? 'text-muted'
                  : isActive
                    ? 'text-default'
                    : 'text-alternative'
              }
              numberOfLines={1}
            >
              {label}
            </Text>
          </Box>
        ) : (
          // No icon: use hidden/visible text trick to prevent layout shift on bold toggle
          <>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
              style={tw.style('opacity-0')}
            >
              {label}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={
                isActive && !isDisabled ? FontWeight.Bold : FontWeight.Regular
              }
              twClassName={
                isDisabled
                  ? 'text-muted'
                  : isActive
                    ? 'text-default'
                    : 'text-alternative'
              }
              numberOfLines={1}
              style={tw.style(
                'absolute inset-0 flex items-center justify-center',
              )}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

export default Tab;
