/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
// External dependencies.
import TabBarItem from '../TabBarItem';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getDecimalChainId } from '../../../../util/networks';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { strings } from '../../../../../locales/i18n';

// Internal dependencies.
import {
  ICON_BY_TAB_BAR_ICON_KEY,
  LABEL_BY_TAB_BAR_ICON_KEY,
} from './TabBar.constants';
import { selectChainId } from '../../../../selectors/networkController';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';

// Internal dependencies.
import type { CustomTabBarProps, TabBarRoute } from './TabBar.types';

const TabBar = ({ state, descriptors, navigation }: CustomTabBarProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const chainId = useSelector(selectChainId);
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);
  const tabBarRef = useRef(null);
  const tw = useTailwind();

  const renderTabBarItem = useCallback(
    (route: TabBarRoute, index: number) => {
      const { options } = descriptors[route.key];
      const tabBarIconKey = options.tabBarIconKey;
      //TODO: use another option on add it to the prop interface
      const callback = options.callback;
      const rootScreenName = options.rootScreenName;
      const key = `tab-bar-item-${tabBarIconKey}`; // this key is also used to identify elements for e2e testing
      const isSelected = state.index === index;
      const icon = ICON_BY_TAB_BAR_ICON_KEY[tabBarIconKey];
      const labelKey = LABEL_BY_TAB_BAR_ICON_KEY[tabBarIconKey];
      const labelText = labelKey ? strings(labelKey) : '';
      const onPress = () => {
        callback?.();
        switch (rootScreenName) {
          case Routes.WALLET_VIEW:
            navigation.navigate(Routes.WALLET.HOME, {
              screen: Routes.WALLET_VIEW,
            });
            break;
          case Routes.MODAL.WALLET_ACTIONS:
            navigation.navigate(Routes.MODAL.WALLET_ACTIONS);
            trackEvent(
              createEventBuilder(MetaMetricsEvents.ACTIONS_BUTTON_CLICKED)
                .addProperties({
                  text: '',
                  chain_id: getDecimalChainId(chainId),
                })
                .build(),
            );
            break;
          case Routes.BROWSER.VIEW:
            navigation.navigate(Routes.BROWSER.HOME, {
              screen: Routes.BROWSER.VIEW,
            });
            break;
          case Routes.TRANSACTIONS_VIEW:
            navigation.navigate(Routes.TRANSACTIONS_VIEW);
            break;
          case Routes.REWARDS_VIEW:
            if (isRewardsEnabled) {
              navigation.navigate(Routes.REWARDS_VIEW);
            }
            break;
          case Routes.SETTINGS_VIEW:
            navigation.navigate(Routes.SETTINGS_VIEW, {
              screen: 'Settings',
            });
        }
      };

      const isWalletAction = rootScreenName === Routes.MODAL.WALLET_ACTIONS;

      return (
        <View key={key} style={tw.style('flex-1')}>
          <TabBarItem
            label={labelText}
            iconName={icon}
            onPress={onPress}
            isActive={isSelected}
            isTradeButton={isWalletAction}
            testID={key}
          />
        </View>
      );
    },
    [
      state,
      descriptors,
      navigation,
      chainId,
      trackEvent,
      createEventBuilder,
      tw,
      isRewardsEnabled,
    ],
  );

  const renderTabBarItems = useCallback(
    () => state.routes.map((route, index) => renderTabBarItem(route, index)),
    [state, renderTabBarItem],
  );

  return (
    <View ref={tabBarRef}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full pt-3 px-2 bg-default border-t border-muted gap-x-2"
        style={[tw.style(`pb-[${bottomInset}px]`)]}
      >
        {renderTabBarItems()}
      </Box>
    </View>
  );
};

export default TabBar;
