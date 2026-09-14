import React, { useCallback, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  ButtonAnimated,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../TabBar/TabBar.constants';
import { TabBarIconKey } from '../TabBar/TabBar.types';

const ROTATION_DURATION = 150;

export interface TabBarFloatingTradeButtonProps {
  testID?: string;
}

/**
 * Trailing "+" that opens the trade tray from the floating bar. Fills the
 * circle surface it is rendered in and rotates into an X while the tray is
 * open, which the tray's overlay cut-out leaves visible.
 */
const TabBarFloatingTradeButton = ({
  testID,
}: TabBarFloatingTradeButtonProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = useSelector(selectChainId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  // The tray cuts its overlay hole around this, so it stays unset until layout.
  const [buttonLayout, setButtonLayout] = useState<LayoutRectangle>();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateZ: withTiming(isTrayOpen ? '45deg' : '0deg', {
          duration: ROTATION_DURATION,
        }),
      },
    ],
  }));

  const handlePress = useCallback(() => {
    playImpact(ImpactMoment.TabChange);
    setIsTrayOpen(true);

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
      params: {
        onDismiss: () => setIsTrayOpen(false),
        buttonLayout,
        hasBottomNotch: false,
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

  return (
    <ButtonAnimated
      onPress={handlePress}
      onLayout={(event) => {
        event.target.measureInWindow((x, y, width, height) => {
          setButtonLayout({ x, y, width, height });
        });
      }}
      // Only paints a fill while open, so the surface's blur shows through otherwise.
      style={tw.style(
        'h-full w-full items-center justify-center rounded-full',
        isTrayOpen ? 'bg-icon-default' : 'bg-transparent',
      )}
      testID={testID}
      accessibilityLabel={strings(
        LABEL_BY_TAB_BAR_ICON_KEY[TabBarIconKey.Trade],
      )}
      accessibilityRole="button"
      accessibilityState={{ expanded: isTrayOpen }}
      accessible
    >
      <Animated.View style={animatedStyle}>
        <Icon
          name={IconName.Add}
          size={IconSize.Lg}
          color={isTrayOpen ? IconColor.IconInverse : IconColor.IconDefault}
        />
      </Animated.View>
    </ButtonAnimated>
  );
};

export default TabBarFloatingTradeButton;
