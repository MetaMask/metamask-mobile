import { AccountGroupId } from '@metamask/account-api';
import type { Theme } from '@metamask/design-tokens';
import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { TabRefreshHandle, WalletTokensTabViewHandle } from './types';
import { useBalanceRefresh, useHomepageEntryPoint } from './hooks';

import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet as RNStyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { connect, useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import {
  TabsList,
  TabsListRef,
} from '../../../component-library/components-temp/Tabs';
import { CONSENSYS_PRIVACY_POLICY } from '../../../constants/urls';
import { isPastPrivacyPolicyDate } from '../../../reducers/legalNotices';
import { shouldShowNewPrivacyToastSelector } from '../../../selectors/legalNotices';
import {
  storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction,
  storePrivacyPolicyShownDate as storePrivacyPolicyShownDateAction,
} from '../../../actions/legalNotices';
import StorageWrapper from '../../../store/storage-wrapper';
import { baseStyles } from '../../../styles/common';
import {
  PERPS_GTM_MODAL_SHOWN,
  PREDICT_GTM_MODAL_SHOWN,
} from '../../../constants/storage';
import Tokens from '../../UI/Tokens';
import HeaderRoot from '../../../component-library/components-temp/HeaderRoot';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import AddressCopy from '../../UI/AddressCopy';
import CardButton from '../../UI/Card/components/CardButton';
import { createAccountSelectorNavDetails } from '../AccountSelector';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { SharedDeeplinkManager } from '../../../core/DeeplinkManager';
import { Authentication } from '../../../core';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  ButtonIcon,
  ButtonIconSize,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
} from '@metamask/design-system-react-native';

import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import CustomText, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ConditionalScrollView from '../../../component-library/components-temp/ConditionalScrollView';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../util/analytics/actionButtonTracking';
import Engine from '../../../core/Engine';
import { RootState } from '../../../reducers';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectAccountBalanceByChainId } from '../../../selectors/accountTrackerController';
import { selectIsBackupAndSyncEnabled } from '../../../selectors/identity';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNetworkClientId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import {
  getMetamaskNotificationsReadCount,
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import {
  selectAllDetectedTokensFlat,
  selectDetectedTokens,
} from '../../../selectors/tokensController';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';
import {
  getDecimalChainId,
  getIsNetworkOnboarded,
  isTestNet,
} from '../../../util/networks';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import { useTheme } from '../../../util/theme';
import { useAccountGroupName } from '../../hooks/multichainAccounts/useAccountGroupName';
import { useAccountName } from '../../hooks/useAccountName';
import usePrevious from '../../hooks/usePrevious';
import { PERFORMANCE_CONFIG } from '@metamask/perps-controller';
import ErrorBoundary from '../ErrorBoundary';

import { Token } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import {
  selectHomepageRedesignV1Enabled,
  selectHomepageSectionsV1Enabled,
} from '../../../selectors/featureFlagController/homepage';
import Homepage from '../Homepage';
import { SectionRefreshHandle } from '../Homepage/types';
import { HomepageScrollContext } from '../Homepage/context/HomepageScrollContext';
import AccountGroupBalance from '../../UI/Assets/components/Balance/AccountGroupBalance';
import useCheckNftAutoDetectionModal from '../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../hooks/useCheckMultiRpcModal';
import { useMultichainAccountsIntroModal } from '../../hooks/useMultichainAccountsIntroModal';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import Logger from '../../../util/Logger';
import { colorWithOpacity } from '../../../util/colors';
import { useNftDetection } from '../../hooks/useNftDetection';
import { Carousel } from '../../UI/Carousel';
import { TokenI } from '../../UI/Tokens/types';
import NetworkConnectionBanner from '../../UI/NetworkConnectionBanner';

import { selectAssetsDefiPositionsEnabled } from '../../../selectors/featureFlagController/assetsDefiPositions';
import { selectHDKeyrings } from '../../../selectors/keyringController';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import DeFiPositionsList from '../../UI/DeFiPositions/DeFiPositionsList';
import AssetDetailsActions from '../AssetDetails/AssetDetailsActions';
import AppConstants from '../../../core/AppConstants';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import { setIsConnectionRemoved } from '../../../actions/user';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { selectIsConnectionRemoved } from '../../../reducers/user';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import {
  selectPerpsEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
} from '../../UI/Perps';
import { PerpsAlwaysOnProvider } from '../../UI/Perps/providers/PerpsAlwaysOnProvider';
import PerpsTabView from '../../UI/Perps/Views/PerpsTabView';
import {
  selectPredictEnabledFlag,
  selectPredictGtmOnboardingModalEnabledFlag,
} from '../../UI/Predict/selectors/featureFlags';
import PredictTabView from '../../UI/Predict/views/PredictTabView';
import { InitSendLocation } from '../confirmations/constants/send';
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';
import { selectCarouselBannersFlag } from '../../UI/Carousel/selectors/featureFlags';
import { SolScope } from '@metamask/keyring-api';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { createAddressListNavigationDetails } from '../../Views/MultichainAccounts/AddressList';
import NftGrid from '../../UI/NftGrid/NftGrid';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import { selectDisplayCardButton } from '../../../core/redux/slices/card';
import { usePna25BottomSheet } from '../../hooks/usePna25BottomSheet';
import { useSafeChains } from '../../hooks/useSafeChains';
import { useAccountMenuEnabled } from '../../../selectors/featureFlagController/accountMenu/useAccountMenuEnabled';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';

const createStyles = ({ colors }: Theme) =>
  RNStyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      gap: 16,
      flexDirection: 'column',
    },
    tabContainer: {
      flex: 1,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    banner: {
      flexDirection: 'column',
      gap: 16,
      paddingHorizontal: 16,
    },
    carousel: {
      overflow: 'hidden', // Allow for smooth height animations
    },
    bottomFadeOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 40,
    },
    headerEndAccessoryContainer: {
      alignItems: 'flex-end',
    },
    headerActionButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    headerAccountPickerStyle: {
      marginRight: 16,
    },
  });

interface WalletProps {
  navigation: NavigationProp<ParamListBase>;
  storePrivacyPolicyShownDate: () => void;
  shouldShowNewPrivacyToast: boolean;
  currentRouteName: string;
  storePrivacyPolicyClickedOrClosed: () => void;
}

interface WalletTokensTabViewProps {
  navigation: WalletProps['navigation'];
  onChangeTab: (changeTabProperties: {
    i: number;
    ref: React.ReactNode;
  }) => void;
  defiEnabled: boolean;
  collectiblesEnabled: boolean;
}

interface WalletRouteParams {
  openNetworkSelector?: boolean | null;
  shouldSelectPerpsTab?: boolean | null;
  initialTab?: string | null;
}

export const useHomeDeepLinkEffects = (opts: {
  isPerpsEnabled: boolean;
  onPerpsTabSelected: () => void;
  onNetworkSelectorSelected: () => void;
  navigation: NavigationProp<ParamListBase>;
}) => {
  const {
    isPerpsEnabled,
    onPerpsTabSelected,
    onNetworkSelectorSelected,
    navigation,
  } = opts;

  const route = useRoute<RouteProp<{ params: WalletRouteParams }, 'params'>>();

  // Handle tab selection from navigation params (e.g., from deeplinks)
  // This uses useFocusEffect to ensure the tab selection happens when the screen receives focus
  useFocusEffect(
    useCallback(() => {
      const params = route.params;

      const clearParams = () => {
        if (navigation?.setParams) {
          // React-Navigation shallow merges params, so we need to set each param to null to clear them
          const nullParams: Record<string, null> = {};
          Object.keys(params).forEach((key) => {
            nullParams[key] = null;
          });
          navigation.setParams(nullParams);
        }
      };

      const handleDelayedDeeplinkAction = (action: () => void) => {
        const timer = setTimeout(() => {
          // Call action
          action();

          // Clear all deeplink params
          clearParams();
          return;
        }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);

        return () => clearTimeout(timer);
      };

      // Perps Tab Selection Deeplink
      const shouldSelectPerpsTab = params?.shouldSelectPerpsTab;
      const initialTab = params?.initialTab;
      if ((shouldSelectPerpsTab || initialTab === 'perps') && isPerpsEnabled) {
        return handleDelayedDeeplinkAction(() => onPerpsTabSelected());
      }

      // Network Picker Deeplink
      if (params?.openNetworkSelector) {
        return handleDelayedDeeplinkAction(() => onNetworkSelectorSelected());
      }
    }, [
      route.params,
      isPerpsEnabled,
      navigation,
      onPerpsTabSelected,
      onNetworkSelectorSelected,
    ]),
  );
};

const WalletTokensTabView = forwardRef<
  WalletTokensTabViewHandle,
  WalletTokensTabViewProps
>((props, ref) => {
  const isPerpsFlagEnabled = useSelector(selectPerpsEnabledFlag);
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
  // With BIP-44 multichain accounts, perps is enabled for both EVM and non-EVM networks
  const isPerpsEnabled = isPerpsFlagEnabled;
  const isPredictFlagEnabled = useSelector(selectPredictEnabledFlag);
  const isPredictEnabled = useMemo(
    () => isPredictFlagEnabled,
    [isPredictFlagEnabled],
  );

  const { navigation, onChangeTab, defiEnabled, collectiblesEnabled } = props;

  const tabsListRef = useRef<TabsListRef>(null);
  const { enabledNetworks: allEnabledNetworks } = useCurrentNetworkInfo();

  const enabledNetworksIsSolana = useMemo(() => {
    if (allEnabledNetworks.length === 1) {
      return allEnabledNetworks.some(
        (network) => network.chainId === SolScope.Mainnet,
      );
    }
    return false;
  }, [allEnabledNetworks]);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Track current tab index for Perps visibility
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  // Refs for tab components that have refresh functionality
  const tokensRef = useRef<TabRefreshHandle>(null);
  const predictRef = useRef<TabRefreshHandle>(null);
  const nftsRef = useRef<TabRefreshHandle>(null);

  const tokensTabProps = useMemo(
    () => ({
      key: 'tokens-tab',
      tabLabel: strings('wallet.tokens'),
      navigation,
    }),
    [navigation],
  );

  const perpsTabProps = useMemo(
    () => ({
      key: 'perps-tab',
      tabLabel: strings('wallet.perps'),
      navigation,
    }),
    [navigation],
  );

  const predictTabProps = useMemo(
    () => ({
      key: 'predict-tab',
      tabLabel: strings('wallet.predict'),
      navigation,
    }),
    [navigation],
  );

  const defiPositionsTabProps = useMemo(
    () => ({
      key: 'defi-tab',
      tabLabel: strings('wallet.defi'),
      navigation,
    }),
    [navigation],
  );

  const nftsTabProps = useMemo(
    () => ({
      key: 'nfts-tab',
      tabLabel: strings('wallet.collectibles'),
      navigation,
    }),
    [navigation],
  );

  // Handle tab changes and track current index
  const handleTabChange = useCallback(
    (changeTabProperties: { i: number; ref: React.ReactNode }) => {
      setCurrentTabIndex(changeTabProperties.i);
      onChangeTab(changeTabProperties);
    },
    [onChangeTab],
  );

  // Build ordered list of tab refs based on which tabs are enabled
  // Returns null for tabs without refresh (Perps uses WebSocket, DeFi uses selectors)
  const getTabRefByIndex = useCallback(
    (index: number): React.RefObject<TabRefreshHandle> | null => {
      // Build array matching tab order: [tokens, perps?, predict?, defi?, nfts?]
      // Use null for tabs without refresh functionality
      const tabRefs: (React.RefObject<TabRefreshHandle> | null)[] = [tokensRef];

      if (isPerpsEnabled) {
        tabRefs.push(null); // Perps uses WebSocket streaming, no refresh needed
      }
      if (isPredictEnabled) {
        tabRefs.push(predictRef);
      }
      if (!enabledNetworksIsSolana) {
        if (defiEnabled) {
          tabRefs.push(null); // DeFi uses Redux selectors, no refresh needed
        }
        if (collectiblesEnabled) {
          tabRefs.push(nftsRef);
        }
      }

      return tabRefs[index] || null;
    },
    [
      isPerpsEnabled,
      isPredictEnabled,
      defiEnabled,
      collectiblesEnabled,
      enabledNetworksIsSolana,
    ],
  );

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: async (onBalanceRefresh: () => Promise<void>) => {
      const activeTabRef = getTabRefByIndex(currentTabIndex);

      // Always refresh balance + tab-specific content if available
      const promises = [
        onBalanceRefresh(),
        activeTabRef?.current?.refresh(),
      ].filter(Boolean);

      await Promise.all(promises);
    },
  }));

  // Calculate Predict tab visibility
  let predictTabIndex = -1;
  if (isPerpsEnabled && isPredictEnabled) {
    predictTabIndex = 2;
  } else if (isPredictEnabled) {
    predictTabIndex = 1;
  }
  const isPredictTabVisible = currentTabIndex === predictTabIndex;

  // Background preload perps market data when feature is enabled
  useEffect(() => {
    const controller = Engine.context.PerpsController;
    if (isPerpsEnabled) {
      controller.startMarketDataPreload();
    } else {
      controller.stopMarketDataPreload();
    }
    return () => controller.stopMarketDataPreload();
  }, [isPerpsEnabled]);

  // Handle deep link effects
  useHomeDeepLinkEffects({
    navigation,
    isPerpsEnabled,
    onPerpsTabSelected: () => {
      tabsListRef.current?.goToTabIndex(1);
    },
    onNetworkSelectorSelected: () => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.NETWORK_SELECTOR,
      });
    },
  });

  // Build tabs array dynamically based on enabled features
  const tabsToRender = useMemo(() => {
    const tabs = [
      <Tokens ref={tokensRef} {...tokensTabProps} key={tokensTabProps.key} />,
    ];

    if (isPerpsEnabled) {
      tabs.push(<PerpsTabView {...perpsTabProps} key={perpsTabProps.key} />);
    }

    if (isPredictEnabled) {
      tabs.push(
        <PredictTabView
          ref={predictRef}
          {...predictTabProps}
          key={predictTabProps.key}
          isVisible={isPredictTabVisible}
        />,
      );
    }

    if (enabledNetworksIsSolana) {
      return tabs;
    }

    if (defiEnabled) {
      tabs.push(
        <DeFiPositionsList
          {...defiPositionsTabProps}
          key={defiPositionsTabProps.key}
        />,
      );
    }

    if (collectiblesEnabled) {
      tabs.push(
        <NftGrid ref={nftsRef} {...nftsTabProps} key={nftsTabProps.key} />,
      );
    }

    return tabs;
  }, [
    tokensTabProps,
    isPerpsEnabled,
    perpsTabProps,
    isPredictEnabled,
    predictTabProps,
    isPredictTabVisible,
    defiEnabled,
    defiPositionsTabProps,
    collectiblesEnabled,
    nftsTabProps,
    enabledNetworksIsSolana,
  ]);

  // Create a key that changes when tab structure changes to force re-render
  const tabsKey = useMemo(() => {
    const enabledFeatures = [
      isPerpsEnabled ? 'perps' : '',
      isPredictEnabled ? 'predict' : '',
      defiEnabled ? 'defi' : '',
      collectiblesEnabled ? 'nfts' : '',
      enabledNetworksIsSolana ? 'solana' : '',
    ]
      .filter(Boolean)
      .join('-');
    return `tabs-${enabledFeatures}`;
  }, [
    isPerpsEnabled,
    isPredictEnabled,
    defiEnabled,
    collectiblesEnabled,
    enabledNetworksIsSolana,
  ]);

  return (
    <View style={styles.tabContainer}>
      <TabsList
        key={tabsKey}
        ref={tabsListRef}
        onChangeTab={handleTabChange}
        tabsListContentTwClassName={
          isHomepageRedesignV1Enabled ? '!flex-initial' : ''
        }
      >
        {tabsToRender}
      </TabsList>
    </View>
  );
});

WalletTokensTabView.displayName = 'WalletTokensTabView';

/**
 * Main view for the wallet
 */
const Wallet = ({
  navigation,
  storePrivacyPolicyShownDate,
  shouldShowNewPrivacyToast,
  storePrivacyPolicyClickedOrClosed,
}: WalletProps) => {
  const { navigate } = useNavigation();
  const walletRef = useRef(null);
  const walletTokensTabViewRef = useRef<WalletTokensTabViewHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);
  const refreshInProgressRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshBalance } = useBalanceRefresh();
  const theme = useTheme();

  // ─── Homepage scroll context state ───────────────────────────────────────
  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerScreenY, setContainerScreenY] = useState(0);
  const { entryPoint, visitId } = useHomepageEntryPoint(navigation);

  // Ref to the scroll container View — used to measure its absolute screen Y
  // position so the visibility check in sections can use correct bounds.
  const containerViewRef = useRef<View>(null);
  // Timestamp of the last scroll event — used for JS-level throttling.
  const lastScrollTickTimeRef = useRef(0);
  // Callbacks registered by sections to be notified of scroll events.
  // Using a ref+Set avoids any React state updates (and re-renders) on scroll.
  const scrollSubscribersRef = useRef<Set<() => void>>(new Set());
  // Tracks which sections have been viewed this visit (reset on each focus).
  const viewedSectionsRef = useRef<Set<string>>(new Set());
  const scrollContentHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const lastBottomFadeOpacityRef = useRef(0);
  const [bottomFadeOpacity, setBottomFadeOpacity] = useState(0);
  // ─────────────────────────────────────────────────────────────────────────

  const isPerpsFlagEnabled = useSelector(selectPerpsEnabledFlag);
  const isPerpsGTMModalEnabled = useSelector(
    selectPerpsGtmOnboardingModalEnabledFlag,
  );

  const isPredictFlagEnabled = useSelector(selectPredictEnabledFlag);
  const isPredictGTMModalEnabled = useSelector(
    selectPredictGtmOnboardingModalEnabledFlag,
  );

  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder, addTraitsToUser } = useAnalytics();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;
  const dispatch = useDispatch();
  const { navigateToSendPage } = useSendNavigation();

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const { popularEvmNetworks: evmChainIds } = useNetworkEnablement();

  /**
   * Object containing the balance of the current selected account
   */
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);

  /**
   * A string that represents the selected address
   */
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  /**
   * Provider configuration for the current selected network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);

  const { enabledNetworks: allEnabledNetworks } = useCurrentNetworkInfo();

  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

  const enabledNetworksHasTestNet = useMemo(() => {
    if (allEnabledNetworks.length === 1) {
      return allEnabledNetworks.some((network) => isTestNet(network.chainId));
    }
    return false;
  }, [allEnabledNetworks]);

  const prevChainId = usePrevious(chainId);

  // Setup for AssetDetailsActions
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'MainView',
  });

  // Hook for handling non-EVM asset sending
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const { sendNonEvmAsset } = useSendNonEvmAsset({
    asset: {
      chainId: chainId as string,
      address: undefined,
    },
  });
  ///: END:ONLY_INCLUDE_IF

  const displayBuyButton = true;
  const displaySwapsButton = AppConstants.SWAPS.ACTIVE;

  const onReceive = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      button_label: strings('asset_overview.receive_button'),
      location: ActionLocation.HOME,
    });

    if (selectedAccountGroupId) {
      navigate(
        ...createAddressListNavigationDetails({
          groupId: selectedAccountGroupId as AccountGroupId,
          title: `${strings(
            'multichain_accounts.address_list.receiving_address',
          )}`,
        }),
      );
    } else {
      Logger.error(
        new Error('Wallet::onReceive - Missing selectedAccountGroupId'),
      );
    }
  }, [trackEvent, createEventBuilder, navigate, selectedAccountGroupId]);

  const onSend = useCallback(async () => {
    try {
      trackActionButtonClick(trackEvent, createEventBuilder, {
        action_name: ActionButtonType.SEND,
        action_position: ActionPosition.THIRD_POSITION,
        button_label: strings('asset_overview.send_button'),
        location: ActionLocation.HOME,
      });

      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      // Try non-EVM first, if handled, return early
      const wasHandledAsNonEvm = await sendNonEvmAsset(
        InitSendLocation.HomePage,
      );
      if (wasHandledAsNonEvm) {
        return;
      }
      ///: END:ONLY_INCLUDE_IF

      navigateToSendPage({ location: InitSendLocation.HomePage });
    } catch (error) {
      console.error('Error initiating send flow:', error);
      navigateToSendPage({ location: InitSendLocation.HomePage });
    }
  }, [
    trackEvent,
    createEventBuilder,
    navigateToSendPage,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    sendNonEvmAsset,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  /**
   * Is basic functionality enabled
   */
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const assetsDefiPositionsEnabled = useSelector(
    selectAssetsDefiPositionsEnabled,
  );

  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const { isNetworkEnabledForDefi } = useCurrentNetworkInfo();

  const collectiblesEnabled = useMemo(() => {
    if (allEnabledNetworks.length === 1) {
      return isEvmSelected;
    }
    return true;
  }, [isEvmSelected, allEnabledNetworks]);

  const { isEnabled: getParticipationInMetaMetrics } = useAnalytics();

  const isParticipatingInMetaMetrics = getParticipationInMetaMetrics();

  const currentToast = toastRef?.current;

  const hdKeyrings = useSelector(selectHDKeyrings);

  const accountName = useAccountName();
  const accountGroupName = useAccountGroupName();

  useSafeChains();

  const displayName = accountGroupName || accountName;
  useAccountsWithNetworkActivitySync();

  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  // Track component mount state to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Listen for scroll-to-token events (e.g., after claiming mUSD rewards)
  // This handles scrolling in the homepage .map() mode where TokenList can't scroll directly
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'scrollToTokenIndex',
      ({ offset }: { index: number; offset: number }) => {
        // Add offset for content above tokens (balance, carousel, etc.)
        // Approximate: AccountGroupBalance (~200px) + Carousel (~150px) + padding
        const CONTENT_OFFSET_ABOVE_TOKENS = 400;
        scrollViewRef.current?.scrollTo({
          y: CONTENT_OFFSET_ABOVE_TOKENS + offset,
          animated: true,
        });
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // do not prompt for social login flow
    if (
      !isSocialLogin &&
      isDataCollectionForMarketingEnabled === null &&
      isParticipatingInMetaMetrics &&
      isPastPrivacyPolicyDate
    ) {
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.EXPERIENCE_ENHANCER,
      });
    }
  }, [
    isSocialLogin,
    isDataCollectionForMarketingEnabled,
    isParticipatingInMetaMetrics,
    navigate,
  ]);

  const checkAndNavigateToPerpsGTM = useCallback(async () => {
    const hasSeenModal = await StorageWrapper.getItem(PERPS_GTM_MODAL_SHOWN);

    if (hasSeenModal !== 'true') {
      navigate(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.GTM_MODAL,
      });
    }
  }, [navigate]);

  useEffect(() => {
    if (isPerpsFlagEnabled && isPerpsGTMModalEnabled) {
      checkAndNavigateToPerpsGTM();
    }
  }, [isPerpsFlagEnabled, isPerpsGTMModalEnabled, checkAndNavigateToPerpsGTM]);

  const checkAndNavigateToPredictGTM = useCallback(async () => {
    const hasSeenModal = await StorageWrapper.getItem(PREDICT_GTM_MODAL_SHOWN);

    if (hasSeenModal !== 'true') {
      navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.GTM_MODAL,
      });
    }
  }, [navigate]);

  useEffect(() => {
    if (isPredictFlagEnabled && isPredictGTMModalEnabled) {
      checkAndNavigateToPredictGTM();
    }
  }, [
    isPredictFlagEnabled,
    isPredictGTMModalEnabled,
    checkAndNavigateToPredictGTM,
  ]);

  useEffect(() => {
    addTraitsToUser({
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: hdKeyrings.length,
    });
  }, [addTraitsToUser, hdKeyrings.length]);

  const isConnectionRemoved = useSelector(selectIsConnectionRemoved);

  useEffect(() => {
    if (isConnectionRemoved && isSocialLogin) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings('connection_removed_modal.title'),
          description: strings('connection_removed_modal.content'),
          primaryButtonLabel: strings('connection_removed_modal.tryAgain'),
          type: 'error',
          icon: IconName.Danger,
          iconColor: IconColor.Warning,
          isInteractable: false,
          closeOnPrimaryButtonPress: true,
          onPrimaryButtonPress: () => {
            dispatch(setIsConnectionRemoved(false));
          },
        },
      });
    }
  }, [navigation, isConnectionRemoved, dispatch, isSocialLogin]);

  useEffect(() => {
    if (!shouldShowNewPrivacyToast) return;

    storePrivacyPolicyShownDate();
    currentToast?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings(`privacy_policy.toast_message`),
          isBold: false,
        },
      ],
      closeButtonOptions: {
        label: strings(`privacy_policy.toast_action_button`),
        variant: ButtonVariants.Primary,
        onPress: () => {
          storePrivacyPolicyClickedOrClosed();
          currentToast?.closeToast();
        },
      },
      linkButtonOptions: {
        label: strings(`privacy_policy.toast_read_more`),
        onPress: () => {
          storePrivacyPolicyClickedOrClosed();
          currentToast?.closeToast();
          Linking.openURL(CONSENSYS_PRIVACY_POLICY);
        },
      },
      hasNoTimeout: true,
    });
  }, [
    storePrivacyPolicyShownDate,
    shouldShowNewPrivacyToast,
    storePrivacyPolicyClickedOrClosed,
    currentToast,
  ]);

  /**
   * Network onboarding state
   */
  const networkOnboardingState = useSelector(
    (state: RootState) => state.networkOnboarded.networkOnboardedState,
  );

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );

  const readNotificationCount = useSelector(getMetamaskNotificationsReadCount);

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const isPopularNetworks = useSelector(selectIsPopularNetwork);
  const detectedTokens = useSelector(selectDetectedTokens) as TokenI[];
  const isCarouselBannersEnabled = useSelector(selectCarouselBannersFlag);

  const allDetectedTokens = useSelector(
    selectAllDetectedTokensFlat,
  ) as TokenI[];
  const currentDetectedTokens =
    isAllNetworks && isPopularNetworks ? allDetectedTokens : detectedTokens;
  const selectedNetworkClientId = useSelector(selectNetworkClientId);

  const isAccountMenuEnabled = useAccountMenuEnabled();
  const { detectNfts } = useNftDetection();

  /**
   * Shows Nft auto detect modal if the user is on mainnet, never saw the modal and have nft detection off
   */
  useCheckNftAutoDetectionModal();

  /**
   * Show multi rpc modal if there are networks duplicated and if never showed before
   */
  useCheckMultiRpcModal();

  /**
   * Show multichain accounts intro modal if state 2 is enabled and never showed before
   */
  useMultichainAccountsIntroModal();

  /**
   * Show PNA25 bottom sheet if remote feature flag is enabled and never showed before
   */
  usePna25BottomSheet();

  /**
   * Check to see if notifications are enabled
   */
  useEffect(() => {
    async function checkIfNotificationsAreEnabled() {
      await NotificationsService.isDeviceNotificationEnabled();
    }
    checkIfNotificationsAreEnabled();
  });

  /**
   * Check to see if we need to show What's New modal
   */
  useEffect(() => {
    // TODO: [SOLANA] Revisit this before shipping, we need to check if this logic supports non evm networks
    const networkOnboarded = getIsNetworkOnboarded(
      chainId,
      networkOnboardingState,
    );

    if (!networkOnboarded && prevChainId !== chainId) {
      // Do not check since it will conflict with the onboarding and/or network onboarding
      return;
    }
  }, [
    navigation,
    chainId,
    // TODO: Is this providerConfig.rpcUrl needed in this useEffect dependencies?
    providerConfig.rpcUrl,
    networkOnboardingState,
    prevChainId,
    // TODO: Is this accountBalanceByChainId?.balance needed in this useEffect dependencies?
    accountBalanceByChainId?.balance,
  ]);

  const shouldDisplayCardButton = useSelector(selectDisplayCardButton);
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
  const isHomepageSectionsV1Enabled = useSelector(
    selectHomepageSectionsV1Enabled,
  );

  const isFocused = useIsFocused();

  const homepageRef = useRef<SectionRefreshHandle>(null);

  // Enable parent scroll when homepage redesign or sections feature flags are enabled
  const shouldEnableParentScroll =
    isHomepageRedesignV1Enabled || isHomepageSectionsV1Enabled;

  // Notifies scroll subscribers directly (no React state update = no re-renders).
  const handleHomepageScroll = useCallback(() => {
    if (!isHomepageSectionsV1Enabled) return;
    const now = Date.now();
    if (now - lastScrollTickTimeRef.current >= 100) {
      lastScrollTickTimeRef.current = now;
      scrollSubscribersRef.current.forEach((cb) => cb());
    }
  }, [isHomepageSectionsV1Enabled]);

  const handleScrollWithFade = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      scrollContentHeightRef.current = contentSize.height;
      scrollYRef.current = contentOffset.y;
      handleHomepageScroll();
      if (!isHomepageSectionsV1Enabled) return;
      const remaining =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      const nextOpacity = remaining > 20 ? Math.min(1, remaining / 80) : 0;
      if (Math.abs(nextOpacity - lastBottomFadeOpacityRef.current) > 0.05) {
        lastBottomFadeOpacityRef.current = nextOpacity;
        setBottomFadeOpacity(nextOpacity);
      }
    },
    [handleHomepageScroll, isHomepageSectionsV1Enabled],
  );

  const handleScrollContentSizeChange = useCallback(
    (_w: number, contentHeight: number) => {
      scrollContentHeightRef.current = contentHeight;
      if (!isHomepageSectionsV1Enabled || viewportHeight <= 0) return;
      const remaining = contentHeight - scrollYRef.current - viewportHeight;
      const nextOpacity = remaining > 20 ? Math.min(1, remaining / 80) : 0;
      if (Math.abs(nextOpacity - lastBottomFadeOpacityRef.current) > 0.05) {
        lastBottomFadeOpacityRef.current = nextOpacity;
        setBottomFadeOpacity(nextOpacity);
      }
    },
    [isHomepageSectionsV1Enabled, viewportHeight],
  );

  const touchAreaSlop = useMemo(
    () => ({ top: 12, bottom: 12, left: 12, right: 12 }),
    [],
  );

  const onScanSuccess = useCallback(
    (data: { private_key?: string; seed?: string }, content: string) => {
      if (data.private_key) {
        Alert.alert(
          strings('wallet.private_key_detected'),
          strings('wallet.do_you_want_to_import_this_account'),
          [
            {
              text: strings('wallet.cancel'),
              onPress: () => false,
              style: 'cancel',
            },
            {
              text: strings('wallet.yes'),
              onPress: async () => {
                try {
                  await Authentication.importAccountFromPrivateKey(
                    data.private_key as string,
                  );
                  navigation.navigate('ImportPrivateKeyView', {
                    screen: 'ImportPrivateKeySuccess',
                  });
                } catch {
                  Alert.alert(
                    strings('import_private_key.error_title'),
                    strings('import_private_key.error_message'),
                  );
                }
              },
            },
          ],
          { cancelable: false },
        );
      } else if (data.seed) {
        Alert.alert(
          strings('wallet.error'),
          strings('wallet.logout_to_import_seed'),
        );
      } else {
        setTimeout(() => {
          SharedDeeplinkManager.parse(content, {
            origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
          });
        }, 500);
      }
    },
    [navigation],
  );

  const openQRScanner = useCallback(() => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      onScanSuccess,
    });
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_QR_SCANNER,
      )
        .addProperties({ action: 'Wallet View', name: 'QR scanner' })
        .build(),
    );
  }, [navigation, onScanSuccess, trackEvent]);

  const handleNotificationOnPress = useCallback(() => {
    if (isNotificationEnabled && isNotificationsFeatureEnabled()) {
      navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NOTIFICATIONS_MENU_OPENED,
        )
          .addProperties({
            unread_count: unreadNotificationCount,
            read_count: readNotificationCount,
          })
          .build(),
      );
    } else {
      navigation.navigate(Routes.NOTIFICATIONS.OPT_IN_STACK);
      trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NOTIFICATIONS_ACTIVATED,
        )
          .addProperties({
            action_type: 'started',
            is_profile_syncing_enabled: isBackupAndSyncEnabled,
          })
          .build(),
      );
    }
  }, [
    isNotificationEnabled,
    isBackupAndSyncEnabled,
    unreadNotificationCount,
    readNotificationCount,
    navigation,
    trackEvent,
  ]);

  const handleHamburgerPress = useCallback(() => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS,
      )
        .addProperties({ action: 'Navigation Drawer', name: 'Settings' })
        .build(),
    );
    navigation.navigate(Routes.SETTINGS_VIEW);
  }, [navigation, trackEvent]);

  const handleCardPress = useCallback(() => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CARD_HOME_CLICKED,
      ).build(),
    );
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation, trackEvent]);

  const getTokenAddedAnalyticsParams = useCallback(
    ({ address, symbol }: { address: string; symbol: string }) => {
      try {
        return {
          token_address: address,
          token_symbol: symbol,
          chain_id: getDecimalChainId(chainId),
          source: 'Add token dropdown',
        };
      } catch (error) {
        Logger.error(
          error as Error,
          'SearchTokenAutocomplete.getTokenAddedAnalyticsParams',
        );
        return undefined;
      }
    },
    [chainId],
  );

  useEffect(() => {
    const importAllDetectedTokens = async () => {
      // If autodetect tokens toggle is OFF, return
      if (!isTokenDetectionEnabled) {
        return;
      }
      const { TokensController } = Engine.context;
      if (
        Array.isArray(currentDetectedTokens) &&
        currentDetectedTokens.length > 0
      ) {
        // Group tokens by their `chainId` using a plain object
        const tokensByChainId: Record<Hex, Token[]> = {};

        for (const token of currentDetectedTokens) {
          // TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
          const tokenChainId: Hex =
            (token as TokenI & { chainId: Hex }).chainId ?? chainId;

          if (!tokensByChainId[tokenChainId]) {
            tokensByChainId[tokenChainId] = [];
          }

          tokensByChainId[tokenChainId].push(token);
        }

        // Process grouped tokens in parallel
        const importPromises = Object.entries(tokensByChainId).map(
          async ([networkId, allTokens]) => {
            const chainConfig = evmNetworkConfigurations[networkId as Hex];
            const { defaultRpcEndpointIndex } = chainConfig;
            const { networkClientId: networkInstanceId } =
              chainConfig.rpcEndpoints[defaultRpcEndpointIndex];

            await TokensController.addTokens(allTokens, networkInstanceId);
          },
        );

        await Promise.all(importPromises);

        currentDetectedTokens.forEach(
          ({ address, symbol }: { address: string; symbol: string }) => {
            const analyticsParams = getTokenAddedAnalyticsParams({
              address,
              symbol,
            });

            if (analyticsParams) {
              trackEvent(
                createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
                  .addProperties({
                    token_address: address,
                    token_symbol: symbol,
                    chain_id: getDecimalChainId(chainId),
                    source: 'detected',
                  })
                  .build(),
              );
            }
          },
        );
      }
    };
    if (isEvmSelected) {
      importAllDetectedTokens();
    }
  }, [
    isEvmSelected,
    isTokenDetectionEnabled,
    evmNetworkConfigurations,
    chainId,
    currentDetectedTokens,
    selectedNetworkClientId,
    getTokenAddedAnalyticsParams,
    trackEvent,
    createEventBuilder,
  ]);

  const onChangeTab = useCallback(
    (obj: { i: number; ref: React.ReactNode }) => {
      const tabLabel =
        React.isValidElement(obj.ref) && obj.ref.props
          ? (obj.ref.props as { tabLabel?: string })?.tabLabel
          : '';
      if (tabLabel === strings('wallet.tokens')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_TOKENS)
            .addProperties({ action: 'Wallet View', name: 'Tokens' })
            .build(),
        );
      } else if (tabLabel === strings('wallet.defi')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.DEFI_TAB_SELECTED).build(),
        );
      } else if (tabLabel === strings('wallet.collectibles')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_COLLECTIBLES)
            .addProperties({ action: 'Wallet View', name: 'Collectibles' })
            .build(),
        );
        detectNfts();
      }
    },
    [trackEvent, createEventBuilder, detectNfts],
  );

  const turnOnBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  const defiEnabled =
    isNetworkEnabledForDefi &&
    !enabledNetworksHasTestNet &&
    basicFunctionalityEnabled &&
    assetsDefiPositionsEnabled;

  const scrollViewContentStyle = useMemo(
    () => [
      styles.wrapper,
      shouldEnableParentScroll && { flex: undefined, flexGrow: 0 },
    ],
    [styles.wrapper, shouldEnableParentScroll],
  );

  const handleRefresh = useCallback(async () => {
    // Prevent concurrent refreshes
    if (refreshInProgressRef.current) {
      return;
    }

    refreshInProgressRef.current = true;
    setRefreshing(true);

    try {
      if (isHomepageSectionsV1Enabled) {
        // Homepage sections mode - refresh homepage and balance
        await Promise.all([refreshBalance(), homepageRef.current?.refresh()]);
      } else {
        // Legacy tab mode
        await walletTokensTabViewRef.current?.refresh(refreshBalance);
      }
    } catch (error) {
      Logger.error(error as Error, 'Error refreshing wallet');
    } finally {
      refreshInProgressRef.current = false;

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshBalance, isHomepageSectionsV1Enabled]);

  const subscribeToScroll = useCallback((cb: () => void) => {
    scrollSubscribersRef.current.add(cb);
    return () => scrollSubscribersRef.current.delete(cb);
  }, []);

  // Reset viewed sections on each new visit so session summary starts fresh.
  useEffect(() => {
    viewedSectionsRef.current.clear();
  }, [visitId]);

  const notifySectionViewed = useCallback((sectionName: string) => {
    viewedSectionsRef.current.add(sectionName);
  }, []);

  const getViewedSectionCount = useCallback(
    () => viewedSectionsRef.current.size,
    [],
  );

  const homepageScrollContextValue = useMemo(
    () => ({
      subscribeToScroll,
      viewportHeight,
      containerScreenY,
      entryPoint,
      visitId,
      notifySectionViewed,
      getViewedSectionCount,
    }),
    [
      subscribeToScroll,
      viewportHeight,
      containerScreenY,
      entryPoint,
      visitId,
      notifySectionViewed,
      getViewedSectionCount,
    ],
  );

  const content = (
    <>
      <View style={styles.banner}>
        {!basicFunctionalityEnabled ? (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            title={strings('wallet.banner.title')}
            description={
              <CustomText
                color={TextColor.Info}
                onPress={turnOnBasicFunctionality}
              >
                {strings('wallet.banner.link')}
              </CustomText>
            }
          />
        ) : null}
        <NetworkConnectionBanner />
      </View>
      <>
        <AccountGroupBalance />

        <AssetDetailsActions
          displayBuyButton={displayBuyButton}
          displaySwapsButton={displaySwapsButton}
          goToSwaps={goToSwaps}
          onReceive={onReceive}
          onSend={onSend}
          buyButtonActionID={WalletViewSelectorsIDs.WALLET_BUY_BUTTON}
          swapButtonActionID={WalletViewSelectorsIDs.WALLET_SWAP_BUTTON}
          sendButtonActionID={WalletViewSelectorsIDs.WALLET_SEND_BUTTON}
          receiveButtonActionID={WalletViewSelectorsIDs.WALLET_RECEIVE_BUTTON}
        />

        {isCarouselBannersEnabled && <Carousel style={styles.carousel} />}

        {isHomepageSectionsV1Enabled ? (
          <>
            {isFocused && <AssetPollingProvider chainIds={evmChainIds} />}
            <HomepageScrollContext.Provider value={homepageScrollContextValue}>
              <Homepage ref={homepageRef} />
            </HomepageScrollContext.Provider>
          </>
        ) : (
          <>
            {isFocused && <AssetPollingProvider />}
            <WalletTokensTabView
              ref={walletTokensTabViewRef}
              navigation={navigation}
              onChangeTab={onChangeTab}
              defiEnabled={defiEnabled}
              collectiblesEnabled={collectiblesEnabled}
            />
          </>
        )}
      </>
    </>
  );
  const renderLoader = useCallback(
    () => (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    ),
    [styles],
  );

  return (
    <ErrorBoundary navigation={navigation} view="Wallet">
      <PerpsAlwaysOnProvider>
        <SafeAreaView
          style={[
            baseStyles.flexGrow,
            { backgroundColor: colors.background.default },
          ]}
          edges={{ bottom: 'additive' }}
          testID={WalletViewSelectorsIDs.WALLET_SAFE_AREA}
        >
          {selectedInternalAccount ? (
            <>
              <HeaderRoot
                includesTopInset
                testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
                endAccessory={
                  <View style={styles.headerEndAccessoryContainer}>
                    <View style={styles.headerActionButtonsContainer}>
                      <View
                        testID={
                          WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON
                        }
                      >
                        <AddressCopy hitSlop={touchAreaSlop} />
                      </View>
                      {shouldDisplayCardButton && (
                        <CardButton
                          onPress={handleCardPress}
                          touchAreaSlop={touchAreaSlop}
                        />
                      )}
                      {!isAccountMenuEnabled && (
                        <ButtonIcon
                          iconProps={{
                            color: MMDSIconColor.IconDefault,
                          }}
                          onPress={openQRScanner}
                          iconName={MMDSIconName.QrCode}
                          size={ButtonIconSize.Md}
                          testID={WalletViewSelectorsIDs.WALLET_SCAN_BUTTON}
                          hitSlop={touchAreaSlop}
                        />
                      )}
                      {isNotificationsFeatureEnabled() &&
                        !isAccountMenuEnabled && (
                          <BadgeWrapper
                            position={BadgeWrapperPosition.TopRight}
                            positionAnchorShape={
                              BadgeWrapperPositionAnchorShape.Circular
                            }
                            badge={
                              isNotificationEnabled &&
                              unreadNotificationCount > 0 ? (
                                <BadgeStatus
                                  status={BadgeStatusStatus.Active}
                                />
                              ) : null
                            }
                          >
                            <ButtonIcon
                              iconProps={{
                                color: MMDSIconColor.IconDefault,
                              }}
                              onPress={handleNotificationOnPress}
                              iconName={MMDSIconName.Notification}
                              size={ButtonIconSize.Md}
                              testID={
                                WalletViewSelectorsIDs.WALLET_NOTIFICATIONS_BUTTON
                              }
                              hitSlop={touchAreaSlop}
                            />
                          </BadgeWrapper>
                        )}
                      {isNotificationsFeatureEnabled() &&
                      isAccountMenuEnabled ? (
                        <BadgeWrapper
                          position={BadgeWrapperPosition.TopRight}
                          positionAnchorShape={
                            BadgeWrapperPositionAnchorShape.Circular
                          }
                          badge={
                            isNotificationsFeatureEnabled() &&
                            isNotificationEnabled &&
                            unreadNotificationCount > 0 ? (
                              <BadgeStatus
                                status={BadgeStatusStatus.Attention}
                              />
                            ) : null
                          }
                        >
                          <ButtonIcon
                            iconProps={{
                              color: MMDSIconColor.IconDefault,
                            }}
                            onPress={handleHamburgerPress}
                            iconName={MMDSIconName.Menu}
                            size={ButtonIconSize.Md}
                            testID={
                              WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON
                            }
                            hitSlop={touchAreaSlop}
                          />
                        </BadgeWrapper>
                      ) : (
                        <ButtonIcon
                          iconProps={{
                            color: MMDSIconColor.IconDefault,
                          }}
                          onPress={handleHamburgerPress}
                          iconName={MMDSIconName.Menu}
                          size={ButtonIconSize.Md}
                          testID={
                            WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON
                          }
                          hitSlop={touchAreaSlop}
                        />
                      )}
                    </View>
                  </View>
                }
                twClassName="pl-1 pr-3"
              >
                <PickerAccount
                  ref={walletRef}
                  accountName={displayName}
                  onPress={() =>
                    navigation.navigate(...createAccountSelectorNavDetails({}))
                  }
                  testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
                  hitSlop={touchAreaSlop}
                  style={styles.headerAccountPickerStyle}
                />
              </HeaderRoot>
              <View
                ref={containerViewRef}
                style={styles.wrapper}
                testID={WalletViewSelectorsIDs.WALLET_CONTAINER}
                onLayout={(e) => {
                  setViewportHeight(e.nativeEvent.layout.height);
                  containerViewRef.current?.measureInWindow((_x, y) => {
                    setContainerScreenY(y);
                  });
                }}
              >
                <ConditionalScrollView
                  ref={scrollViewRef}
                  isScrollEnabled={shouldEnableParentScroll}
                  scrollViewProps={{
                    testID: WalletViewSelectorsIDs.WALLET_SCROLL_VIEW,
                    contentContainerStyle: scrollViewContentStyle,
                    showsVerticalScrollIndicator: false,
                    onScroll: isHomepageSectionsV1Enabled
                      ? handleScrollWithFade
                      : undefined,
                    onContentSizeChange: isHomepageSectionsV1Enabled
                      ? handleScrollContentSizeChange
                      : undefined,
                    scrollEventThrottle: 16,
                    refreshControl: shouldEnableParentScroll ? (
                      <RefreshControl
                        colors={[colors.primary.default]}
                        tintColor={colors.icon.default}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                      />
                    ) : undefined,
                  }}
                >
                  {content}
                </ConditionalScrollView>
                {isHomepageSectionsV1Enabled && bottomFadeOpacity > 0 && (
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      colorWithOpacity(colors.background.default, 0),
                      colors.background.default,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                      styles.bottomFadeOverlay,
                      { opacity: bottomFadeOpacity },
                    ]}
                  />
                )}
              </View>
            </>
          ) : (
            renderLoader()
          )}
        </SafeAreaView>
      </PerpsAlwaysOnProvider>
    </ErrorBoundary>
  );
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapStateToProps = (state: any) => ({
  shouldShowNewPrivacyToast: shouldShowNewPrivacyToastSelector(state),
});

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDispatchToProps = (dispatch: any) => ({
  storePrivacyPolicyShownDate: () =>
    dispatch(storePrivacyPolicyShownDateAction(Date.now())),
  storePrivacyPolicyClickedOrClosed: () =>
    dispatch(storePrivacyPolicyClickedOrClosedAction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
