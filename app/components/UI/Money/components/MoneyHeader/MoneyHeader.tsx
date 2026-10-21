import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderRoot,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

const styles = StyleSheet.create({
  protectionHighlight: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  onRefreshPress?: () => void;
  showSecurityIndicator?: boolean;
  onSecurityPress?: () => void;
  showSetupNotification?: boolean;
  protectionHighlightTrigger?: number;
}

const MoneyHeader = ({
  onMenuPress,
  onRefreshPress,
  showSecurityIndicator = false,
  onSecurityPress,
  showSetupNotification = false,
  protectionHighlightTrigger = 0,
}: MoneyHeaderProps) => {
  const { colors } = useTheme();
  const titleStyle = { color: colors.text.default };
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    if (protectionHighlightTrigger <= 0) {
      pulseProgress.value = 0;
      return;
    }

    pulseProgress.value = 0;
    pulseProgress.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      }),
      2,
      false,
    );

    return () => cancelAnimation(pulseProgress);
  }, [protectionHighlightTrigger, pulseProgress]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pulseProgress.value, [0, 0.35, 1], [1, 1.18, 1]),
      },
    ],
  }));
  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseProgress.value, [0, 0.2, 1], [0, 0.35, 0]),
    transform: [
      {
        scale: interpolate(pulseProgress.value, [0, 1], [0.65, 1.15]),
      },
    ],
  }));

  return (
    <HeaderRoot
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="pl-4 pr-3"
      endAccessory={
        <Box twClassName="flex-row items-center gap-1">
          {onRefreshPress ? (
            <ButtonIcon
              iconName={IconName.Refresh}
              size={ButtonIconSize.Sm}
              onPress={onRefreshPress}
              accessibilityLabel={strings('money.more_sheet.refresh_prototype')}
              testID={MoneyHeaderTestIds.REFRESH_BUTTON}
            />
          ) : null}
          <Box twClassName="relative">
            <ButtonIcon
              iconName={IconName.MoreVertical}
              size={ButtonIconSize.Md}
              onPress={onMenuPress}
              accessibilityLabel="Menu"
              testID={MoneyHeaderTestIds.MENU_BUTTON}
            />
            {showSetupNotification && (
              <Box
                pointerEvents="none"
                twClassName="absolute right-1 top-1 size-1.5 rounded-full bg-error-default"
                testID={MoneyHeaderTestIds.MENU_NOTIFICATION_DOT}
              />
            )}
          </Box>
        </Box>
      }
      title={strings('money.title')}
      titleProps={{
        style: titleStyle,
        testID: MoneyHeaderTestIds.TITLE,
      }}
      titleAccessory={
        showSecurityIndicator ? (
          <Pressable
            onPress={onSecurityPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings('money.security.info_title')}
            testID={MoneyHeaderTestIds.SECURITY_BUTTON}
          >
            <Box twClassName="relative size-6 items-center justify-center">
              {protectionHighlightTrigger > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  testID={MoneyHeaderTestIds.SECURITY_HIGHLIGHT}
                  style={[
                    styles.protectionHighlight,
                    {
                      backgroundColor: colors.success.default,
                    },
                    ringAnimatedStyle,
                  ]}
                />
              ) : null}
              <Animated.View style={iconAnimatedStyle}>
                <Icon
                  name={IconName.SecurityTick}
                  size={IconSize.Md}
                  color={IconColor.SuccessDefault}
                />
              </Animated.View>
            </Box>
          </Pressable>
        ) : undefined
      }
    />
  );
};

export default MoneyHeader;
