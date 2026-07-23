import { AccountGroupId } from '@metamask/account-api';
import type { Theme } from '@metamask/design-tokens';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SectionRefreshHandle } from '../Homepage/types';

/** Matches HomepageDiscoveryTabs imperative handle (kept local for ADR-0020). */
interface WalletDiscoveryTabsRef {
  refresh: () => Promise<void>;
  goToPerpsTab: () => void;
}
import { useBalanceRefresh, useHomepageEntryPoint } from './hooks';

import {
  ActivityIndicator,
  DeviceEventEmitter,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet as RNStyleSheet,
  unstable_batchedUpdates,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Reanimated, {
  runOnUI,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { connect, useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { CONSENSYS_PRIVACY_POLICY } from '../../../constants/urls';
import { isPastPrivacyPolicyDate } from '../../../reducers/legalNotices';
import { shouldShowNewPrivacyToastSelector } from '../../../selectors/legalNotices';
import {
  storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction,
  storePrivacyPolicyShownDate as storePrivacyPolicyShownDateAction,
} from '../../../actions/legalNotices';
import StorageWrapper from '../../../store/storage-wrapper';
import { HOMEPAGE_APP_SESSION_ID } from '../../../util/analytics/homepageSessionId';
import { baseStyles } from '../../../styles/common';
import {
  PERPS_GTM_MODAL_SHOWN,
  PREDICT_GTM_MODAL_SHOWN,
} from '../../../constants/storage';
import HeaderRoot from '../../../component-library/components-temp/HeaderRoot';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import AddressCopy from '../../UI/AddressCopy';
import CardButton from '../../UI/Card/components/CardButton';
import { selectMoneyEnableMoneyAccountFlag } from '../../UI/Money/selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../UI/Money/selectors/eligibility';
import MoneyBalanceCard from '../../UI/Money/components/MoneyBalanceCard';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../AccountSelector';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Button as MMDSButton,
  ButtonVariant as MMDSButtonVariant,
  ButtonSize as MMDSButtonSize,
  ButtonIcon,
  ButtonIconSize,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
  Text as CustomText,
  TextColor,
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
import { RootState } from '../../../reducers';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectAccountBalanceByChainId } from '../../../selectors/accountTrackerController';
import {
  selectChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectShouldShowWalletHomeOnboardingSteps } from '../../../selectors/onboarding';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import { useTheme } from '../../../util/theme';
import { useAccountGroupName } from '../../hooks/multichainAccounts/useAccountGroupName';
import { useAccountName } from '../../hooks/useAccountName';
import { PERFORMANCE_CONFIG } from '@metamask/perps-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';

// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import Homepage from '../Homepage';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import HomepageDiscoveryTabs from '../Homepage/components/HomepageDiscoveryTabs';
import {
  HOMEPAGE_ACTION_BUTTONS_GRID_AB_KEY,
  HOMEPAGE_ACTION_BUTTONS_GRID_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_ACTION_BUTTONS_GRID_VARIANTS,
  HOMEPAGE_DISCOVERY_PILLS_AB_KEY,
  HOMEPAGE_DISCOVERY_PILLS_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_DISCOVERY_PILLS_VARIANTS,
  HUB_PAGE_DISCOVERY_TABS_AB_KEY,
  HUB_PAGE_DISCOVERY_TABS_VARIANTS,
  HubPageDiscoveryTabsVariant,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../Homepage/abTestConfig';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { HomepageDiscoveryPills } from '../Homepage/components/HomepageDiscoveryPills';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { HomepageActionButtonsGrid } from '../Homepage/components/HomepageActionButtonsGrid';
import { useABTest } from '../../../hooks';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { HomepageScrollContext } from '../Homepage/context/HomepageScrollContext';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { HomeSectionName } from '../Homepage/hooks/useHomeViewedEvent';
import AccountGroupBalance from '../../UI/Assets/components/Balance/AccountGroupBalance';
import useCheckNftAutoDetectionModal from '../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../hooks/useCheckMultiRpcModal';
import { useMultichainAccountsIntroModal } from '../../hooks/useMultichainAccountsIntroModal';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import Logger from '../../../util/Logger';
import BrazeBanner from '../../UI/BrazeBanner';
import ComponentErrorBoundary from '../../UI/ComponentErrorBoundary';
import { BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID } from '../../../core/Braze/constants';
import NetworkConnectionBanner from '../../UI/NetworkConnectionBanner';

import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AssetDetailsActions from '../AssetDetails/AssetDetailsActions';
import AppConstants from '../../../core/AppConstants';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import { suppressWalletHomeOnboardingSteps } from '../../../actions/onboarding';
import { useWalletHomeOnboardingChecklistTradePress } from '../../UI/WalletHomeOnboardingSteps/useWalletHomeOnboardingChecklistTradePress';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { setIsConnectionRemoved } from '../../../actions/user';
import { selectIsConnectionRemoved } from '../../../reducers/user';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import {
  selectPerpsEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
} from '../../UI/Perps';
import { PerpsAlwaysOnProvider } from '../../UI/Perps/providers/PerpsAlwaysOnProvider';
import {
  selectPredictEnabledFlag,
  selectPredictGtmOnboardingModalEnabledFlag,
} from '../../UI/Predict/selectors/featureFlags';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { InitSendLocation } from '../confirmations/constants/send';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';
import { Carousel } from '../../UI/Carousel';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAddressListNavigationDetails } from '../../Views/MultichainAccounts/AddressList';
import { AddressListViewedSource } from '../../../util/analytics/addressListViewedTracking';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import { usePna25BottomSheet } from '../../hooks/usePna25BottomSheet';
import { useSafeChains } from '../../hooks/useSafeChains';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useHomeGrowthBanner } from './hooks/useHomeGrowthBanner';

const createStyles = ({ colors }: Theme) =>
  RNStyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      flexDirection: 'column',
    },
    portfolioHeaderCluster: {
      flexDirection: 'column',
      gap: 16,
      paddingBottom: 12,
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
    headerActionButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    headerAccountPickerStyle: {
      marginRight: 16,
      backgroundColor: 'transparent',
    },
    accountGroupBalanceContainer: {
      marginBottom: 16,
    },
    walletHeaderRoot: {
      zIndex: 2,
    },
  });

interface WalletProps {
  navigation: NavigationProp<ParamListBase>;
  storePrivacyPolicyShownDate: () => void;
  shouldShowNewPrivacyToast: boolean;
  currentRouteName: string;
  storePrivacyPolicyClickedOrClosed: () => void;
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
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);
  const refreshInProgressRef = useRef(false);
  const shouldShowWalletHomeOnboardingSteps = useSelector(
    selectShouldShowWalletHomeOnboardingSteps,
  );

  const inWalletHomePostOnboardingFlow = shouldShowWalletHomeOnboardingSteps;

  const showWalletHomeMainActions = !inWalletHomePostOnboardingFlow;

  const [refreshing, setRefreshing] = useState(false);
  /** Pauses checklist Rive while Wallet finishes the coordinated post-onboarding handoff. */
  const [postOnboardingExitAnimating, setPostOnboardingExitAnimating] =
    useState(false);
  const walletHomePostOnboardingExitInProgressRef = useRef(false);
  const { refreshBalance } = useBalanceRefresh();
  const theme = useTheme();

  // ─── Homepage scroll context state ───────────────────────────────────────
  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerScreenY, setContainerScreenY] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const sharedHeaderHeight = useSharedValue(0);
  const walletHeaderTranslateY = useSharedValue(0);
  const insets = useSafeAreaInsets();
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
  // Max section index reached this visit (reset on each focus).
  const maxDepthThisVisitRef = useRef<number>(-1);
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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;
  const dispatch = useDispatch();
  const { navigateToSendPage } = useSendNavigation();

  const { popularEvmNetworks: evmChainIds } = useNetworkEnablement();

  /**
   * Object containing the balance of the current selected account
   */
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);

  /**
   * A string that represents the selected address
   */
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );
  const isMoneyAccountVisible =
    isMoneyAccountEnabled && isMoneyAccountGeoEligible;

  /**
   * Provider configuration for the current selected network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);

  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

  // Setup for AssetDetailsActions
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'MainView',
  });

  const onTradePrimaryPress =
    useWalletHomeOnboardingChecklistTradePress(goToSwaps);
  const handleWalletHomeOnboardingNotificationsPrimary = useCallback(() => {
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
    });
  }, [navigation]);

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

  /**
   * After the last-step checklist fade: complete the flow and show actions. Homepage uses
   * `WALLET_HOME_MAIN_BELOW_CLUSTER_LAYOUT` on the main column below the cluster.
   */
  const runWalletHomePostOnboardingComplete = useCallback(async () => {
    if (walletHomePostOnboardingExitInProgressRef.current) {
      return;
    }
    walletHomePostOnboardingExitInProgressRef.current = true;
    setPostOnboardingExitAnimating(true);

    try {
      unstable_batchedUpdates(() => {
        dispatch(suppressWalletHomeOnboardingSteps('flow_completed'));
      });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    } catch (error) {
      setPostOnboardingExitAnimating(false);
      walletHomePostOnboardingExitInProgressRef.current = false;
      throw error;
    }
    setPostOnboardingExitAnimating(false);
    walletHomePostOnboardingExitInProgressRef.current = false;
  }, [dispatch]);

  /** Navigation-only receive for AB treatment buttons (they own ACTION_BUTTON_CLICKED). */
  const onReceiveWithoutTracking = useCallback(() => {
    if (selectedAccountGroupId) {
      navigate(
        ...createAddressListNavigationDetails({
          groupId: selectedAccountGroupId as AccountGroupId,
          title: `${strings(
            'multichain_accounts.address_list.receiving_address',
          )}`,
          source: AddressListViewedSource.RECEIVE_BUTTON,
        }),
      );
    } else {
      Logger.error(
        new Error('Wallet::onReceive - Missing selectedAccountGroupId'),
      );
    }
  }, [navigate, selectedAccountGroupId]);

  const onReceive = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      button_label: strings('asset_overview.receive_button'),
      location: ActionLocation.HOME,
    });

    onReceiveWithoutTracking();
  }, [trackEvent, createEventBuilder, onReceiveWithoutTracking]);

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

  /** Navigation-only send for AB treatment buttons (they own ACTION_BUTTON_CLICKED). */
  const onSendWithoutTracking = useCallback(async () => {
    try {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
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

  const { isEnabled: getParticipationInMetaMetrics } = useAnalytics();

  const isParticipatingInMetaMetrics = getParticipationInMetaMetrics();

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

    const toast = toastRef?.current;
    storePrivacyPolicyShownDate();
    toast?.showToast({
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
          toast?.closeToast();
        },
      },
      linkButtonOptions: {
        label: strings(`privacy_policy.toast_read_more`),
        onPress: () => {
          storePrivacyPolicyClickedOrClosed();
          toast?.closeToast();
          Linking.openURL(CONSENSYS_PRIVACY_POLICY);
        },
      },
      hasNoTimeout: true,
    });
  }, [
    storePrivacyPolicyShownDate,
    shouldShowNewPrivacyToast,
    storePrivacyPolicyClickedOrClosed,
    toastRef,
  ]);

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );

  const homeGrowthBanner = useHomeGrowthBanner();

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

  const { variantName: discoveryTabsVariantName } = useABTest(
    HUB_PAGE_DISCOVERY_TABS_AB_KEY,
    HUB_PAGE_DISCOVERY_TABS_VARIANTS,
  );

  const { variant: discoveryPillsVariant } = useABTest(
    HOMEPAGE_DISCOVERY_PILLS_AB_KEY,
    HOMEPAGE_DISCOVERY_PILLS_VARIANTS,
    HOMEPAGE_DISCOVERY_PILLS_AB_TEST_EXPOSURE_OPTIONS,
  );

  const { variant: actionButtonsGridVariant } = useABTest(
    HOMEPAGE_ACTION_BUTTONS_GRID_AB_KEY,
    HOMEPAGE_ACTION_BUTTONS_GRID_VARIANTS,
    HOMEPAGE_ACTION_BUTTONS_GRID_AB_TEST_EXPOSURE_OPTIONS,
  );

  const isDiscoveryTabsTreatment =
    discoveryTabsVariantName === HubPageDiscoveryTabsVariant.Treatment;

  const discoveryPillsIconStyle = discoveryPillsVariant.iconStyle;
  const showDiscoveryPills =
    discoveryPillsVariant.showPills &&
    !isDiscoveryTabsTreatment &&
    showWalletHomeMainActions &&
    discoveryPillsIconStyle !== null;

  const isPerpsEnabled = isPerpsFlagEnabled;

  const homepageDiscoveryTabsRef = useRef<WalletDiscoveryTabsRef>(null);

  const handlePerpsTabDeepLink = useCallback(() => {
    if (isDiscoveryTabsTreatment) {
      homepageDiscoveryTabsRef.current?.goToPerpsTab();
      return;
    }
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'deeplink' },
    });
  }, [isDiscoveryTabsTreatment, navigation]);

  const handleNetworkSelectorDeepLink = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });
  }, [navigation]);

  useHomeDeepLinkEffects({
    navigation,
    isPerpsEnabled,
    onPerpsTabSelected: handlePerpsTabDeepLink,
    onNetworkSelectorSelected: handleNetworkSelectorDeepLink,
  });

  // translateY slides the header up; negative marginBottom collapses the layout
  // space it occupied so the content below moves up in sync.
  const animatedHeaderStyle = useAnimatedStyle(() => {
    const h = sharedHeaderHeight.value;
    return {
      transform: [{ translateY: walletHeaderTranslateY.value }],
      marginBottom: walletHeaderTranslateY.value,
      opacity: h > 0 ? Math.max(0, 1 + walletHeaderTranslateY.value / h) : 1,
    };
  });

  const handleWalletHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        setHeaderHeight(h);
        runOnUI((height: number) => {
          'worklet';
          sharedHeaderHeight.value = height;
        })(h);
      }
    },
    [sharedHeaderHeight],
  );

  const isFocused = useIsFocused();

  const homepageRef = useRef<SectionRefreshHandle>(null);

  // Notifies scroll subscribers directly (no React state update = no re-renders).
  const handleHomepageScroll = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollTickTimeRef.current >= 100) {
      lastScrollTickTimeRef.current = now;
      scrollSubscribersRef.current.forEach((cb) => cb());
    }
  }, []);

  const touchAreaSlop = useMemo(
    () => ({ top: 12, bottom: 12, left: 12, right: 12 }),
    [],
  );

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

  const handleActivityPress = useCallback(() => {
    trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ACTIVITY_CLICKED,
      ).build(),
    );
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [navigation, trackEvent]);

  const turnOnBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  const scrollViewContentStyle = useMemo(
    () => [
      styles.wrapper,
      { flex: undefined, flexGrow: 0, overflow: 'visible' as const },
    ],
    [styles.wrapper],
  );

  const handleRefresh = useCallback(async () => {
    // Prevent concurrent refreshes
    if (refreshInProgressRef.current) {
      return;
    }

    refreshInProgressRef.current = true;
    setRefreshing(true);

    const refreshHomepage = isDiscoveryTabsTreatment
      ? homepageDiscoveryTabsRef.current?.refresh()
      : homepageRef.current?.refresh();

    try {
      await Promise.all([refreshBalance(), refreshHomepage]);
    } catch (error) {
      Logger.error(error as Error, 'Error refreshing wallet');
    }

    refreshInProgressRef.current = false;

    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setRefreshing(false);
    }
  }, [refreshBalance, isDiscoveryTabsTreatment]);

  const subscribeToScroll = useCallback((cb: () => void) => {
    scrollSubscribersRef.current.add(cb);
    return () => scrollSubscribersRef.current.delete(cb);
  }, []);

  // Reset viewed sections and visit depth synchronously on focus, before the
  // new visitId propagates to child effects that re-add sections. A useEffect
  // on [visitId] runs after children's effects (React runs children before
  // parents), so sections would add themselves then the parent would clear
  // them — causing total_sections_viewed to always be 0 on the second+ visit.
  useFocusEffect(
    useCallback(() => {
      viewedSectionsRef.current.clear();
      maxDepthThisVisitRef.current = -1;
    }, []),
  );

  const notifySectionViewed = useCallback(
    (
      sectionName: HomeSectionName,
      sectionIndex: number,
      recordDepth: boolean,
    ) => {
      viewedSectionsRef.current.add(sectionName);
      // Only update depth for sections that required the user to scroll to them.
      // Non-rendered sections (sectionRef === null) pass recordDepth=false so they
      // are counted in total_sections_viewed without inflating depth metrics.
      if (recordDepth && sectionIndex > maxDepthThisVisitRef.current) {
        maxDepthThisVisitRef.current = sectionIndex;
      }
    },
    [],
  );

  const getViewedSectionCount = useCallback(
    () => viewedSectionsRef.current.size,
    [],
  );

  const getVisitMaxDepth = useCallback(() => maxDepthThisVisitRef.current, []);

  const homepageScrollContextValue = useMemo(
    () => ({
      subscribeToScroll,
      viewportHeight,
      containerScreenY,
      entryPoint,
      visitId,
      notifySectionViewed,
      getViewedSectionCount,
      getVisitMaxDepth,
      appSessionId: HOMEPAGE_APP_SESSION_ID,
    }),
    [
      subscribeToScroll,
      viewportHeight,
      containerScreenY,
      entryPoint,
      visitId,
      notifySectionViewed,
      getViewedSectionCount,
      getVisitMaxDepth,
    ],
  );

  const handleBannerError = useCallback(() => {
    // Log the error but don't block the UI
    Logger.error(new Error('Banner rendering error in wallet home'));
  }, []);

  const homeGrowthBannerContent =
    homeGrowthBanner === 'braze' ? (
      <ComponentErrorBoundary
        componentLabel="BrazeBanner"
        onError={handleBannerError}
      >
        <BrazeBanner placementId={BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID} />
      </ComponentErrorBoundary>
    ) : homeGrowthBanner === 'carousel' ? (
      <View accessible={false}>
        <Carousel style={styles.carousel} />
      </View>
    ) : null;

  const bannerContent = (
    <View style={styles.banner}>
      {!basicFunctionalityEnabled ? (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('wallet.banner.title')}
          description={
            <CustomText
              color={TextColor.InfoDefault}
              onPress={turnOnBasicFunctionality}
            >
              {strings('wallet.banner.link')}
            </CustomText>
          }
        />
      ) : null}
      <NetworkConnectionBanner />
    </View>
  );

  /** Same wiring as legacy `content` cluster — homepage v1 header paths must hide main actions and pass checklist callbacks. */
  const walletHomeAccountGroupBalanceProps = {
    onCoordinatedFlowExit: runWalletHomePostOnboardingComplete,
    suspendRiveForCurtain: postOnboardingExitAnimating,
    onTradePrimaryPress,
    onNotificationsPrimaryPress: handleWalletHomeOnboardingNotificationsPrimary,
  };

  const walletHomeMainAssetDetailsActions = showWalletHomeMainActions ? (
    actionButtonsGridVariant.layout === 'eightCircular' ? (
      <HomepageActionButtonsGrid
        onSend={onSendWithoutTracking}
        onReceive={onReceiveWithoutTracking}
        rowOrder={actionButtonsGridVariant.rowOrder}
      />
    ) : (
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
        containerTestID={WalletViewSelectorsIDs.ACTION_BUTTONS_CONTAINER}
      />
    )
  ) : null;

  const homepageDiscoveryPills = showDiscoveryPills ? (
    <HomepageDiscoveryPills iconStyle={discoveryPillsIconStyle} />
  ) : null;

  const libsodiumPocButton =
    process.env.METAMASK_ENVIRONMENT !== 'production' ? (
      <MMDSButton
        variant={MMDSButtonVariant.Secondary}
        size={MMDSButtonSize.Md}
        isFullWidth
        onPress={() => navigation.navigate(Routes.LIBSODIUM_POC)}
        testID="wallet-libsodium-poc-button"
      >
        libsodium POC
      </MMDSButton>
    ) : null;

  const portfolioHeaderBase = (
    <View style={styles.portfolioHeaderCluster}>
      {bannerContent}
      <AccountGroupBalance {...walletHomeAccountGroupBalanceProps} />
      {walletHomeMainAssetDetailsActions}
      {/* Hide growth banners when money account is enabled but user is geo-blocked */}
      {(!isMoneyAccountEnabled || isMoneyAccountGeoEligible) &&
        homeGrowthBannerContent}
      {homepageDiscoveryPills}
      {isMoneyAccountVisible && <MoneyBalanceCard />}
      {libsodiumPocButton}
    </View>
  );

  const portfolioHeader = (
    <View style={styles.portfolioHeaderCluster}>
      {bannerContent}
      <View style={styles.accountGroupBalanceContainer}>
        <AccountGroupBalance {...walletHomeAccountGroupBalanceProps} />
      </View>
      {walletHomeMainAssetDetailsActions}
      {/* Hide growth banners when money account is enabled but user is geo-blocked */}
      {(!isMoneyAccountEnabled || isMoneyAccountGeoEligible) &&
        homeGrowthBannerContent}
      {homepageDiscoveryPills}
      {isMoneyAccountVisible && <MoneyBalanceCard />}
      {libsodiumPocButton}
    </View>
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
          edges={{ top: 'additive' }}
          testID={WalletViewSelectorsIDs.WALLET_SAFE_AREA}
        >
          {selectedInternalAccount ? (
            <>
              <Reanimated.View
                style={
                  isDiscoveryTabsTreatment
                    ? [styles.walletHeaderRoot, animatedHeaderStyle]
                    : undefined
                }
              >
                <HeaderRoot
                  onLayout={
                    isDiscoveryTabsTreatment
                      ? handleWalletHeaderLayout
                      : undefined
                  }
                  testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
                  style={undefined}
                  endAccessory={
                    <View
                      style={styles.headerActionButtonsContainer}
                      accessible={false}
                    >
                      {isMoneyAccountVisible && (
                        <ButtonIcon
                          iconProps={{
                            color: MMDSIconColor.IconDefault,
                          }}
                          onPress={handleActivityPress}
                          iconName={MMDSIconName.Clock}
                          size={ButtonIconSize.Md}
                          testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
                          hitSlop={touchAreaSlop}
                        />
                      )}
                      <AddressCopy
                        testID={
                          WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON
                        }
                        hitSlop={touchAreaSlop}
                      />
                      {!isMoneyAccountVisible && (
                        <CardButton
                          onPress={handleCardPress}
                          touchAreaSlop={touchAreaSlop}
                        />
                      )}
                      {isNotificationsFeatureEnabled() ? (
                        <BadgeWrapper
                          position={BadgeWrapperPosition.TopRight}
                          positionAnchorShape={
                            BadgeWrapperPositionAnchorShape.Circular
                          }
                          badge={
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
                  }
                  twClassName="pl-1 pr-3"
                >
                  <PickerAccount
                    ref={walletRef}
                    accountName={displayName}
                    onPress={() =>
                      navigation.navigate(
                        ...createAccountSelectorNavDetails({}),
                      )
                    }
                    testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
                    hitSlop={touchAreaSlop}
                    style={styles.headerAccountPickerStyle}
                  />
                </HeaderRoot>
              </Reanimated.View>
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
                {isFocused && <AssetPollingProvider chainIds={evmChainIds} />}
                <HomepageScrollContext.Provider
                  value={homepageScrollContextValue}
                >
                  {isDiscoveryTabsTreatment ? (
                    <HomepageDiscoveryTabs
                      ref={homepageDiscoveryTabsRef}
                      portfolioHeader={portfolioHeader}
                      onPortfolioScroll={handleHomepageScroll}
                      walletHeaderOffset={headerHeight + insets.top}
                      walletHeaderHeight={headerHeight}
                      walletHeaderTranslateY={walletHeaderTranslateY}
                      refreshControl={
                        <RefreshControl
                          colors={[colors.primary.default]}
                          tintColor={colors.icon.default}
                          refreshing={refreshing}
                          onRefresh={handleRefresh}
                        />
                      }
                    />
                  ) : (
                    <ConditionalScrollView
                      ref={scrollViewRef}
                      isScrollEnabled
                      scrollViewProps={{
                        testID: WalletViewSelectorsIDs.WALLET_SCROLL_VIEW,
                        contentContainerStyle: scrollViewContentStyle,
                        showsVerticalScrollIndicator: false,
                        onScroll: handleHomepageScroll,
                        scrollEventThrottle: 16,
                        refreshControl: (
                          <RefreshControl
                            colors={[colors.primary.default]}
                            tintColor={colors.icon.default}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                          />
                        ),
                      }}
                    >
                      {portfolioHeaderBase}
                      <Homepage ref={homepageRef} />
                    </ConditionalScrollView>
                  )}
                </HomepageScrollContext.Provider>
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
