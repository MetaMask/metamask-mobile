// TEMPORARY dev menu for MainNavigator route preview — revert before merge.
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSelector, useStore } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../component-library/components-temp/HeaderCompactStandard';
import Routes from '../../constants/navigation/Routes';
import { RootState } from '../../reducers';
import { earnSelectors } from '../../selectors/earnController';
import { selectMarketInsightsPerpsEnabled } from '../../selectors/featureFlagController/marketInsights';
import { selectSocialLeaderboardEnabled } from '../../selectors/featureFlagController/socialLeaderboard';
import { useStyles } from '../../component-library/hooks';
import { useTheme } from '../../util/theme';
import Logger from '../../util/Logger';
import { strings } from '../../../locales/i18n';
import { selectMoneyEnableMoneyAccountFlag } from '../UI/Money/selectors/featureFlags';
import { selectPerpsEnabledFlag } from '../UI/Perps';
import { selectPredictEnabledFlag } from '../UI/Predict';
import { selectMarketInsightsEnabled } from '../UI/MarketInsights';
import type { TokenI } from '../UI/Tokens/types';
import styleSheet from '../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

export const MONEY_CONFIRMATION_HEADER_PREVIEW_ROUTE = 'MoneyConfirmationHeaderPreview';

type MoneyConfirmationHeaderPreviewParams = { variant: 'deposit' | 'withdraw' };

export const MoneyConfirmationHeaderPreview = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: MoneyConfirmationHeaderPreviewParams }, 'params'>>();
  const variant = route.params?.variant ?? 'deposit';
  const title =
    variant === 'deposit'
      ? strings('transaction_details.title.money_account_deposit')
      : strings('transaction_details.title.money_account_withdraw');

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={{ flex: 1, backgroundColor: colors.background.default }}>
      <HeaderCompactStandard title={title} onBack={() => navigation.goBack()} includesTopInset twClassName="bg-default" />
      <View style={{ flex: 1 }} />
    </SafeAreaView>
  );
};

export const DEV_WEBVIEW_PARAMS = {
  screen: Routes.WEBVIEW.SIMPLE,
  params: {
    url: 'https://example.com',
    title: 'Main Navigator Dev Preview',
  },
};

export const DEV_QR_TAB_SWITCHER_PARAMS = {
  onScanSuccess: () => undefined,
  onScanError: () => undefined,
};

export const DEV_NFT_COLLECTIBLE = {
  name: 'Dev Preview NFT',
  tokenId: '1',
  address: '0x0000000000000000000000000000000000000001',
  image: '',
  description: 'Mock collectible for Main Navigator route preview',
  externalLink: '',
  creator: '',
  properties: [],
  rarityRank: null,
  lastSale: null,
  lastPrice: null,
  favorite: false,
  isCollectible: true,
  standard: 'ERC721',
  chainId: 1,
};

export const DEV_ASSET_PARAMS = {
  chainId: '0x1',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  isFromTrending: true,
};

export const DEV_DEFI_PROTOCOL_PARAMS = {
  protocolAggregate: {
    protocolDetails: {
      name: 'Dev Preview Protocol',
      iconUrl: 'https://example.com/protocol.png',
    },
    aggregatedMarketValue: 100,
    positionTypes: {
      supply: {
        aggregatedMarketValue: 100,
        positions: [
          [
            {
              protocolTokenAddress: '0x1234567890abcdef',
              marketValue: 100,
              tokens: [
                {
                  name: 'Token 1',
                  symbol: 'TKN1',
                  iconUrl: 'https://example.com/tkn1.png',
                  balance: 500,
                  marketValue: 100,
                  type: 'underlying',
                },
              ],
            },
          ],
        ],
      },
    },
  },
  networkIconAvatar: undefined,
};

export const DEV_PERPS_POSITION_TRANSACTION = {
  id: 'trade-dev-preview',
  type: 'trade' as const,
  category: 'position_close' as const,
  title: 'Closed ETH long',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$150.75',
    amountNumber: 150.75,
    isPositive: true,
    size: 1.5,
    entryPrice: 2000,
    points: '75.50',
    pnl: '150.75',
    fee: '5.00',
    feeToken: 'USDC',
    action: 'Closed',
    dir: 'long',
  },
};

export const DEV_PERPS_ORDER_TRANSACTION = {
  id: 'order-dev-preview',
  type: 'order' as const,
  category: 'limit_order' as const,
  title: 'Long ETH limit',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  order: {
    text: 'Filled',
    statusType: 'filled' as const,
    type: 'limit',
    size: '3000',
    limitPrice: 2000,
    filled: '100%',
  },
};

export const DEV_PERPS_FUNDING_TRANSACTION = {
  id: 'funding-dev-preview',
  title: 'Funding Payment',
  timestamp: 1706745600000,
  fundingAmount: {
    feeNumber: 5.25,
    isPositive: true,
    rate: '0.0125%',
  },
};

export const DEV_SOCIAL_TRADER_PROFILE_PARAMS = {
  traderId: 'dev-trader',
  traderName: 'Dev Trader',
  traderAddress: '0x1234567890123456789012345678901234567890',
  source: 'developer_options',
};

export const DEV_SOCIAL_TRADER_POSITION_PARAMS = {
  positionId: 'dev-position',
  traderId: 'dev-trader',
  source: 'developer_options',
};

export const DEV_WHATS_HAPPENING_PARAMS = {
  initialIndex: 0,
  source: 'developer_options',
};

export const DEV_REWARD_BENEFIT_PARAMS = {
  benefit: {
    id: 0,
    longTitle: 'Dev Preview Benefit',
    shortDescription: 'Mock benefit for route preview',
    longDescription: 'Mock benefit description for Main Navigator dev menu.',
    thumbnail: '',
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2026-12-31T23:59:59Z',
    url: '',
    actionDate: null,
    chain: 'ethereum',
    type: { id: 0, name: 'Dev Preview' },
  },
};

export const DEV_MARKET_INSIGHTS_PARAMS = {
  assetSymbol: 'ETH',
  assetIdentifier: 'eip155:1/slip44:60',
  tokenImageUrl: 'https://example.com/eth.png',
  source: 'unknown' as const,
  token: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    name: 'Ethereum',
    chainId: '0x1',
    image: 'https://example.com/eth.png',
    balance: '0',
  },
};

export const DEV_MARKET_INSIGHTS_PERPS_PARAMS = {
  assetSymbol: 'ETH',
  assetIdentifier: 'ETH',
  isPerps: true,
  hasPerpsPosition: false,
  source: 'perps' as const,
};

export const DEV_STAKE_MODALS_LEARN_MORE_PARAMS = {
  screen: Routes.STAKING.MODALS.LEARN_MORE,
  params: { chainId: '0x1' },
};

export type MainNavigatorDevRouteRequirement =
  | 'money'
  | 'perps'
  | 'predict'
  | 'marketInsights'
  | 'socialLeaderboard'
  | 'nonProduction'
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | 'sampleFeature'
  ///: END:ONLY_INCLUDE_IF
  ;

export interface MainNavigatorDevRoute {
  id: string;
  label: string;
  routeName: string;
  params?: Record<string, unknown>;
  requirement?: MainNavigatorDevRouteRequirement;
  note?: string;
}

export interface MainNavigatorDevRouteGroup {
  title: string;
  routes: MainNavigatorDevRoute[];
}

export const MAIN_NAVIGATOR_DEV_ROUTE_GROUPS: MainNavigatorDevRouteGroup[] = [
  {
    title: 'Home & Wallet',
    routes: [
      { id: 'home', label: 'Home (tabs)', routeName: Routes.HOME_TABS },
      {
        id: 'deprecated-network-details',
        label: 'Deprecated Network Details',
        routeName: Routes.DEPRECATED_NETWORK_DETAILS,
      },
      {
        id: 'tokens-full-view',
        label: 'Tokens Full View',
        routeName: Routes.WALLET.TOKENS_FULL_VIEW,
      },
      {
        id: 'defi-full-view',
        label: 'DeFi Full View',
        routeName: Routes.WALLET.DEFI_FULL_VIEW,
      },
      {
        id: 'cash-tokens-full-view',
        label: 'Cash Tokens Full View',
        routeName: Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      },
      {
        id: 'trending-tokens-full-view',
        label: 'Trending Tokens Full View',
        routeName: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      },
      {
        id: 'rwa-tokens-full-view',
        label: 'RWA Tokens Full View',
        routeName: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
      },
      {
        id: 'nfts-full-view',
        label: 'NFTs Full View',
        routeName: Routes.WALLET.NFTS_FULL_VIEW,
      },
      {
        id: 'reward-benefits-full-view',
        label: 'Reward Benefits Full View',
        routeName: Routes.REWARD_BENEFITS_FULL_VIEW,
      },
      {
        id: 'reward-benefit-full-view',
        label: 'Reward Benefit Full View',
        routeName: Routes.REWARD_BENEFIT_FULL_VIEW,
        params: DEV_REWARD_BENEFIT_PARAMS,
      },
    ],
  },
  {
    title: 'Assets & NFTs',
    routes: [
      { id: 'add-asset', label: 'Add Asset', routeName: 'AddAsset' },
      {
        id: 'confirm-add-asset',
        label: 'Confirm Add Asset',
        routeName: 'ConfirmAddAsset',
        note: 'May need params from Add Asset flow',
      },
      {
        id: 'asset',
        label: 'Asset',
        routeName: 'Asset',
        params: DEV_ASSET_PARAMS,
      },
      {
        id: 'nft-details',
        label: 'NFT Details',
        routeName: 'NftDetails',
        params: { collectible: DEV_NFT_COLLECTIBLE },
      },
      {
        id: 'nft-details-full-image',
        label: 'NFT Details Full Image',
        routeName: 'NftDetailsFullImage',
        params: { collectible: DEV_NFT_COLLECTIBLE },
      },
      {
        id: 'defi-protocol-position-details',
        label: 'DeFi Protocol Position Details',
        routeName: 'DeFiProtocolPositionDetails',
        params: DEV_DEFI_PROTOCOL_PARAMS,
      },
    ],
  },
  {
    title: 'Settings & Utilities',
    routes: [
      {
        id: 'settings-view',
        label: 'Settings Flow',
        routeName: Routes.SETTINGS_VIEW,
      },
      {
        id: 'general-settings',
        label: 'General Settings',
        routeName: 'GeneralSettings',
      },
      {
        id: 'set-password-flow',
        label: 'Set Password Flow',
        routeName: 'SetPasswordFlow',
        note: 'Password onboarding flow',
      },
      {
        id: 'offline-mode',
        label: 'Offline Mode',
        routeName: 'OfflineModeView',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        routeName: Routes.NOTIFICATIONS.VIEW,
      },
      {
        id: 'qr-tab-switcher',
        label: 'QR Tab Switcher',
        routeName: Routes.QR_TAB_SWITCHER,
        params: DEV_QR_TAB_SWITCHER_PARAMS,
      },
      {
        id: 'feature-flag-override',
        label: 'Feature Flag Override',
        routeName: Routes.FEATURE_FLAG_OVERRIDE,
        requirement: 'nonProduction',
      },
    ],
  },
  {
    title: 'Web & Browser',
    routes: [
      {
        id: 'webview',
        label: 'Webview (SimpleWebview)',
        routeName: Routes.WEBVIEW.MAIN,
        params: DEV_WEBVIEW_PARAMS,
      },
      {
        id: 'add-bookmark',
        label: 'Add Bookmark',
        routeName: 'AddBookmarkView',
      },
      {
        id: 'browser-home',
        label: 'Browser Home',
        routeName: Routes.BROWSER.HOME,
      },
    ],
  },
  {
    title: 'Send & Confirmations',
    routes: [
      {
        id: 'send',
        label: 'Send',
        routeName: 'Send',
      },
    ],
  },
  {
    title: 'Ramp & Deposit',
    routes: [
      {
        id: 'ramp-token-selection',
        label: 'Ramp Token Selection',
        routeName: Routes.RAMP.TOKEN_SELECTION,
      },
      {
        id: 'ramp-headless-entry',
        label: 'Ramp Headless Entry',
        routeName: Routes.RAMP.HEADLESS_ENTRY,
      },
      {
        id: 'ramp-buy',
        label: 'Ramp Buy',
        routeName: Routes.RAMP.BUY,
      },
      {
        id: 'ramp-sell',
        label: 'Ramp Sell',
        routeName: Routes.RAMP.SELL,
      },
      {
        id: 'deposit',
        label: 'Deposit',
        routeName: Routes.DEPOSIT.ID,
      },
      {
        id: 'ramp-processing-info-modal',
        label: 'Ramp Processing Info Modal',
        routeName: Routes.RAMP.MODALS.PROCESSING_INFO,
      },
    ],
  },
  {
    title: 'Bridge, Stake & Earn',
    routes: [
      {
        id: 'bridge',
        label: 'Bridge',
        routeName: Routes.BRIDGE.ROOT,
      },
      {
        id: 'bridge-modals',
        label: 'Bridge Modals',
        routeName: Routes.BRIDGE.MODALS.ROOT,
        note: 'Transparent modal root',
      },
      {
        id: 'stake-screens-deposit',
        label: 'Stake Screens (Deposit)',
        routeName: 'StakeScreens',
        note: 'Uses earn token from wallet state',
      },
      {
        id: 'stake-screens-unstake',
        label: 'Stake Screens (Unstake)',
        routeName: 'StakeScreens',
        note: 'Uses staked earn token from wallet state',
      },
      {
        id: 'stake-screens-earnings-history',
        label: 'Stake Screens (Earnings History)',
        routeName: 'StakeScreens',
        note: 'Uses staked earn token from wallet state',
      },
      {
        id: 'stake-modals',
        label: 'Stake Modals (Learn More)',
        routeName: 'StakeModals',
        params: DEV_STAKE_MODALS_LEARN_MORE_PARAMS,
      },
      {
        id: 'earn',
        label: 'Earn',
        routeName: Routes.EARN.ROOT,
      },
      {
        id: 'earn-modals',
        label: 'Earn Modals',
        routeName: Routes.EARN.MODALS.ROOT,
        note: 'Transparent modal root',
      },
    ],
  },
  {
    title: 'Money',
    routes: [
      {
        id: 'money',
        label: 'Money',
        routeName: Routes.MONEY.ROOT,
        requirement: 'money',
      },
      {
        id: 'money-confirmations-deposit',
        label: 'Money Confirmations (Deposit)',
        routeName: Routes.MONEY.CONFIRMATIONS_ROOT,
        requirement: 'money',
        note: 'Header-only preview',
      },
      {
        id: 'money-confirmations-withdraw',
        label: 'Money Confirmations (Withdraw)',
        routeName: Routes.MONEY.CONFIRMATIONS_ROOT,
        requirement: 'money',
        note: 'Header-only preview',
      },
      {
        id: 'money-onboarding',
        label: 'Money Onboarding',
        routeName: Routes.MONEY.ONBOARDING,
        requirement: 'money',
      },
      {
        id: 'money-modals',
        label: 'Money Modals',
        routeName: Routes.MONEY.MODALS.ROOT,
        requirement: 'money',
        note: 'Transparent modal root',
      },
      {
        id: 'transactions-view',
        label: 'Transactions View',
        routeName: Routes.TRANSACTIONS_VIEW,
        requirement: 'money',
      },
    ],
  },
  {
    title: 'Perps',
    routes: [
      {
        id: 'perps',
        label: 'Perps',
        routeName: Routes.PERPS.ROOT,
        requirement: 'perps',
      },
      {
        id: 'perps-tutorial',
        label: 'Perps Tutorial',
        routeName: Routes.PERPS.TUTORIAL,
        requirement: 'perps',
      },
      {
        id: 'perps-modals',
        label: 'Perps Modals',
        routeName: Routes.PERPS.MODALS.ROOT,
        requirement: 'perps',
        note: 'Transparent modal root',
      },
      {
        id: 'perps-position-transaction',
        label: 'Perps Position Transaction',
        routeName: Routes.PERPS.POSITION_TRANSACTION,
        requirement: 'perps',
        params: { transaction: DEV_PERPS_POSITION_TRANSACTION },
      },
      {
        id: 'perps-order-transaction',
        label: 'Perps Order Transaction',
        routeName: Routes.PERPS.ORDER_TRANSACTION,
        requirement: 'perps',
        params: { transaction: DEV_PERPS_ORDER_TRANSACTION },
      },
      {
        id: 'perps-funding-transaction',
        label: 'Perps Funding Transaction',
        routeName: Routes.PERPS.FUNDING_TRANSACTION,
        requirement: 'perps',
        params: { transaction: DEV_PERPS_FUNDING_TRANSACTION },
      },
    ],
  },
  {
    title: 'Predict',
    routes: [
      {
        id: 'predict',
        label: 'Predict',
        routeName: Routes.PREDICT.ROOT,
        requirement: 'predict',
      },
      {
        id: 'predict-modals',
        label: 'Predict Modals',
        routeName: Routes.PREDICT.MODALS.ROOT,
        requirement: 'predict',
        note: 'Transparent modal root',
      },
    ],
  },
  {
    title: 'Market Insights & Social',
    routes: [
      {
        id: 'market-insights',
        label: 'Market Insights (Token)',
        routeName: Routes.MARKET_INSIGHTS.VIEW,
        requirement: 'marketInsights',
        params: DEV_MARKET_INSIGHTS_PARAMS,
      },
      {
        id: 'market-insights-perps',
        label: 'Market Insights (Perps)',
        routeName: Routes.MARKET_INSIGHTS.VIEW,
        requirement: 'marketInsights',
        params: DEV_MARKET_INSIGHTS_PERPS_PARAMS,
      },
      {
        id: 'social-leaderboard',
        label: 'Social Leaderboard',
        routeName: Routes.SOCIAL_LEADERBOARD.VIEW,
        requirement: 'socialLeaderboard',
      },
      {
        id: 'social-trader-profile',
        label: 'Trader Profile',
        routeName: Routes.SOCIAL_LEADERBOARD.PROFILE,
        requirement: 'socialLeaderboard',
        params: DEV_SOCIAL_TRADER_PROFILE_PARAMS,
      },
      {
        id: 'social-trader-position',
        label: 'Trader Position',
        routeName: Routes.SOCIAL_LEADERBOARD.POSITION,
        requirement: 'socialLeaderboard',
        params: DEV_SOCIAL_TRADER_POSITION_PARAMS,
      },
    ],
  },
  {
    title: 'Explore',
    routes: [
      {
        id: 'explore-search',
        label: 'Explore Search',
        routeName: Routes.EXPLORE_SEARCH,
      },
      {
        id: 'sites-full-view',
        label: 'Sites Full View',
        routeName: Routes.SITES_FULL_VIEW,
      },
      {
        id: 'whats-happening-detail',
        label: "What's Happening Detail",
        routeName: Routes.WHATS_HAPPENING_DETAIL,
        params: DEV_WHATS_HAPPENING_PARAMS,
      },
    ],
  },
  {
    title: 'Card',
    routes: [
      {
        id: 'card',
        label: 'Card',
        routeName: Routes.CARD.ROOT,
      },
    ],
  },
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  {
    title: 'Sample Feature',
    routes: [
      {
        id: 'sample-feature',
        label: 'Sample Feature',
        routeName: Routes.SAMPLE_FEATURE,
        requirement: 'sampleFeature',
      },
    ],
  },
  ///: END:ONLY_INCLUDE_IF
];

type StakeDevNavigationResult =
  | { params: Record<string, unknown> }
  | { error: string };

type EarnTokensData = ReturnType<typeof earnSelectors.selectEarnTokens>;

const findDepositToken = (
  earnTokensData: EarnTokensData,
): TokenI | undefined => {
  const { earnTokens } = earnTokensData;

  return (
    earnTokens.find((token) => token.isETH && !token.isStaked) ??
    earnTokens.find((token) => !token.isStaked) ??
    earnTokens[0]
  );
};

const findUnstakeToken = (
  state: RootState,
  earnTokensData: EarnTokensData,
): TokenI | undefined => {
  const { earnOutputTokens } = earnTokensData;
  const depositToken = findDepositToken(earnTokensData);

  if (depositToken) {
    const { outputToken } = earnSelectors.selectEarnTokenPair(
      state,
      depositToken,
    );
    if (outputToken) {
      return outputToken;
    }
  }

  return (
    earnOutputTokens.find((token) => token.isETH && token.isStaked) ??
    earnOutputTokens[0]
  );
};

const resolveStakeDepositNavigation = (
  state: RootState,
): StakeDevNavigationResult => {
  const earnTokensData = earnSelectors.selectEarnTokens(state);
  const depositToken = findDepositToken(earnTokensData);

  if (!depositToken) {
    return {
      error: 'No earn deposit token found in wallet state',
    };
  }

  return {
    params: {
      screen: Routes.STAKING.STAKE,
      params: { token: depositToken },
    },
  };
};

const resolveStakeUnstakeNavigation = (
  state: RootState,
): StakeDevNavigationResult => {
  const earnTokensData = earnSelectors.selectEarnTokens(state);
  const unstakeToken = findUnstakeToken(state, earnTokensData);

  if (!unstakeToken) {
    return {
      error: 'No earn withdraw token found in wallet state',
    };
  }

  return {
    params: {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: unstakeToken },
    },
  };
};

const resolveStakeEarningsHistoryNavigation = (
  state: RootState,
): StakeDevNavigationResult => {
  const earnTokensData = earnSelectors.selectEarnTokens(state);
  const asset = findUnstakeToken(state, earnTokensData);

  if (!asset) {
    return {
      error: 'No staked earn asset found in wallet state',
    };
  }

  return {
    params: {
      screen: Routes.STAKING.EARNINGS_HISTORY,
      params: { asset },
    },
  };
};

const getStakeDevNavigationHint = (
  routeId: string,
  state: RootState,
  earnTokensData: EarnTokensData,
): string | undefined => {
  switch (routeId) {
    case 'stake-screens-deposit':
      return findDepositToken(earnTokensData)
        ? undefined
        : 'Requires an earn-eligible token in wallet state';
    case 'stake-screens-unstake':
    case 'stake-screens-earnings-history':
      return findUnstakeToken(state, earnTokensData)
        ? undefined
        : 'Requires a staked earn token in wallet state';
    default:
      return undefined;
  }
};

const resolveStakeDevNavigation = (
  routeId: string,
  state: RootState,
): StakeDevNavigationResult | null => {
  switch (routeId) {
    case 'stake-screens-deposit':
      return resolveStakeDepositNavigation(state);
    case 'stake-screens-unstake':
      return resolveStakeUnstakeNavigation(state);
    case 'stake-screens-earnings-history':
      return resolveStakeEarningsHistoryNavigation(state);
    default:
      return null;
  }
};

type MoneyConfirmationPreviewType = 'deposit' | 'withdraw';

const resolveMoneyConfirmationPreview = (
  routeId: string,
): MoneyConfirmationPreviewType | null => {
  switch (routeId) {
    case 'money-confirmations-deposit':
      return 'deposit';
    case 'money-confirmations-withdraw':
      return 'withdraw';
    default:
      return null;
  }
};

const launchMoneyConfirmationHeaderPreview = (
  navigation: { navigate: (name: string, params?: object) => void },
  type: MoneyConfirmationPreviewType,
): void => {
  navigation.navigate(Routes.MONEY.CONFIRMATIONS_ROOT, {
    screen: MONEY_CONFIRMATION_HEADER_PREVIEW_ROUTE,
    params: { variant: type },
  });
};

const isRouteAvailable = (
  requirement: MainNavigatorDevRouteRequirement | undefined,
  flags: Record<MainNavigatorDevRouteRequirement, boolean>,
): boolean => {
  if (!requirement) {
    return true;
  }

  return flags[requirement];
};

const getUnavailableReason = (
  requirement: MainNavigatorDevRouteRequirement | undefined,
): string | undefined => {
  switch (requirement) {
    case 'money':
      return 'Requires moneyAccount feature flag';
    case 'perps':
      return 'Requires perps feature flag';
    case 'predict':
      return 'Requires predict feature flag';
    case 'marketInsights':
      return 'Requires marketInsights or marketInsightsPerps flag';
    case 'socialLeaderboard':
      return 'Requires socialLeaderboard feature flag';
    case 'nonProduction':
      return 'Only registered in non-production builds';
    ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
    case 'sampleFeature':
      return 'Sample feature build only';
    ///: END:ONLY_INCLUDE_IF
    default:
      return undefined;
  }
};

export const MainNavigatorDeveloperOptionsSection = () => {
  const navigation = useNavigation();
  const store = useStore<RootState>();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);
  const isMarketInsightsPerpsEnabled = useSelector(
    selectMarketInsightsPerpsEnabled,
  );
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const earnTokensData = useSelector(earnSelectors.selectEarnTokens);

  const requirementFlags = useMemo<
    Record<MainNavigatorDevRouteRequirement, boolean>
  >(
    () => ({
      money: isMoneyAccountEnabled,
      perps: isPerpsEnabled,
      predict: isPredictEnabled,
      marketInsights:
        isMarketInsightsEnabled || isMarketInsightsPerpsEnabled,
      socialLeaderboard: isSocialLeaderboardEnabled,
      nonProduction: process.env.METAMASK_ENVIRONMENT !== 'production',
      ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      sampleFeature: true,
      ///: END:ONLY_INCLUDE_IF
    }),
    [
      isMarketInsightsEnabled,
      isMarketInsightsPerpsEnabled,
      isMoneyAccountEnabled,
      isPerpsEnabled,
      isPredictEnabled,
      isSocialLeaderboardEnabled,
    ],
  );

  const handleRoutePress = useCallback(
    async (route: MainNavigatorDevRoute) => {
      try {
        const moneyConfirmationPreview = resolveMoneyConfirmationPreview(
          route.id,
        );

        if (moneyConfirmationPreview) {
          launchMoneyConfirmationHeaderPreview(
            navigation,
            moneyConfirmationPreview,
          );
          return;
        }

        const stakeNavigation = resolveStakeDevNavigation(
          route.id,
          store.getState(),
        );

        if (stakeNavigation) {
          if ('error' in stakeNavigation) {
            Logger.log(
              `MainNavigatorDeveloperOptionsSection: ${stakeNavigation.error}`,
            );
            return;
          }

          navigation.navigate(route.routeName, stakeNavigation.params);
          return;
        }

        if (route.params) {
          navigation.navigate(route.routeName, route.params);
          return;
        }

        navigation.navigate(route.routeName);
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          `MainNavigatorDeveloperOptionsSection: failed to navigate to ${route.routeName}`,
        );
      }
    },
    [navigation, store],
  );

  return (
    <View testID={'main-navigator-dev-options-section'}>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        Main Navigator Routes
      </Text>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        Preview every screen registered in MainNavigator before migrating to
        native stack.
      </Text>

      {MAIN_NAVIGATOR_DEV_ROUTE_GROUPS.map((group) => (
        <View key={group.title} style={styles.accessory}>
          <Text color={TextColor.TextDefault} variant={TextVariant.HeadingMd}>
            {group.title}
          </Text>
          {group.routes.map((route) => {
            const stakeHint = getStakeDevNavigationHint(
              route.id,
              store.getState(),
              earnTokensData,
            );
            const isAvailable =
              isRouteAvailable(route.requirement, requirementFlags) &&
              !stakeHint;
            const unavailableReason =
              stakeHint ?? getUnavailableReason(route.requirement);
            const buttonLabel = route.note
              ? `${route.label} (${route.note})`
              : route.label;

            return (
              <View key={route.id} style={styles.accessory}>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  isFullWidth
                  isDisabled={!isAvailable}
                  onPress={() => handleRoutePress(route)}
                  testID={`main-navigator-dev-route-${route.id}`}
                >
                  {buttonLabel}
                </Button>
                {!isAvailable && unavailableReason ? (
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodySm}
                    style={styles.desc}
                  >
                    {unavailableReason}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};
