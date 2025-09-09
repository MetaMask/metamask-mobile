import React, { useCallback, useState } from 'react';
import { LayoutRectangle, Pressable, PressableProps } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import Icon, { IconColor, IconName, IconSize } from '../../Icons/Icon';
import { useTheme } from '../../../../util/theme';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Text, { TextColor, TextVariant } from '../../Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../components/hooks/useMetrics';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { lightTheme } from '@metamask/design-tokens';

const TRADE_BUTTON_SIZE = 56;

interface TradeTabBarItemProps extends PressableProps {
  label?: string;
}

function TradeTabBarItem({ label, ...props }: TradeTabBarItemProps) {
  const [isActive, setIsActive] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind(); // Gets theme from ThemeProvider context
  const navigation = useNavigation();
  const [buttonLayout, setButtonLayout] = useState<LayoutRectangle>();

  const { trackEvent, createEventBuilder } = useMetrics();

  const chainId = useSelector(selectChainId);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: isActive
      ? colors.icon.default
      : lightTheme.colors.primary.default,
    transform: [
      {
        rotateZ: withTiming(isActive ? '45deg' : '0deg', {
          duration: 150,
        }),
      },
    ],
  }));

  const handleOnPress = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsActive((active) => !active);

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
      params: {
        onDismiss: () => setIsActive(false),
        buttonLayout,
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ACTIONS_BUTTON_CLICKED)
        .addProperties({
          text: '',
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [buttonLayout, chainId, createEventBuilder, navigation, trackEvent]);

  const iconColor =
    themeAppearance === 'light'
      ? IconColor.Inverse
      : isActive
      ? IconColor.Inverse
      : IconColor.Default;
  return (
    <Pressable
      style={tw.style('items-center justify-center bg-transparent px-2 py-1')}
      accessibilityLabel={label}
      accessible
      accessibilityRole="button"
      {...props}
      onPress={handleOnPress}
    >
      <Animated.View
        style={[
          tw.style('items-center justify-center', {
            width: TRADE_BUTTON_SIZE,
            height: TRADE_BUTTON_SIZE,
            marginTop: -TRADE_BUTTON_SIZE / 2,
            borderRadius: TRADE_BUTTON_SIZE / 2,
          }),
          animatedStyle,
        ]}
        onLayout={(event) => {
          event.target.measureInWindow((x, y, width, height) => {
            setButtonLayout({ x, y, width, height });
          });
        }}
      >
        <Icon name={IconName.Add} size={IconSize.Xl} color={iconColor} />
      </Animated.View>
      {label && (
        <Text
          variant={TextVariant.BodyXSMedium}
          color={isActive ? TextColor.Default : TextColor.Alternative}
          style={tw.style('mt-1')}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default TradeTabBarItem;
