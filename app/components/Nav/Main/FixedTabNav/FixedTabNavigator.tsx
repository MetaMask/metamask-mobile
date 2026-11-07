import React, { useCallback, useState } from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { FloatingTabBarInsetContext } from '../../../../component-library/components/Navigation/TabBarFloating';
import Routes from '../../../../constants/navigation/Routes';
import { TrendingQuickBuySheetProvider } from '../../../UI/Trending/contexts';
import { QuickBuySheetHostProvider } from '../../../UI/QuickBuy/QuickBuySheetHost';
import FixedTabBar, { FixedTabBarHeightContext } from './FixedTabBar';
import FixedTabSocial from './FixedTabSocial';
import WalletTabStack from './WalletTabStack';
import { CollectHub, MoneyHub, TradeHub } from './hubs';
import { TabHubSheetHostProvider } from './TabHubSheetHost';

const Tab = createBottomTabNavigator();

// `tabBar` is invoked as a plain function, so render the bar as an element to
// give its hooks their own component.
const renderTabBar = (props: BottomTabBarProps) => <FixedTabBar {...props} />;

/**
 * Prototype root tabs. The footer is always Home · Money · Trade · Collect · Social.
 * Tabs on Trade, Money, and Collect switch the scene and leave the footer put.
 */
const FixedTabNavigator = () => {
  const [barHeight, setBarHeight] = useState(0);
  const reportHeight = useCallback((height: number) => {
    setBarHeight((current) => (current === height ? current : height));
  }, []);

  return (
    <TrendingQuickBuySheetProvider>
      <QuickBuySheetHostProvider>
        <FixedTabBarHeightContext.Provider value={reportHeight}>
          <FloatingTabBarInsetContext.Provider value={barHeight}>
            {/*
             * The hub sheet host sits INSIDE the inset contexts (hosted sheets
             * read the footer inset) but OUTSIDE the navigator, so a hosted
             * sheet paints after — and therefore above — the scenes and the
             * absolutely-positioned footer tab bar.
             */}
            <TabHubSheetHostProvider>
              <Tab.Navigator
                initialRouteName={Routes.WALLET.HOME}
                tabBar={renderTabBar}
                screenOptions={{
                  headerShown: false,
                  // The glass pill overlays the scene instead of reserving a slot.
                  tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    elevation: 0,
                  },
                  // Mount a hub on first visit. Do not mount Perps, Predict, and
                  // Swaps together at launch.
                  lazy: true,
                  // Freezing a tab mid-mount can leave the previous scene stuck.
                  freezeOnBlur: false,
                }}
              >
                <Tab.Screen
                  name={Routes.WALLET.HOME}
                  component={WalletTabStack}
                />
                <Tab.Screen
                  name={Routes.FIXED_TAB_NAV.MONEY}
                  component={MoneyHub}
                />
                <Tab.Screen
                  name={Routes.FIXED_TAB_NAV.TRADE}
                  component={TradeHub}
                />
                <Tab.Screen
                  name={Routes.FIXED_TAB_NAV.COLLECT}
                  component={CollectHub}
                />
                <Tab.Screen
                  name={Routes.SOCIAL.TAB}
                  component={FixedTabSocial}
                />
              </Tab.Navigator>
            </TabHubSheetHostProvider>
          </FloatingTabBarInsetContext.Provider>
        </FixedTabBarHeightContext.Provider>
      </QuickBuySheetHostProvider>
    </TrendingQuickBuySheetProvider>
  );
};

export default FixedTabNavigator;
