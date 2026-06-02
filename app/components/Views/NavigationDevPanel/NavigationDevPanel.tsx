import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  TextFieldSearch,
} from '@metamask/design-system-react-native';

import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import {
  MOCK_ADD_BOOKMARK_PARAMS,
  MOCK_NFT_DETAILS_PARAMS,
  MOCK_NFT_FULL_IMAGE_PARAMS,
  MOCK_OFFLINE_MODE_PARAMS,
  MOCK_WEBVIEW_PARAMS,
} from './NavigationDevPanel.mockParams';

/**
 * Dev-only panel that lists every top-level route registered in MainNavigator
 * so navigation behavior (animations, headers, gestures, presentation) can be
 * eyeballed before/after the native-stack migration.
 *
 * Routes that need params ship with dev mocks in NavigationDevPanel.mockParams.ts
 * so screens render without crashing when opened from this panel.
 */

interface RouteEntry {
  /** Route name passed to navigation.navigate */
  name: string;
  /** Optional human label; defaults to the route name */
  label?: string;
  /** Optional default params so the screen renders something useful */
  params?: Record<string, unknown>;
  /** Marks routes known to require params (best opened from their real flow) */
  needsParams?: boolean;
}

interface RouteGroup {
  title: string;
  routes: RouteEntry[];
}

// NOTE: Scoped to the PR1+PR2 work only — the trivial single-screen wrapper
// navigators being migrated to native-stack first. All other route groups are
// commented out below and will be re-enabled as each subsequent PR lands so the
// panel always reflects exactly what's currently being migrated.
const ROUTE_GROUPS: RouteGroup[] = [
  {
    title: 'PR2 — Single-screen wrappers',
    routes: [
      { name: 'Webview', label: 'Webview', params: MOCK_WEBVIEW_PARAMS },
      {
        name: 'AddBookmarkView',
        label: 'Add Bookmark',
        params: MOCK_ADD_BOOKMARK_PARAMS,
      },
      {
        name: 'OfflineModeView',
        label: 'Offline Mode',
        params: MOCK_OFFLINE_MODE_PARAMS,
      },
      {
        name: 'NftDetails',
        label: 'NFT Details',
        params: MOCK_NFT_DETAILS_PARAMS,
      },
      {
        name: 'NftDetailsFullImage',
        label: 'NFT Full Image',
        params: MOCK_NFT_FULL_IMAGE_PARAMS,
      },
      ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      { name: Routes.SAMPLE_FEATURE, label: 'Sample Feature' },
      ///: END:ONLY_INCLUDE_IF
    ],
  },
  // --- Routes below are out of scope for the current PR. Uncomment a group
  // --- when its migration PR begins. ---
  // {
  //   title: 'Home & Tabs',
  //   routes: [
  //     { name: Routes.HOME_TABS, label: 'Home (Tabs)' },
  //     { name: Routes.SETTINGS_VIEW, label: 'Settings Flow' },
  //     { name: Routes.NOTIFICATIONS.VIEW, label: 'Notifications' },
  //     { name: Routes.QR_TAB_SWITCHER, label: 'QR Tab Switcher' },
  //     { name: 'GeneralSettings' },
  //     { name: 'SetPasswordFlow' },
  //   ],
  // },
  // {
  //   title: 'Assets',
  //   routes: [
  //     { name: 'Asset', needsParams: true },
  //     { name: 'AddAsset' },
  //     { name: 'ConfirmAddAsset', needsParams: true },
  //     { name: Routes.WALLET.TOKENS_FULL_VIEW, label: 'Tokens Full View' },
  //     { name: Routes.WALLET.NFTS_FULL_VIEW, label: 'NFTs Full View' },
  //     { name: Routes.WALLET.DEFI_FULL_VIEW, label: 'DeFi Full View' },
  //     {
  //       name: Routes.WALLET.CASH_TOKENS_FULL_VIEW,
  //       label: 'Cash Tokens Full View',
  //     },
  //     { name: 'TrendingTokensFullView' },
  //     { name: 'RWATokensFullView' },
  //     { name: 'CollectiblesDetails', needsParams: true },
  //     {
  //       name: 'DeFiProtocolPositionDetails',
  //       label: 'DeFi Protocol Position Details',
  //       needsParams: true,
  //     },
  //   ],
  // },
  // {
  //   title: 'Explore & Browser',
  //   routes: [
  //     { name: Routes.EXPLORE_SEARCH, label: 'Explore Search' },
  //     { name: Routes.SITES_FULL_VIEW, label: 'Sites Full View' },
  //     { name: Routes.WHATS_HAPPENING_DETAIL, label: "What's Happening Detail" },
  //     { name: Routes.BROWSER.HOME, label: 'Browser' },
  //   ],
  // },
  // {
  //   title: 'Send / Transactions',
  //   routes: [
  //     { name: 'Send' },
  //     { name: Routes.TRANSACTIONS_VIEW, label: 'Transactions' },
  //   ],
  // },
  // {
  //   title: 'Ramp / Deposit',
  //   routes: [
  //     { name: Routes.RAMP.TOKEN_SELECTION, label: 'Ramp Token Selection' },
  //     { name: Routes.RAMP.HEADLESS_ENTRY, label: 'Ramp Headless Entry' },
  //     { name: Routes.RAMP.BUY, label: 'Ramp Buy' },
  //     { name: Routes.RAMP.SELL, label: 'Ramp Sell' },
  //     { name: Routes.DEPOSIT.ID, label: 'Deposit' },
  //     {
  //       name: Routes.RAMP.MODALS.PROCESSING_INFO,
  //       label: 'Ramp Processing Info Modal',
  //     },
  //   ],
  // },
  // {
  //   title: 'Bridge / Stake / Earn',
  //   routes: [
  //     { name: Routes.BRIDGE.ROOT, label: 'Bridge' },
  //     { name: Routes.BRIDGE.MODALS.ROOT, label: 'Bridge Modals' },
  //     { name: 'StakeScreens' },
  //     { name: 'StakeModals' },
  //     { name: Routes.EARN.ROOT, label: 'Earn Screens' },
  //     { name: Routes.EARN.MODALS.ROOT, label: 'Earn Modals' },
  //   ],
  // },
  // {
  //   title: 'Money (flag)',
  //   routes: [
  //     { name: Routes.MONEY.ROOT, label: 'Money Screens' },
  //     { name: Routes.MONEY.CONFIRMATIONS_ROOT, label: 'Money Confirmations' },
  //     { name: Routes.MONEY.ONBOARDING, label: 'Money Onboarding' },
  //     { name: Routes.MONEY.MODALS.ROOT, label: 'Money Modals' },
  //   ],
  // },
  // {
  //   title: 'Perps (flag)',
  //   routes: [
  //     { name: Routes.PERPS.ROOT, label: 'Perps' },
  //     { name: Routes.PERPS.TUTORIAL, label: 'Perps Tutorial' },
  //     { name: Routes.PERPS.MODALS.ROOT, label: 'Perps Modals' },
  //     {
  //       name: Routes.PERPS.POSITION_TRANSACTION,
  //       label: 'Perps Position Transaction',
  //       needsParams: true,
  //     },
  //     {
  //       name: Routes.PERPS.ORDER_TRANSACTION,
  //       label: 'Perps Order Transaction',
  //       needsParams: true,
  //     },
  //     {
  //       name: Routes.PERPS.FUNDING_TRANSACTION,
  //       label: 'Perps Funding Transaction',
  //       needsParams: true,
  //     },
  //   ],
  // },
  // {
  //   title: 'Predict / Market Insights / Leaderboard (flag)',
  //   routes: [
  //     { name: Routes.PREDICT.ROOT, label: 'Predict' },
  //     { name: Routes.PREDICT.MODALS.ROOT, label: 'Predict Modals' },
  //     { name: Routes.MARKET_INSIGHTS.VIEW, label: 'Market Insights' },
  //     { name: Routes.SOCIAL_LEADERBOARD.VIEW, label: 'Top Traders' },
  //     {
  //       name: Routes.SOCIAL_LEADERBOARD.PROFILE,
  //       label: 'Trader Profile',
  //       needsParams: true,
  //     },
  //     {
  //       name: Routes.SOCIAL_LEADERBOARD.POSITION,
  //       label: 'Trader Position',
  //       needsParams: true,
  //     },
  //   ],
  // },
  // {
  //   title: 'Rewards',
  //   routes: [
  //     { name: Routes.REWARDS_VIEW, label: 'Rewards' },
  //     { name: Routes.REWARD_BENEFIT_FULL_VIEW, label: 'Benefit Full View' },
  //     { name: Routes.REWARD_BENEFITS_FULL_VIEW, label: 'Benefits Full View' },
  //   ],
  // },
  // {
  //   title: 'Other',
  //   routes: [
  //     { name: Routes.CARD.ROOT, label: 'Card Screens' },
  //     {
  //       name: Routes.DEPRECATED_NETWORK_DETAILS,
  //       label: 'Deprecated Network Details',
  //       needsParams: true,
  //     },
  //     { name: Routes.FEATURE_FLAG_OVERRIDE, label: 'Feature Flag Override' },
  //   ],
  // },
];

const NavigationDevPanel = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        'Navigation Dev Panel',
        navigation,
        false,
        colors,
        null,
      ),
    );
  }, [navigation, colors]);

  const handleNavigate = useCallback(
    (entry: RouteEntry) => {
      // Dev tool navigates to arbitrary registered routes, so the param list
      // can't be statically typed here.
      (
        navigation as unknown as {
          navigate: (name: string, params?: Record<string, unknown>) => void;
        }
      ).navigate(entry.name, entry.params);
    },
    [navigation],
  );

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return ROUTE_GROUPS;
    }
    return ROUTE_GROUPS.map((group) => ({
      ...group,
      routes: group.routes.filter((route) =>
        `${route.label ?? ''} ${route.name}`.toLowerCase().includes(query),
      ),
    })).filter((group) => group.routes.length > 0);
  }, [search]);

  return (
    <Box twClassName="flex-1">
      <Box twClassName="w-full px-4 py-2">
        <TextFieldSearch
          value={search}
          onChangeText={setSearch}
          placeholder="Filter routes..."
          onPressClearButton={() => setSearch('')}
        />
      </Box>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {filteredGroups.map((group) => (
          <Box key={group.title} twClassName="mb-2">
            <Text
              twClassName="px-4 pt-4 pb-2"
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Bold}
            >
              {group.title.toUpperCase()}
            </Text>
            {group.routes.map((route) => (
              <TouchableOpacity
                key={route.name}
                onPress={() => handleNavigate(route)}
                activeOpacity={0.6}
              >
                <Box twClassName="flex-row items-center justify-between px-4 py-3 border-b border-muted">
                  <Box twClassName="flex-1 pr-2">
                    <Text variant={TextVariant.BodyMd}>
                      {route.label ?? route.name}
                    </Text>
                    {route.label && route.label !== route.name ? (
                      <Text
                        variant={TextVariant.BodyXs}
                        color={TextColor.TextAlternative}
                      >
                        {route.name}
                      </Text>
                    ) : null}
                  </Box>
                  {route.needsParams ? (
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.WarningDefault}
                    >
                      needs params
                    </Text>
                  ) : null}
                </Box>
              </TouchableOpacity>
            ))}
          </Box>
        ))}
        {filteredGroups.length === 0 ? (
          <Box twClassName="items-center py-8 px-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {`No routes match "${search}"`}
            </Text>
          </Box>
        ) : null}
      </ScrollView>
    </Box>
  );
};

export default NavigationDevPanel;
