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
import { TabBarProps } from './TabBar.types';
import {
  ICON_BY_TAB_BAR_ICON_KEY,
  LABEL_BY_TAB_BAR_ICON_KEY,
} from './TabBar.constants';
import OnboardingWizard from '../../../../components/UI/OnboardingWizard';
import { selectChainId } from '../../../../selectors/networkController';

const TabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const chainId = useSelector(selectChainId);
  const tabBarRef = useRef(null);
  const tw = useTailwind();
  /**
   * Current onboarding wizard step
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wizardStep = useSelector((reduxState: any) => reduxState.wizard.step);
  /**
   * Return current step of onboarding wizard if not step 5 nor 0
   */
  const renderOnboardingWizard = useCallback(
    () =>
      [4, 5, 6].includes(wizardStep) && (
        <OnboardingWizard navigation={navigation} coachmarkRef={tabBarRef} />
      ),
    [navigation, wizardStep],
  );

  const renderTabBarItem = useCallback(
    (route: { name: string; key: string }, index: number) => {
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
              screen: Routes.WALLET.TAB_STACK_FLOW,
              params: {
                screen: Routes.WALLET_VIEW,
              },
            });
            break;
          case Routes.MODAL.WALLET_ACTIONS:
            navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.MODAL.WALLET_ACTIONS,
            });
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
    ],
  );

  const renderTabBarItems = useCallback(
    () => state.routes.map(renderTabBarItem),
    [state, renderTabBarItem],
  );

  return (
    <View ref={tabBarRef}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full pt-3 px-2 bg-default border-t border-muted"
        style={[tw.style(`pb-[${bottomInset}px]`)]}
      >
        {renderTabBarItems()}
      </Box>
      {renderOnboardingWizard()}
    </View>
  );
};

export default TabBar;
