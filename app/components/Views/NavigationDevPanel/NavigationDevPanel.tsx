import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { selectTransactions } from '../../../selectors/transactionController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectRampsOrdersForSelectedAccountGroup } from '../../../selectors/rampsController';
import { getOrders } from '../../../reducers/fiatOrders';
import { selectMoneyEnableMoneyAccountFlag } from '../../UI/Money/selectors/featureFlags';
import {
  MOCK_ADD_BOOKMARK_PARAMS,
  MOCK_NFT_DETAILS_PARAMS,
  MOCK_NFT_FULL_IMAGE_PARAMS,
  MOCK_OFFLINE_MODE_PARAMS,
  MOCK_PR4A_PARAMS,
  MOCK_SET_PASSWORD_FLOW_PARAMS,
  MOCK_WEBVIEW_PARAMS,
  resolvePr4aTransactionsHomeParams,
  seedDevPanelAggregatorOrder,
  seedDevPanelBridgeTransaction,
  seedDevPanelDepositOrder,
  seedDevPanelRampsOrder,
  seedDevPanelSellOrder,
} from './NavigationDevPanel.mockParams';

/**
 * Dev-only panel that lists every top-level route registered in MainNavigator
 * so navigation behavior (animations, headers, gestures, presentation) can be
 * eyeballed before/after the native-stack migration.
 *
 * Route params and PR4a seed helpers live in NavigationDevPanel.mockParams.ts
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
  /** Resolves params from wallet state (with dev fallbacks) and opens via Activity tab. */
  pr4aTransactionsHome?: boolean;
}

interface RouteGroup {
  title: string;
  routes: RouteEntry[];
}

// NOTE: Scoped to in-progress native-stack migration PRs. PR2 = single-screen
// wrappers; PR3 = multi-screen leaf flows; PR4a = wallet + activity tab stacks.
// Uncomment groups below as each subsequent PR lands so the panel reflects
// what is currently being migrated.
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
  {
    title: 'PR3 — Multi-screen leaf flows',
    routes: [
      { name: Routes.NOTIFICATIONS.VIEW, label: 'Notifications' },
      { name: 'SetPasswordFlow', label: 'Set Password Flow' },
      { name: Routes.TRENDING_VIEW, label: 'Explore Home' },
      { name: Routes.BROWSER.HOME, label: 'Browser Flow' },
    ],
  },
  {
    title: 'PR3 — Set Password Flow (inner screens)',
    routes: [
      {
        name: 'SetPasswordFlow',
        label: 'Choose Password (step 1 of 3)',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.CHOOSE_PASSWORD,
      },
      {
        name: 'SetPasswordFlow',
        label: 'Account Backup Step 1 (step 2 of 3)',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.ACCOUNT_BACKUP_STEP_1,
      },
      {
        name: 'SetPasswordFlow',
        label: 'Account Backup Step 1B',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.ACCOUNT_BACKUP_STEP_1B,
      },
      {
        name: 'SetPasswordFlow',
        label: 'Manual Backup Step 1',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.MANUAL_BACKUP_STEP_1,
      },
      {
        name: 'SetPasswordFlow',
        label: 'Manual Backup Step 2',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.MANUAL_BACKUP_STEP_2,
      },
      {
        name: 'SetPasswordFlow',
        label: 'Manual Backup Step 3',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.MANUAL_BACKUP_STEP_3,
      },
      {
        name: 'SetPasswordFlow',
        label: 'Optin Metrics',
        params: MOCK_SET_PASSWORD_FLOW_PARAMS.OPTIN_METRICS,
      },
    ],
  },
  {
    title: 'PR4a — WalletTabStackFlow',
    routes: [
      { name: Routes.WALLET_VIEW, label: 'WalletView' },
      {
        name: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
        label: 'RevealPrivateCredentialView',
        params: MOCK_PR4A_PARAMS.REVEAL_PRIVATE_CREDENTIAL,
      },
    ],
  },
  {
    title: 'PR4a — TransactionsHome',
    routes: [
      {
        name: Routes.TRANSACTION_DETAILS,
        label: 'TransactionDetails (stack)',
        pr4aTransactionsHome: true,
      },
      {
        name: Routes.RAMP.ORDER_DETAILS,
        label: 'OrderDetails (legacy aggregator)',
        pr4aTransactionsHome: true,
      },
      {
        name: Routes.RAMP.RAMPS_ORDER_DETAILS,
        label: 'RampsOrderDetails (v2)',
        pr4aTransactionsHome: true,
      },
      {
        name: Routes.DEPOSIT.ORDER_DETAILS,
        label: 'DepositOrderDetails',
        pr4aTransactionsHome: true,
      },
      {
        name: Routes.RAMP.BANK_DETAILS_STANDALONE,
        label: 'BankDetailsStandalone',
        pr4aTransactionsHome: true,
      },
      {
        name: Routes.RAMP.SEND_TRANSACTION,
        label: 'SendTransaction',
        pr4aTransactionsHome: true,
      },
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
        label: 'BridgeTransactionDetails',
        pr4aTransactionsHome: true,
      },
    ],
  },
  // --- Routes below are out of scope for the current PR. Uncomment a group
  // --- when its migration PR begins. ---
  // {
  //   title: 'Home & Tabs',
  //   routes: [
  //     { name: Routes.HOME_TABS, label: 'Home (Tabs)' },
  //     { name: Routes.SETTINGS_VIEW, label: 'Settings Flow' },
  //     { name: Routes.QR_TAB_SWITCHER, label: 'QR Tab Switcher' },
  //     { name: 'GeneralSettings' },
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
  //   title: 'Explore & Browser (nested screens)',
  //   routes: [
  //     { name: Routes.EXPLORE_SEARCH, label: 'Explore Search' },
  //     { name: Routes.SITES_FULL_VIEW, label: 'Sites Full View' },
  //     { name: Routes.WHATS_HAPPENING_DETAIL, label: "What's Happening Detail" },
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
  const dispatch = useDispatch();
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const rampsOrders = useSelector(selectRampsOrdersForSelectedAccountGroup);
  const fiatOrders = useSelector(getOrders);
  const transactions = useSelector(selectTransactions);
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const pr4aTransactionsHomeContext = useMemo(
    () => ({
      rampsOrders,
      fiatOrders,
      transactions,
      bridgeHistory,
    }),
    [rampsOrders, fiatOrders, transactions, bridgeHistory],
  );

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

  const navigateUntyped = useCallback(
    (name: string, params?: Record<string, unknown>) => {
      (
        navigation as unknown as {
          navigate: (
            routeName: string,
            routeParams?: Record<string, unknown>,
          ) => void;
        }
      ).navigate(name, params);
    },
    [navigation],
  );

  const navigateToTransactionsHomeScreen = useCallback(
    (screenName: string, screenParams: Record<string, unknown>) => {
      // TransactionsHome lives on the Activity tab (or as a root overlay when Money tab is on).
      if (isMoneyAccountEnabled) {
        navigateUntyped(Routes.TRANSACTIONS_VIEW, {
          screen: screenName,
          params: screenParams,
        });
        return;
      }

      navigateUntyped('Home', {
        screen: Routes.TRANSACTIONS_VIEW,
        params: {
          screen: screenName,
          params: screenParams,
        },
      });
    },
    [isMoneyAccountEnabled, navigateUntyped],
  );

  const handleNavigate = useCallback(
    (entry: RouteEntry) => {
      if (entry.pr4aTransactionsHome) {
        let screenParams: Record<string, unknown> | null = null;

        if (entry.name === Routes.RAMP.SEND_TRANSACTION) {
          screenParams = {
            orderId: seedDevPanelSellOrder(
              fiatOrders,
              dispatch,
              selectedAddress,
            ),
          };
        } else if (entry.name === Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS) {
          screenParams = seedDevPanelBridgeTransaction(
            selectedAddress,
            bridgeHistory,
            transactions,
          );
        } else {
          screenParams = resolvePr4aTransactionsHomeParams(
            entry.name,
            pr4aTransactionsHomeContext,
          );
        }

        if (!screenParams) {
          const isTransactionDetails =
            entry.name === Routes.TRANSACTION_DETAILS;
          Alert.alert(
            'No transactions',
            isTransactionDetails
              ? 'Complete a transaction on this wallet first, then try again.'
              : 'No matching data on this wallet for this screen.',
          );
          return;
        }

        if (entry.name === Routes.RAMP.ORDER_DETAILS) {
          screenParams = {
            orderId: seedDevPanelAggregatorOrder(fiatOrders, dispatch),
          };
        } else if (entry.name === Routes.RAMP.RAMPS_ORDER_DETAILS) {
          screenParams = seedDevPanelRampsOrder(rampsOrders, selectedAddress);
        } else if (entry.name === Routes.DEPOSIT.ORDER_DETAILS) {
          screenParams = {
            orderId: seedDevPanelDepositOrder(
              fiatOrders,
              dispatch,
              selectedAddress,
            ),
          };
        }

        navigateToTransactionsHomeScreen(entry.name, screenParams);
        return;
      }

      navigateUntyped(entry.name, entry.params);
    },
    [
      bridgeHistory,
      dispatch,
      fiatOrders,
      navigateToTransactionsHomeScreen,
      navigateUntyped,
      pr4aTransactionsHomeContext,
      rampsOrders,
      selectedAddress,
      transactions,
    ],
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
                key={`${route.name}-${route.label ?? ''}`}
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
