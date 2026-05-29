// Third party dependencies.
import React, { useContext, useRef, useCallback } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

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
import { TabsIconTabProps } from './TabsIconTab.types';
import { TabIconAnimationContext } from './TabsIconAnimationContext';

const ICON_SIZE_LG = 24;
const ICON_MARGIN_BOTTOM = 4;

const TabsIconTab: React.FC<TabsIconTabProps> = ({
  label,
  iconName,
  isActive,
  isDisabled = false,
  onPress,
  testID,
  onLayout,
  shouldFillWidth = false,
  iconProps,
  style: externalStyle,
  ...pressableProps
}) => {
  const tw = useTailwind();
  const viewRef = useRef<View>(null);
  const { iconCollapseProgress } = useContext(TabIconAnimationContext);

  // Drive icon's layout box (height + marginBottom) and opacity from a Reanimated
  // SharedValue so the entire transition runs on the UI thread — no per-frame JS work,
  // no layout reflow on the JS thread.
  const iconAnimatedStyle = useAnimatedStyle(() => {
    if (!iconCollapseProgress) {
      return {
        height: ICON_SIZE_LG,
        marginBottom: ICON_MARGIN_BOTTOM,
        opacity: 1,
      };
    }
    const p = iconCollapseProgress.value;
    return {
      height: interpolate(p, [0, 1], [ICON_SIZE_LG, 0], Extrapolation.CLAMP),
      marginBottom: interpolate(
        p,
        [0, 1],
        [ICON_MARGIN_BOTTOM, 0],
        Extrapolation.CLAMP,
      ),
      opacity: interpolate(p, [0, 1], [1, 0], Extrapolation.CLAMP),
    };
  });

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
      style={[shouldFillWidth ? tw.style('flex-1') : tw.style('flex-shrink-0')]}
    >
      <Pressable
        style={[
          tw.style(
            'px-0 pt-1 pb-2 flex-col items-center justify-center relative',
            isDisabled && 'opacity-50',
          ),
          externalStyle as StyleProp<ViewStyle>,
        ]}
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        testID={testID}
        {...pressableProps}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Reanimated.View style={iconAnimatedStyle}>
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
              {...iconProps}
            />
          </Reanimated.View>
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
      </Pressable>
    </View>
  );
};

export default TabsIconTab;
