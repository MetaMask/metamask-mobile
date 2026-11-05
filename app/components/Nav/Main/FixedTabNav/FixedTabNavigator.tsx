import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Routes from '../../../../constants/navigation/Routes';
import { TrendingQuickBuySheetProvider } from '../../../UI/Trending/contexts';
import { QuickBuySheetHostProvider } from '../../../UI/QuickBuy/QuickBuySheetHost';
import FixedTabBar from './FixedTabBar';
import WalletTabStack from './WalletTabStack';
import { CollectHub, MoneyHub, TradeHub } from './hubs';

const Tab = createBottomTabNavigator();

/**
 * Prototype root tabs. The footer is always Home · Trade · Money · Collect.
 * Pills on Trade, Money, and Collect switch the scene and leave the footer put.
 */
const FixedTabNavigator = () => (
  <TrendingQuickBuySheetProvider>
    <QuickBuySheetHostProvider>
      <Tab.Navigator
        initialRouteName={Routes.WALLET.HOME}
        tabBar={FixedTabBar}
        screenOptions={{
          headerShown: false,
          // Mount a hub on first visit. Do not mount Perps, Predict, and
          // Swaps together at launch.
          lazy: true,
          // Freezing a tab mid-mount can leave the previous scene stuck.
          freezeOnBlur: false,
        }}
      >
        <Tab.Screen name={Routes.WALLET.HOME} component={WalletTabStack} />
        <Tab.Screen name={Routes.FIXED_TAB_NAV.TRADE} component={TradeHub} />
        <Tab.Screen name={Routes.FIXED_TAB_NAV.MONEY} component={MoneyHub} />
        <Tab.Screen
          name={Routes.FIXED_TAB_NAV.COLLECT}
          component={CollectHub}
        />
      </Tab.Navigator>
    </QuickBuySheetHostProvider>
  </TrendingQuickBuySheetProvider>
);

export default FixedTabNavigator;
