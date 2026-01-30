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
import { useBalanceRefresh } from './hooks';

import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  StyleSheet as RNStyleSheet,
  View,
} from 'react-native';
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
import { getWalletNavbarOptions } from '../../UI/Navbar';
import Tokens from '../../UI/Tokens';

import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
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
import { useMetrics } from '../../../components/hooks/useMetrics';
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
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import {
  selectNetworkImageSource,
  selectNetworkName,
} from '../../../selectors/networkInfos';
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
import { PERFORMANCE_CONFIG } from '../../UI/Perps/constants/perpsConfig';
import ErrorBoundary from '../ErrorBoundary';

import { Token } from '@metamask/assets-controllers';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
import AccountGroupBalance from '../../UI/Assets/components/Balance/AccountGroupBalance';
import useCheckNftAutoDetectionModal from '../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../hooks/useCheckMultiRpcModal';
import { useMultichainAccountsIntroModal } from '../../hooks/useMultichainAccountsIntroModal';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import {
  selectUseTokenDetection,
  selectTokenNetworkFilter,
} from '../../../selectors/preferencesController';
import Logger from '../../../util/Logger';
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
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import {
  NetworkType,
  useNetworksByCustomNamespace,
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import {
  selectPerpsEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
} from '../../UI/Perps';
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
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../UI/Earn/constants/networks';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { createAddressListNavigationDetails } from '../../Views/MultichainAccounts/AddressList';
import NftGrid from '../../UI/NftGrid/NftGrid';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import { selectDisplayCardButton } from '../../../core/redux/slices/card';
import { usePna25BottomSheet } from '../../hooks/usePna25BottomSheet';
import { useSafeChains } from '../../hooks/useSafeChains';

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
  navigationParams?: {
    shouldSelectPerpsTab?: boolean;
    initialTab?: string;
  };
}

interface WalletRouteParams {
  openNetworkSelector?: boolean;
}

const WalletTokensTabView = forwardRef<
  WalletTokensTabViewHandle,
  WalletTokensTabViewProps
>((props, ref) => {
  const isPerpsFlagEnabled = useSelector(selectPerpsEnabledFlag);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
  const isPerpsEnabled = useMemo(
    () =>
      isPerpsFlagEnabled &&
      (isEvmSelected || isMultichainAccountsState2Enabled),
    [isPerpsFlagEnabled, isEvmSelected, isMultichainAccountsState2Enabled],
  );
  const isPredictFlagEnabled = useSelector(selectPredictEnabledFlag);
  const isPredictEnabled = useMemo(
    () => isPredictFlagEnabled,
    [isPredictFlagEnabled],
  );

  const {
    navigation,
    onChangeTab,
    defiEnabled,
    collectiblesEnabled,
    navigationParams,
  } = props;
  const route = useRoute<RouteProp<ParamListBase, string>>();
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

  // Calculate Perps tab visibility
  const perpsTabIndex = isPerpsEnabled ? 1 : -1;
  const isPerpsTabVisible = currentTabIndex === perpsTabIndex;

  // Calculate Predict tab visibility
  let predictTabIndex = -1;
  if (isPerpsEnabled && isPredictEnabled) {
    predictTabIndex = 2;
  } else if (isPredictEnabled) {
    predictTabIndex = 1;
  }
  const isPredictTabVisible = currentTabIndex === predictTabIndex;

  // Store the visibility update callback from PerpsTabView
  const perpsVisibilityCallback = useRef<((visible: boolean) => void) | null>(
    null,
  );

  // Update Perps visibility when tab changes
  useEffect(() => {
    if (isPerpsEnabled && perpsVisibilityCallback.current) {
      perpsVisibilityCallback.current(isPerpsTabVisible);
    }
  }, [currentTabIndex, perpsTabIndex, isPerpsTabVisible, isPerpsEnabled]);

  // Handle tab selection from navigation params (e.g., from deeplinks)
  // This uses useFocusEffect to ensure the tab selection happens when the screen receives focus
  useFocusEffect(
    useCallback(() => {
      // Check both navigationParams prop and route params for tab selection
      // Type assertion needed as route params are not strongly typed in navigation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = navigationParams || (route.params as any);
      const shouldSelectPerpsTab = params?.shouldSelectPerpsTab;
      const initialTab = params?.initialTab;

      if ((shouldSelectPerpsTab || initialTab === 'perps') && isPerpsEnabled) {
        // Calculate the index of the Perps tab
        // Tokens is always at index 0, Perps is at index 1 when enabled
        const targetPerpsTabIndex = 1;

        // Small delay ensures the TabsList is fully rendered before selection
        const timer = setTimeout(() => {
          tabsListRef.current?.goToTabIndex(targetPerpsTabIndex);

          // Clear the params to prevent re-selection on subsequent focuses
          // This is important for navigation state management
          if (navigation?.setParams) {
            navigation.setParams({
              shouldSelectPerpsTab: false,
              initialTab: undefined,
            });
          }
        }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);

        return () => clearTimeout(timer);
      }
    }, [route.params, isPerpsEnabled, navigationParams, navigation]),
  );

  // Build tabs array dynamically based on enabled features
  const tabsToRender = useMemo(() => {
    const tabs = [
      <Tokens ref={tokensRef} {...tokensTabProps} key={tokensTabProps.key} />,
    ];

    if (isPerpsEnabled) {
      tabs.push(
        <PerpsTabView
          {...perpsTabProps}
          key={perpsTabProps.key}
          isVisible={isPerpsTabVisible}
          onVisibilityChange={(callback) => {
            perpsVisibilityCallback.current = callback;
          }}
        />,
      );
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
    isPerpsTabVisible,
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
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const walletRef = useRef(null);
  const walletTokensTabViewRef = useRef<WalletTokensTabViewHandle>(null);
  const isMountedRef = useRef(true);
  const refreshInProgressRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshBalance } = useBalanceRefresh();
  const theme = useTheme();

  const isPerpsFlagEnabled = useSelector(selectPerpsEnabledFlag);
  const isPerpsGTMModalEnabled = useSelector(
    selectPerpsGtmOnboardingModalEnabledFlag,
  );

  const isPredictFlagEnabled = useSelector(selectPredictEnabledFlag);
  const isPredictGTMModalEnabled = useSelector(
    selectPredictGtmOnboardingModalEnabledFlag,
  );

  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;
  const dispatch = useDispatch();
  const { navigateToSendPage } = useSendNavigation();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

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
  const enabledNetworks = useSelector(selectEVMEnabledNetworks);

  const { enabledNetworks: allEnabledNetworks } = useCurrentNetworkInfo();
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);

  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const enabledNetworksHasTestNet = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (allEnabledNetworks.length === 1) {
        return allEnabledNetworks.some((network) => isTestNet(network.chainId));
      }
      return false;
    }
    return enabledNetworks.some((network) => isTestNet(network));
  }, [enabledNetworks, isMultichainAccountsState2Enabled, allEnabledNetworks]);

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

    if (isMultichainAccountsState2Enabled) {
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
          new Error(
            'Wallet::onReceive - Missing selectedAccountGroupId for state2',
          ),
        );
      }
    } else if (
      selectedInternalAccount?.address &&
      selectedAccountGroupId &&
      chainId
    ) {
      // Show address QR code for receiving funds
      navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: selectedInternalAccount.address,
          networkName: providerConfig?.nickname || 'Unknown Network',
          chainId,
          groupId: selectedAccountGroupId,
        },
      });
    } else {
      Logger.error(
        new Error('Wallet::onReceive - Missing required data for navigation'),
        {
          hasAddress: !!selectedInternalAccount?.address,
          hasGroupId: !!selectedAccountGroupId,
          hasChainId: !!chainId,
        },
      );
    }
  }, [
    trackEvent,
    createEventBuilder,
    isMultichainAccountsState2Enabled,
    navigate,
    selectedAccountGroupId,
    selectedInternalAccount,
    chainId,
    providerConfig,
  ]);

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

  const collectiblesEnabled = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (allEnabledNetworks.length === 1) {
        return isEvmSelected;
      }
      return true;
    }
    return isEvmSelected;
  }, [isMultichainAccountsState2Enabled, isEvmSelected, allEnabledNetworks]);

  const { isEnabled: getParticipationInMetaMetrics } = useMetrics();

  const isParticipatingInMetaMetrics = getParticipationInMetaMetrics();

  const currentToast = toastRef?.current;

  const hdKeyrings = useSelector(selectHDKeyrings);

  const accountName = useAccountName();
  const accountGroupName = useAccountGroupName();

  useSafeChains();

  const displayName = accountGroupName || accountName;
  useAccountsWithNetworkActivitySync();

  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const { networks: evmNetworks } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });

  const { networks: solanaNetworks } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Solana,
  });

  const selectedEvmAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const selectedSolanaAccount = useSelector(
    selectSelectedInternalAccountByScope,
  )(SolScope.Mainnet);

  const allNetworks = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (selectedEvmAccount && selectedSolanaAccount) {
        return [...evmNetworks, ...solanaNetworks];
      } else if (selectedEvmAccount) {
        return evmNetworks;
      } else if (selectedSolanaAccount) {
        return solanaNetworks;
      }
      return networks;
    }
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    selectedEvmAccount,
    selectedSolanaAccount,
    evmNetworks,
    solanaNetworks,
    networks,
  ]);

  const { selectNetwork } = useNetworkSelection({
    networks: allNetworks,
  });
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  // Track component mount state to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
  const selectedNetworkName = useSelector(selectNetworkName);

  const networkName =
    networkConfigurations?.[chainId]?.name ?? selectedNetworkName;

  const networkImageSource = useSelector(selectNetworkImageSource);
  const enabledEVMNetworks = useSelector(selectEVMEnabledNetworks);

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
   * Callback to trigger when pressing the navigation title.
   */
  const onTitlePress = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [navigate, chainId, trackEvent, createEventBuilder]);

  useFocusEffect(
    useCallback(() => {
      const shouldOpenNetworkSelector = (
        route.params as WalletRouteParams | undefined
      )?.openNetworkSelector;

      if (!shouldOpenNetworkSelector) {
        return;
      }

      const timer = setTimeout(() => {
        onTitlePress();
        if (navigation?.setParams) {
          navigation.setParams({ openNetworkSelector: false });
        }
      }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);

      return () => clearTimeout(timer);
    }, [navigation, onTitlePress, route.params]),
  );

  /**
   * Handle network filter called when app is mounted and tokenNetworkFilter is empty
   * TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
   */
  const handleNetworkFilter = useCallback(() => {
    // TODO: Come back possibly just add the chain id of the eth
    // network as the default state instead of doing this
    const { PreferencesController } = Engine.context;

    if (Object.keys(tokenNetworkFilter).length === 0) {
      PreferencesController.setTokenNetworkFilter({
        [chainId]: true,
      });
    }

    if (enabledEVMNetworks.length === 0) {
      selectNetwork(chainId);
    }
  }, [chainId, selectNetwork, enabledEVMNetworks, tokenNetworkFilter]);

  useEffect(() => {
    if (!isMultichainAccountsState2Enabled) {
      handleNetworkFilter();
    }
  }, [
    chainId,
    handleNetworkFilter,
    enabledEVMNetworks,
    isMultichainAccountsState2Enabled,
  ]);

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

  useEffect(
    () => {
      requestAnimationFrame(async () => {
        const { AccountTrackerController } = Engine.context;

        const networkClientIDs = Object.values(evmNetworkConfigurations)
          .map(
            ({ defaultRpcEndpointIndex, rpcEndpoints }) =>
              rpcEndpoints[defaultRpcEndpointIndex].networkClientId,
          )
          .filter((c) => Boolean(c));

        AccountTrackerController.refresh(networkClientIDs);
      });
    },
    /* eslint-disable-next-line */
    // TODO: The need of usage of this chainId as a dependency is not clear, we shouldn't need to refresh the native balances when the chainId changes. Since the pooling is always working in the back. Check with assets team.
    // TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
    [navigation, chainId, evmNetworkConfigurations],
  );

  const shouldDisplayCardButton = useSelector(selectDisplayCardButton);
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

  useEffect(() => {
    if (!selectedInternalAccount) return;
    navigation.setOptions(
      getWalletNavbarOptions(
        walletRef,
        selectedInternalAccount,
        displayName,
        networkName,
        networkImageSource,
        onTitlePress,
        navigation,
        colors,
        isNotificationEnabled,
        isBackupAndSyncEnabled,
        unreadNotificationCount,
        readNotificationCount,
        shouldDisplayCardButton,
      ),
    );
  }, [
    selectedInternalAccount,
    displayName,
    networkName,
    networkImageSource,
    onTitlePress,
    navigation,
    colors,
    isNotificationEnabled,
    isBackupAndSyncEnabled,
    unreadNotificationCount,
    readNotificationCount,
    shouldDisplayCardButton,
  ]);

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
        trackEvent(createEventBuilder(MetaMetricsEvents.WALLET_TOKENS).build());
      } else if (tabLabel === strings('wallet.defi')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.DEFI_TAB_SELECTED).build(),
        );
      } else if (tabLabel === strings('wallet.collectibles')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_COLLECTIBLES).build(),
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
    isEvmSelected &&
    !enabledNetworksHasTestNet &&
    basicFunctionalityEnabled &&
    assetsDefiPositionsEnabled;

  const scrollViewContentStyle = useMemo(
    () => [
      styles.wrapper,
      isHomepageRedesignV1Enabled && { flex: undefined, flexGrow: 0 },
    ],
    [styles.wrapper, isHomepageRedesignV1Enabled],
  );

  const handleRefresh = useCallback(async () => {
    // Prevent concurrent refreshes
    if (refreshInProgressRef.current) {
      return;
    }

    refreshInProgressRef.current = true;
    setRefreshing(true);

    try {
      await walletTokensTabViewRef.current?.refresh(refreshBalance);
    } catch (error) {
      Logger.error(error as Error, 'Error refreshing wallet');
    } finally {
      refreshInProgressRef.current = false;

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshBalance]);

  const content = (
    <>
      <AssetPollingProvider />
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

        <WalletTokensTabView
          ref={walletTokensTabViewRef}
          navigation={navigation}
          onChangeTab={onChangeTab}
          defiEnabled={defiEnabled}
          collectiblesEnabled={collectiblesEnabled}
          navigationParams={route.params}
        />
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
      <View style={baseStyles.flexGrow}>
        {selectedInternalAccount ? (
          <View
            style={styles.wrapper}
            testID={WalletViewSelectorsIDs.WALLET_CONTAINER}
          >
            <ConditionalScrollView
              isScrollEnabled={isHomepageRedesignV1Enabled}
              scrollViewProps={{
                contentContainerStyle: scrollViewContentStyle,
                showsVerticalScrollIndicator: false,
                refreshControl: isHomepageRedesignV1Enabled ? (
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
          </View>
        ) : (
          renderLoader()
        )}
      </View>
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
