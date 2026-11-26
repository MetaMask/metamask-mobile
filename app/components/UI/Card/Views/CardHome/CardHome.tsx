import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, ScrollView, useWindowDimensions } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconColor,
  IconSize,
  Spinner,
  IconName as MMDSIconName,
  SegmentedControl,
  FilterButton,
} from '@metamask/design-system-react-native';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useApplePaySplashPrompt } from '../ApplePaySplash/useApplePaySplashPrompt';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import {
  CommonActions,
  StackActions,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Engine from '../../../../../core/Engine';
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  selectIsCardAuthenticated,
  selectHasCard,
  selectCardLastUnauthenticatedReason,
  selectCardUserLocation,
  selectCardHomeDataStatus,
  selectCardRedemptionDestinationIsMoneyAccount,
  selectMoneyAccountVedaTokenConfig,
  selectCardActiveProviderId,
  selectCardSelectedCountry,
  selectHasCompletedCardMigration,
} from '../../../../../selectors/cardController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { isMoneyAccountEntry } from '../../util/isMoneyAccountEntry';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import {
  getCardSupportEmail,
  getCardTermsAndConditionsUrl,
} from '../../util/registrationSettings';
import {
  CardStatus,
  FundingAssetStatus,
  CardProviderIds,
  type CardAction,
  type CardAlert,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  isCardUkMigrationEligible,
  selectMetalCardCheckoutFeatureFlag,
} from '../../../../../selectors/featureFlagController/card';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useCardPostAuthRedirect } from '../../hooks/useCardPostAuthRedirect';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import { useCardTransactionHistoryDestination } from '../../hooks/useCardTransactionHistoryDestination';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { useCardUkMigrationState } from '../../hooks/useCardUkMigrationState';
import { useCardUkMigrationUpdateBadge } from '../../hooks/useCardUkMigrationUpdateBadge';
import useCreditBalance from '../../hooks/useCreditBalance';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import MoneyMetaMaskCard from '../../../Money/components/MoneyMetaMaskCard';
import MoneyCardTiltAnimation from '../../../Money/components/MoneyCardTiltAnimation';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { AddToWalletButton } from '../../pushProvisioning/components/AddToWalletButton';
import type { WalletPassDevice } from '../../pushProvisioning/types';
import { CardScreenshotDeterrent } from '../../components/CardScreenshotDeterrent';
import Routes from '../../../../../constants/navigation/Routes';
import { TOKEN_RATE_UNDEFINED } from '../../../Tokens/constants';
import { CardType, CardMessageBoxType } from '../../types';
import {
  isSpendingLimitSupportedToken,
  IMMERSVE_SUPPORT_EMAIL,
  IMMERSVE_TERMS_URL,
} from '../../constants';
import { formatUkMigrationDeadline } from '../../utils/formatUkMigrationDeadline';
import { CardHomeSelectors } from './CardHome.testIds';
import CardAlertSection from './components/CardAlertSection';
import useSignedOutKycPending from './hooks/useSignedOutKycPending';
import {
  SETUP_ALERT_TYPES,
  resolveCardHomeWaitingState,
  type CardHomeWaitingState,
  type CardHomeWaitingStep,
} from './hooks/CardHomeWaitingState';
import useCardSetupPendingRefresh, {
  deriveCardHomeSetupPollIntervalMs,
} from './hooks/useCardSetupPendingRefresh';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import CardHomeStatusView, {
  CARD_HOME_WAITING_COPY,
  resolveCardHomeWaitingCopyStep,
} from './components/CardHomeStatusView';
import CardActionsButtons from './components/CardActionsButtons';
import CardBalanceDisplay from './components/CardBalanceDisplay';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import { formatWithThreshold } from '../../../../../util/assets';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import CardImageSection from './components/CardImageSection';
import CardImage from '../../components/CardImage';
import cardArtFallbackPng from '../../../../../images/mm_card_regular.png';
import ManageCardOptions from './components/ManageCardOptions';
import CardHomeLoadingSkeleton from './components/CardHomeLoadingSkeleton';
import CardHomeRecentActivity from './components/CardHomeRecentActivity';
import CardFreezeUnfreezeAnimation from '../../components/CardFreezeUnfreezeAnimation';
import { useCardRecentTransactions } from '../../hooks/useCardRecentTransactions';
import { cardQueries } from '../../queries';
import CardHomeActionButtonRow, {
  getCardHomeActionVisibility,
} from './components/CardHomeActionButtonRow';
import CardHomeMoreSheet from './components/CardHomeMoreSheet';
import { useIsGlassSurfaceEnabled } from '../../../../hooks/useIsGlassSurfaceEnabled';
import { selectMoneyBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/moneyBrandRefresh';
import { useCardArrivalAnimation } from './hooks/useCardArrivalAnimation';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import { useCardHomeActions } from './hooks/useCardHomeActions';
import { useCardHomeAnalytics } from './hooks/useCardHomeAnalytics';
import { useCardIntercomSupport } from './hooks/useCardIntercomSupport';
import { useCardWalletProvisioning } from './hooks/useCardWalletProvisioning';
import { getWalletTypeForPlatform } from '../../pushProvisioning/constants';
import { useCardEnableCard } from './hooks/useCardEnableCard';
import { deriveMoneyCardSetupPollIntervalMs } from '../../../Money/utils/moneyMetaMaskCardMode';
import { useCardRevokeAllowance } from './hooks/useCardRevokeAllowance';
import { useFundingAccountName } from '../../hooks/useFundingAccountName';
import useImmersveSupportedRegions from '../../hooks/useImmersveSupportedRegions';
import {
  CardActions,
  CardEntryPoint,
  CardFlow,
  CardScreens,
  buildCardMigrationBadgeReasons,
  mapUkMigrationPhaseToAnalytics,
  withCardProvider,
} from '../../util/metrics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

interface CardHomeRouteParams {
  showDeeplinkToast?: boolean;
  fromCardOnboarding?: boolean;
  /** Opened from the KYC timeout or pending notification while still in review. */
  fromKycPending?: boolean;
}

/** MMDS Button Lg height (h-12) and the CardHome px-4 gutter. */
const ADD_TO_WALLET_HEIGHT = 48;
const ADD_TO_WALLET_SIDE_PADDING = 16;

/** Local tabs under the action button row (active and frozen states only). */
enum CardHomeSegment {
  Activity = 'activity',
  Manage = 'manage',
}

const CardHome = () => {
  // --- Data ---
  const { data, isLoading, isError, refetch, primaryToken } = useCardHomeData();
  const capabilities = useCardCapabilities();
  const transactionHistoryDestination = useCardTransactionHistoryDestination();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const hasCard = useSelector(selectHasCard);
  const postAuthRedirect = useCardPostAuthRedirect();
  const lastUnauthenticatedReason = useSelector(
    selectCardLastUnauthenticatedReason,
  );
  const userLocation = useSelector(selectCardUserLocation);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vedaConfig = useSelector(selectMoneyAccountVedaTokenConfig);
  const { data: registrationSettings } = useRegistrationSettings();
  const privacyMode = useSelector(selectPrivacyMode);
  const isMetalCardCheckoutEnabled = useSelector(
    selectMetalCardCheckoutFeatureFlag,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<{ params: CardHomeRouteParams }, 'params'>>();
  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { width: windowWidth } = useWindowDimensions();
  const [activeHomeSegment, setActiveHomeSegment] = useState<CardHomeSegment>(
    CardHomeSegment.Manage,
  );
  const handleRecentTransactionPress = useCallback(
    (transaction: CardTransaction) => {
      navigation.navigate(Routes.CARD.TRANSACTION_DETAILS, {
        transactionId: transaction.id,
        transaction,
      });
    },
    [navigation],
  );

  const isSwapEnabled = useIsSwapEnabledForPriorityToken(
    data?.primaryFundingAsset?.walletAddress,
  );

  const isFrozen = data?.card?.status === CardStatus.FROZEN;

  const activeProviderId = useSelector(selectCardActiveProviderId);
  const isImmersve = activeProviderId === CardProviderIds.Immersve;
  const { state: ukMigrationState, refresh: refreshUkMigrationState } =
    useCardUkMigrationState();
  const cardUpdateBadgeSeverity = useCardUkMigrationUpdateBadge();
  const hasCompletedMigration = useSelector(selectHasCompletedCardMigration);
  // Baanx UK migration uses account.countryOfResidence; Immersve regionCode is
  // irrelevant because Immersve users are never eligible.
  const migrationRegionCode =
    data?.account?.countryOfResidence ?? data?.card?.regionCode ?? null;
  const isUkMigrationEligible = isCardUkMigrationEligible(ukMigrationState, {
    providerId: activeProviderId,
    regionCode: migrationRegionCode,
    hasCompletedMigration,
  });
  const isUkMigrationForced =
    isUkMigrationEligible && ukMigrationState.phase === 'forced';
  const isUkMigrationSoft =
    isUkMigrationEligible && ukMigrationState.phase === 'soft';
  const selectedCountry = useSelector(selectCardSelectedCountry);
  const immersveLegalRegionCode = data?.card?.regionCode ?? selectedCountry;
  const {
    permanentDocuments: immersveLegalDocuments,
    isLoading: isImmersveLegalDocsLoading,
    error: immersveLegalDocsError,
    refetch: refetchImmersveLegalDocs,
  } = useImmersveSupportedRegions(immersveLegalRegionCode, {
    enabled: isImmersve && Boolean(immersveLegalRegionCode),
  });
  const immersveLegalDocsUnavailable = Boolean(
    isImmersve &&
      Boolean(immersveLegalRegionCode) &&
      !isImmersveLegalDocsLoading &&
      (immersveLegalDocsError || immersveLegalDocuments.length === 0),
  );
  const cardTermsAndConditionsUrl = useMemo(
    () =>
      isImmersve
        ? IMMERSVE_TERMS_URL
        : getCardTermsAndConditionsUrl(registrationSettings, userLocation),
    [isImmersve, registrationSettings, userLocation],
  );
  const supportEmail = useMemo(
    () =>
      isImmersve
        ? IMMERSVE_SUPPORT_EMAIL
        : getCardSupportEmail(registrationSettings, userLocation),
    [isImmersve, registrationSettings, userLocation],
  );
  const handleContactIntercomSupport = useCardIntercomSupport();

  // --- Extracted hooks ---
  const actions = useCardHomeActions({
    data,
    primaryToken,
    isFrozen,
    cardTermsAndConditionsUrl,
    capabilities,
  });

  const isBlocked = data?.card?.status === CardStatus.BLOCKED;

  const platformWallet = getWalletTypeForPlatform();
  const platformWalletSupported =
    platformWallet === 'apple_wallet'
      ? capabilities?.pushProvisioning?.applePay === true
      : capabilities?.pushProvisioning?.googlePay === true;
  const {
    initiateProvisioning,
    isProvisioning,
    isLoading: isPushProvisioningLoading,
    canAddToWallet,
    isCardInWallet,
    pendingVerificationDevices,
    canOpenInWallet,
    openInWallet,
    walletEntry,
  } = useCardWalletProvisioning(data, { platformWalletSupported });
  useApplePaySplashPrompt({
    canAddToWallet,
    isPushProvisioningLoading,
    countryCode: data?.walletProvisioning?.countryCode,
    cardProcessor: data?.walletProvisioning?.cardProcessor,
  });
  const pendingDevicesLabel = formatPendingDevices(pendingVerificationDevices);
  const handleOpenInWallet = useCallback(() => {
    openInWallet().catch(() => undefined);
  }, [openInWallet]);

  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const {
    canEnableCard,
    enableCard,
    provisioningView,
    isEnableCardPending,
    isProvisioningPollActive,
    recheck: recheckProvisioning,
  } = useCardEnableCard(data, {
    recheckOnFocus: true,
    // The waiting view re-checks a manual review on its own. The provisioning
    // poll follows the same network cadence as Money home: off when offline,
    // 15s on slow cellular, and 5s otherwise.
    kycReviewSelfCheck: true,
    pollIntervalMs: deriveMoneyCardSetupPollIntervalMs(
      hardwareTier,
      networkTier,
    ),
  });
  const isSetupReconciling = provisioningView === 'reconciling';

  // Still in identity review with no signed-in Card account: show the pending
  // banner and the waiting layout (no Add funds or card management).
  const isSignedOutKycPending = useSignedOutKycPending(
    route.params?.fromKycPending,
  );
  const alerts = useMemo<CardAlert[]>(() => {
    const dataAlerts = data?.alerts ?? [];
    if (
      !isSignedOutKycPending ||
      dataAlerts.some((a) => a.type === 'kyc_pending')
    ) {
      return dataAlerts;
    }
    return [{ type: 'kyc_pending', dismissable: false }, ...dataAlerts];
  }, [data?.alerts, isSignedOutKycPending]);

  const effectiveActions = useMemo<CardAction[]>(() => {
    if (isSignedOutKycPending) {
      return [];
    }
    const providerActions = data?.actions ?? [];
    return canEnableCard &&
      !providerActions.some((a) => a.type === 'enable_card')
      ? [...providerActions, { type: 'enable_card' }]
      : providerActions;
  }, [data?.actions, canEnableCard, isSignedOutKycPending]);

  const hasSetupActions = effectiveActions.some(
    (a) => a.type === 'enable_card',
  );

  // --- Money Account linkage ---
  const {
    canLink: canLinkMoneyAccount,
    startLinkFlow: startMoneyAccountLink,
    isLinking: isMoneyAccountLinkInProgress,
  } = useMoneyAccountCardLinkage();
  const { apyPercent: moneyAccountApyPercent } = useMoneyVaultApy();
  const credit = useCreditBalance();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const hasMetalCard = data?.card?.type === CardType.METAL;
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const redeemsToMoneyAccount = useSelector(
    selectCardRedemptionDestinationIsMoneyAccount,
  );
  const isCardAnalyticsReady =
    cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error';
  const handleLinkMoneyAccountCard = useCallback(
    () =>
      startMoneyAccountLink({
        screen: Routes.CARD.HOME,
        entrypoint: CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
      }),
    [startMoneyAccountLink],
  );

  useCardHomeAnalytics({
    data,
    isLoading,
    isError,
    hasSetupActions,
    balanceFormatted: primaryToken?.balanceFormatted,
    rawTokenBalance: primaryToken?.rawTokenBalance,
    rawFiatNumber: primaryToken?.rawFiatNumber,
  });

  const [showFreezeAnimation, setShowFreezeAnimation] = useState(false);
  // While the card is frozen, the Rive view holds the Freeze pose (no
  // timeout — the static art only returns after the unfreeze Melt plays
  // out). A card that loads already frozen also activates the animation.
  useEffect(() => {
    if (actions.freeze.isSuccess || actions.unfreeze.isSuccess) {
      setShowFreezeAnimation(true);
      // Only the unfreeze success schedules a return to static — the Melt
      // plays for ~3s before the card art swaps back.
      // Both mutations keep isSuccess after they settle, so key the return
      // to static off the card's current state, not off unfreeze.isSuccess.
      if (!isFrozen) {
        const timer = setTimeout(() => setShowFreezeAnimation(false), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [actions.freeze.isSuccess, actions.unfreeze.isSuccess, isFrozen]);

  // A card that loads already frozen activates the animation at mount.
  useEffect(() => {
    if (isFrozen && isAuthenticated && !isLoading) {
      setShowFreezeAnimation(true);
    }
  }, [isFrozen, isAuthenticated, isLoading]);

  const [isSpendingLimitWarningDismissed, setIsSpendingLimitWarningDismissed] =
    useState(false);
  const [
    isUkMigrationSoftBannerDismissed,
    setIsUkMigrationSoftBannerDismissed,
  ] = useState(false);

  const handleTogglePrivacy = useCallback((value: boolean) => {
    Engine.context.PreferencesController.setPrivacyMode(value);
  }, []);

  // --- Pull-to-refresh ---
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Refetch card data when the screen regains focus (e.g. after a swap) ---
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        return;
      }
      Engine.context.CardController.fetchCardHomeData();
    }, [isAuthenticated]),
  );

  // Logged-out visitors never see the dashboard. Defer until this screen is
  // focused: a provider switch during UK migration marks the user signed out
  // while SignUp is on top, and replacing from this background screen would
  // unmount that flow. The onboarding-token revocation path shows its own toast.
  useEffect(() => {
    if (
      !isFocused ||
      isAuthenticated ||
      // Redux trails the controller by one batch, so a login that just
      // navigated here can still read signed out.
      Engine.context.CardController.state.isAuthenticated ||
      isSignedOutKycPending ||
      lastUnauthenticatedReason === 'onboarding_token_revoked'
    ) {
      return;
    }

    if (hasCard) {
      navigation.dispatch(
        postAuthRedirect
          ? StackActions.replace(Routes.CARD.AUTHENTICATION, {
              postAuthRedirect,
            })
          : StackActions.replace(Routes.CARD.AUTHENTICATION),
      );
      return;
    }

    navigation.dispatch(StackActions.replace(Routes.CARD.WELCOME));
  }, [
    hasCard,
    isAuthenticated,
    isFocused,
    isSignedOutKycPending,
    lastUnauthenticatedReason,
    navigation,
    postAuthRedirect,
  ]);

  const hasHandledOnboardingTokenRevocation = useRef(false);
  useEffect(() => {
    if (
      lastUnauthenticatedReason !== 'onboarding_token_revoked' ||
      hasHandledOnboardingTokenRevocation.current
    ) {
      return;
    }

    hasHandledOnboardingTokenRevocation.current = true;
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: strings('card.card_home.onboarding_token_revoked'),
        },
      ],
      hasNoTimeout: false,
      iconName: IconName.Warning,
    });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Routes.CARD.AUTHENTICATION }],
      }),
    );
    Engine.context.CardController.clearLastUnauthenticatedReason();
  }, [lastUnauthenticatedReason, navigation, toastRef]);

  // --- Deeplink toast ---
  const hasShownDeeplinkToast = useRef(false);
  useEffect(() => {
    if (
      route.params?.showDeeplinkToast &&
      !hasShownDeeplinkToast.current &&
      toastRef?.current
    ) {
      hasShownDeeplinkToast.current = true;
      toastRef.current.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_button_already_enabled_toast') },
        ],
        hasNoTimeout: false,
        iconName: IconName.Info,
      });
    }
  }, [route.params?.showDeeplinkToast, toastRef]);

  // --- Freeze error toast ---
  useEffect(() => {
    if ((actions.freeze.error || actions.unfreeze.error) && toastRef?.current) {
      toastRef.current.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.card_home.manage_card_options.freeze_error'),
          },
        ],
        hasNoTimeout: false,
        iconName: IconName.Warning,
      });
    }
  }, [actions.freeze.error, actions.unfreeze.error, toastRef]);

  // --- Derived state ---
  const hasPrimaryFiat =
    !!primaryToken?.balanceFiat &&
    primaryToken.balanceFiat !== TOKEN_RATE_UNDEFINED &&
    primaryToken.rawFiatNumber !== undefined;

  const creditIncludedInBalance =
    hasPrimaryFiat && credit.hasCredit && credit.creditFiatNumber !== undefined;

  const balanceAmount = useMemo(() => {
    const { balanceFiat, balanceFormatted, rawFiatNumber } = primaryToken ?? {};

    if (!hasPrimaryFiat) {
      return balanceFormatted;
    }

    if (creditIncludedInBalance) {
      const combined = (rawFiatNumber ?? 0) + (credit.creditFiatNumber ?? 0);
      return formatWithThreshold(combined, 0.01, I18n.locale, {
        style: 'currency',
        currency: currentCurrency?.toUpperCase() || 'USD',
      });
    }

    return balanceFiat;
  }, [
    primaryToken,
    hasPrimaryFiat,
    creditIncludedInBalance,
    credit.creditFiatNumber,
    currentCurrency,
  ]);

  const refundFiatLabel = useMemo(() => {
    if (credit.creditFiatNumber !== undefined) {
      return formatWithThreshold(credit.creditFiatNumber, 0.01, I18n.locale, {
        style: 'currency',
        currency: currentCurrency?.toUpperCase() || 'USD',
      });
    }
    return `${credit.creditBalance} ${
      credit.creditCurrency?.toUpperCase() ?? ''
    }`.trim();
  }, [
    credit.creditFiatNumber,
    credit.creditBalance,
    credit.creditCurrency,
    currentCurrency,
  ]);

  const handleOpenCreditBalanceTooltip = useCallback(() => {
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.CREDIT_BALANCE_TOOLTIP,
      params: {
        moneyAccountAmount: primaryToken?.balanceFiat,
        refundAmount: refundFiatLabel,
        isMoneyAccount: !!primaryToken?.isMoneyAccountEntry,
      },
    });
  }, [
    navigation,
    primaryToken?.balanceFiat,
    primaryToken?.isMoneyAccountEntry,
    refundFiatLabel,
  ]);

  const handleOpenUkMigrationSheet = useCallback(() => {
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.UK_MIGRATION,
    });
  }, [navigation]);

  const handleUkMigrationBannerConfirm = useCallback(() => {
    const migrationPhase = mapUkMigrationPhaseToAnalytics(
      ukMigrationState.phase,
    );
    const badgeReasons = buildCardMigrationBadgeReasons(
      Boolean(cardUpdateBadgeSeverity),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.MIGRATION_ATTENTION_SET_UP_CARD_BUTTON,
            flow: CardFlow.MIGRATION,
            ...(migrationPhase ? { migration_phase: migrationPhase } : {}),
            ...(badgeReasons ? { badge_reasons: badgeReasons } : {}),
          }),
        )
        .build(),
    );
    handleOpenUkMigrationSheet();
  }, [
    activeProviderId,
    cardUpdateBadgeSeverity,
    createEventBuilder,
    handleOpenUkMigrationSheet,
    trackEvent,
    ukMigrationState.phase,
  ]);

  const ukMigrationSoftDeadlineLabel = useMemo(() => {
    if (!ukMigrationState.deadline) {
      return null;
    }
    return formatUkMigrationDeadline(ukMigrationState.deadline);
  }, [ukMigrationState.deadline]);

  const showUkMigrationSoftBanner =
    isUkMigrationSoft && !isUkMigrationSoftBannerDismissed;

  const hasOpenedUkMigrationSheet = useRef(false);
  const lastSettledWaitingStepRef = useRef<CardHomeWaitingStep | null>(null);
  useEffect(() => {
    if (!isUkMigrationSoft || hasOpenedUkMigrationSheet.current || isLoading) {
      return;
    }
    hasOpenedUkMigrationSheet.current = true;
    handleOpenUkMigrationSheet();
  }, [handleOpenUkMigrationSheet, isLoading, isUkMigrationSoft]);

  const hasSetupAlerts = alerts.some((a) => SETUP_ALERT_TYPES.has(a.type));

  const hasAlertOnlyState = hasSetupAlerts && effectiveActions.length === 0;

  // One derived waiting state for everything the card home is still waiting
  // on (identity in review, the card being created, the Immersve review and
  // reconcile checks, signed out while verification is pending). It drives
  // the re-check cadence below; the screen keeps the current layout for
  // every other state.
  const waitingState = useMemo<CardHomeWaitingState>(
    () =>
      resolveCardHomeWaitingState({
        isLoading,
        isUkMigrationForced,
        isAuthenticated,
        isSignedOutKycPending,
        hasDashboardActions: effectiveActions.length > 0,
        alerts,
        provisioningView,
      }),
    [
      isLoading,
      isUkMigrationForced,
      isAuthenticated,
      isSignedOutKycPending,
      effectiveActions,
      alerts,
      provisioningView,
    ],
  );
  useEffect(() => {
    if (waitingState.kind !== 'waiting') {
      lastSettledWaitingStepRef.current = null;
      return;
    }
    if (waitingState.step !== 'immersve-reconciling') {
      lastSettledWaitingStepRef.current = waitingState.step;
    }
  }, [waitingState]);

  // Re-checks while a pending state is up, so it moves on by itself: a
  // faster cadence while the card is being created, the slow one while
  // reviewing or reconciling. Foreground returns re-check immediately.
  // Offline: no fetch. Slow cellular: the rare 15s cadence. A fast or
  // unknown network keeps 3s while the card is being created and 15s in
  // review. Immersve's own 5s poll already covers the creating state, so
  // this interval stays off while that one is running.
  const { refreshRegistrationStatus } = useCardSetupPendingRefresh({
    isPending: waitingState.kind === 'waiting',
    isAuthenticated,
    isFocused,
    pollIntervalMs: deriveCardHomeSetupPollIntervalMs(
      hardwareTier,
      networkTier,
      waitingState.kind === 'waiting' && waitingState.step === 'creating-card',
    ),
    suspendSignedInPoll: isProvisioningPollActive,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshUkMigrationState();
    try {
      if (waitingState.kind === 'waiting') {
        // Re-check the thing being waited on: the Immersve reconcile for an
        // under-review status or a card that is still being created, and the
        // onboarding registration status when signed out. Everything else
        // waits on card home data itself.
        if (
          waitingState.step === 'immersve-review' ||
          waitingState.step === 'creating-card'
        ) {
          recheckProvisioning();
        }
        if (!isAuthenticated) {
          await refreshRegistrationStatus();
          return;
        }
      }
      // Activity rows live in their own query. Invalidating only refetches
      // the list while that segment is on screen.
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({
          queryKey: cardQueries.transactions.keys.all(),
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    refetch,
    refreshUkMigrationState,
    refreshRegistrationStatus,
    recheckProvisioning,
    waitingState,
    isAuthenticated,
    queryClient,
  ]);

  const showLinkMoneyAccountCta =
    canLinkMoneyAccount &&
    !isUkMigrationForced &&
    !isLoading &&
    !hasSetupActions &&
    !hasSetupAlerts;

  const showSpendingLimitProgress =
    isAuthenticated &&
    data?.primaryFundingAsset?.status === FundingAssetStatus.Limited &&
    isSpendingLimitSupportedToken(data?.primaryFundingAsset?.symbol) &&
    !hasSetupActions &&
    !isUkMigrationForced;

  const isSpendingLimitActive =
    data?.primaryFundingAsset?.status === FundingAssetStatus.Active;

  const hasPriorityTokenBalance = (primaryToken?.rawTokenBalance ?? 0) > 0;

  const canUnlinkMoneyAccount = useMemo(() => {
    if (!primaryToken?.isMoneyAccountEntry) return false;

    const tokenAddress = primaryToken.walletAddress?.toLowerCase();
    const activeAddress = primaryMoneyAccount?.address?.toLowerCase();
    return Boolean(tokenAddress && tokenAddress === activeAddress);
  }, [
    primaryMoneyAccount?.address,
    primaryToken?.isMoneyAccountEntry,
    primaryToken?.walletAddress,
  ]);

  const canRevokeAllowance = useCardRevokeAllowance(data);
  const fundingAccountName = useFundingAccountName();

  const fallbackFundingSourceSymbol = useMemo(() => {
    if (!canUnlinkMoneyAccount) return undefined;

    const primary = data?.primaryFundingAsset;
    const fallback = data?.fundingAssets.find((asset) => {
      const isDelegated =
        asset.status === FundingAssetStatus.Active ||
        asset.status === FundingAssetStatus.Limited;
      if (!isDelegated) return false;

      return (
        asset.address !== primary?.address ||
        asset.chainId !== primary?.chainId ||
        asset.walletAddress !== primary?.walletAddress
      );
    });

    if (!fallback) return undefined;

    return isMoneyAccountEntry(
      {
        address: fallback.address,
        stagingTokenAddress: fallback.stagingTokenAddress,
        caipChainId: fallback.chainId,
        symbol: fallback.symbol,
      },
      vedaConfig,
    )
      ? strings('money.metamask_card.unlink_card_sheet_another_money_account')
      : fallback.symbol;
  }, [
    canUnlinkMoneyAccount,
    data?.fundingAssets,
    data?.primaryFundingAsset,
    vedaConfig,
  ]);

  const headerHandlers = useCardHeaderHandlers('back');
  // Terms and Contact support live in a "More" sheet behind the header's
  // vertical-ellipsis button, the same button Money home uses (MoneyHeader).
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const moreButtonProps = useMemo(
    () => ({
      iconName: MMDSIconName.MoreVertical,
      onPress: () => setIsMoreSheetOpen(true),
      accessibilityLabel: strings('card.card_home.more_button_label'),
      testID: CardHomeSelectors.MORE_BUTTON,
      // Matches MoneyHeader: the default press fill covers the glass capsule.
      twClassName: 'bg-transparent',
    }),
    [],
  );

  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  // Same flag and tiles as the Money home action row, so both read alike.
  const isGlassSurface = useIsGlassSurfaceEnabled(
    selectMoneyBrandRefreshEnabled,
  );

  // Quick actions under the card art. Each keeps the gating of the list row
  // or button it replaced.
  const actionVisibility = getCardHomeActionVisibility({
    card: data?.card,
    capabilities,
    isAuthenticated,
    isLoading,
    hasSetupActions,
    hasAlertOnlyState,
    isManageHidden: isBlocked || isUkMigrationForced,
  });
  const showAddFundsAction =
    isAuthenticated &&
    !isLoading &&
    !isUkMigrationForced &&
    !hasSetupActions &&
    effectiveActions.some((a) => a.type === 'add_funds');
  const isCardDetailsVisible =
    (!!actions.cardDetailsImageUrl || !!actions.cardSensitiveDetails) &&
    isAuthenticated;
  const isFreezeLoading =
    actions.freeze.isPending || actions.unfreeze.isPending;
  const isCardDetailsLoading =
    actions.isCardDetailsLoading || actions.isSensitiveDetailsLoading;

  // The card-details reveal signal (also drives useCardArrivalAnimation):
  // the details flow occupies the card art while it loads or shows details.
  const isRevealingCardDetails =
    actions.isCardDetailsLoading ||
    actions.isSensitiveDetailsLoading ||
    Boolean(actions.cardSensitiveDetails) ||
    Boolean(actions.cardDetailsImageUrl);

  const arrival = useCardArrivalAnimation({
    fromCardOnboarding: !!route.params?.fromCardOnboarding,
    cardType: data?.card?.type,
    isRevealingCardDetails,
  });
  const reduceMotion = useReduceMotion();
  // Offline: no Rive, on every hardware tier. A low-end phone on a slow
  // cell connection skips it too. An unknown network keeps the animation.
  const allowCardRive =
    networkTier !== 'NONE' &&
    !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

  // The arrival reveal holds the card only until a Freeze or Unfreeze press
  // this visit; then the freeze file takes over so the ice or melt plays.
  const hasUsedFreezeThisVisit =
    actions.freeze.isPending ||
    actions.freeze.isSuccess ||
    actions.freeze.isError ||
    actions.unfreeze.isPending ||
    actions.unfreeze.isSuccess ||
    actions.unfreeze.isError;
  const arrivalHoldsCard = arrival.usesRiveCard && !hasUsedFreezeThisVisit;

  // The freeze file only contains the virtual face. Metal and physical cards,
  // a blocked card (which dims), and the arrival reveal keep their own art.
  // Setup reconciliation keeps the image skeleton.
  // Under Reduce Motion the animation would only show a still image, so the
  // card image (which dims a frozen card) is used and the .riv never loads.
  const showFreezeCardArt =
    allowCardRive &&
    !reduceMotion &&
    !arrivalHoldsCard &&
    !isSetupReconciling &&
    data?.card?.type === CardType.VIRTUAL &&
    data?.card?.status !== CardStatus.BLOCKED &&
    (showFreezeAnimation || (isAuthenticated && !isLoading));

  // Freezing or unfreezing while the card details are open closes them, so
  // the Freeze/Melt animation is what plays instead of the details. The
  // animation starts on the optimistic isFrozen flip, so this clears as the
  // request starts, not when it settles. Only the start transition clears —
  // details opened afterwards stay open.
  const wasFreezePendingRef = useRef(false);
  const wasUnfreezePendingRef = useRef(false);
  const { clearCardDetails } = actions;
  useEffect(() => {
    const freezeJustStarted =
      actions.freeze.isPending && !wasFreezePendingRef.current;
    const unfreezeJustStarted =
      actions.unfreeze.isPending && !wasUnfreezePendingRef.current;
    wasFreezePendingRef.current = actions.freeze.isPending;
    wasUnfreezePendingRef.current = actions.unfreeze.isPending;
    if ((freezeJustStarted || unfreezeJustStarted) && isRevealingCardDetails) {
      clearCardDetails();
    }
  }, [
    actions.freeze.isPending,
    actions.unfreeze.isPending,
    isRevealingCardDetails,
    clearCardDetails,
  ]);

  // Activity / Manage segments only in the active and frozen states of a
  // fully set-up card whose history is the provider feed. Money-history users
  // keep the management list with its history row, since the Activity panel
  // previews provider transactions only.
  const showHomeSegments =
    transactionHistoryDestination === 'card' &&
    !isLoading &&
    isAuthenticated &&
    (data?.card?.status === CardStatus.ACTIVE ||
      data?.card?.status === CardStatus.FROZEN) &&
    !hasSetupActions &&
    !hasSetupAlerts &&
    !hasAlertOnlyState &&
    !isUkMigrationForced;
  const showRecentActivity =
    showHomeSegments && activeHomeSegment === CardHomeSegment.Activity;
  const showManageOptions =
    !showHomeSegments || activeHomeSegment === CardHomeSegment.Manage;
  const {
    transactions: recentTransactions,
    isLoading: isRecentActivityLoading,
    error: recentActivityError,
    refetch: refetchRecentTransactions,
  } = useCardRecentTransactions({
    enabled: showRecentActivity && isFocused,
  });

  // Callers that open Card Home directly still leave when logged out.
  // Signed-out KYC review is the only layout this screen renders without a session.
  if (!isAuthenticated && !isSignedOutKycPending) {
    return null;
  }

  // Terms and Contact support live in a "More" sheet behind the header's
  // vertical-ellipsis button, the same button Money home uses (MoneyHeader).
  const moreSheet = isMoreSheetOpen ? (
    <CardHomeMoreSheet
      onClose={() => setIsMoreSheetOpen(false)}
      supportEmail={supportEmail}
      onContactSupport={handleContactIntercomSupport}
      legalDocuments={
        isImmersve && immersveLegalDocuments.length > 0
          ? immersveLegalDocuments
          : undefined
      }
      hideLegalDocuments={isImmersve && isImmersveLegalDocsLoading}
      showLegalDocumentsError={immersveLegalDocsUnavailable}
      onRetryLegalDocuments={
        immersveLegalDocsUnavailable
          ? () => {
              refetchImmersveLegalDocs().catch(() => {
                // Error surfaces via hook state / sheet retry UI.
              });
            }
          : undefined
      }
      onNavigateToCardTos={actions.navigateToCardTosPage}
    />
  ) : null;

  // --- Error state ---
  if (isError) {
    return (
      <Box twClassName="flex-1 bg-background-default">
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
        />
        <Box twClassName="flex-1 items-center justify-center gap-2">
          <Icon
            name={IconName.Forest}
            size={IconSize.Xl}
            color={IconColor.IconDefault}
          />
          <Text
            variant={TextVariant.HeadingSm}
            twClassName="text-text-alternative"
          >
            {strings('card.card_home.error_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative text-center px-12"
          >
            {strings('card.card_home.error_description')}
          </Text>
          <Box twClassName="pt-2">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              onPress={() => refetch()}
              testID={CardHomeSelectors.TRY_AGAIN_BUTTON}
            >
              {strings('card.card_home.try_again')}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // Ready-dashboard status banners (alerts, UK migration, blocked, Apple
  // Wallet verification pending). Shown under the header and above the
  // balance.
  const dashboardAlerts = alerts.filter(
    (a) =>
      !(
        a.type === 'close_to_spending_limit' &&
        (isSpendingLimitWarningDismissed || isUkMigrationForced)
      ),
  );
  const hasAlertSectionBanners = dashboardAlerts.some((a) => {
    if (a.type === 'close_to_spending_limit' || a.type === 'kyc_pending') {
      return true;
    }
    if (a.type === 'card_provisioning') {
      // Same rule as CardAlertSection, which renders nothing for these.
      return (
        provisioningView !== 'hidden' && provisioningView !== 'reconciling'
      );
    }
    return false;
  });
  const showVerificationPendingBanner =
    !isLoading && pendingDevicesLabel.length > 0 && !isUkMigrationForced;
  const hasDashboardBanners =
    hasAlertSectionBanners ||
    (isAuthenticated &&
      (showUkMigrationSoftBanner ||
        isUkMigrationForced ||
        isBlocked ||
        showVerificationPendingBanner));

  // --- Waiting view: identity in review, card being created, Immersve
  // review/reconcile checks, or signed out while verification is pending.
  if (waitingState.kind === 'waiting') {
    const waitingCopy =
      CARD_HOME_WAITING_COPY[
        resolveCardHomeWaitingCopyStep(
          waitingState.step,
          lastSettledWaitingStepRef.current,
        )
      ];
    return (
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1 bg-default')}
        testID={CardHomeSelectors.SETUP_PENDING_STATUS_VIEW}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
          title={strings('card.card_home.title')}
          endButtonIconProps={[moreButtonProps]}
        />
        <CardHomeStatusView
          asset={
            <Box
              // Dimmed: the card is not live yet, so the art reads as pending.
              twClassName="w-full opacity-50"
              testID={CardHomeSelectors.CARD_ART}
            >
              <CardImage
                type={data?.card?.type ?? CardType.VIRTUAL}
                status={CardStatus.ACTIVE}
              />
            </Box>
          }
          title={strings(waitingCopy.titleKey)}
          description={strings(waitingCopy.descriptionKey)}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              colors={[theme.colors.primary.default]}
              tintColor={theme.colors.icon.default}
              testID={CardHomeSelectors.SETUP_PENDING_REFRESH_CONTROL}
            />
          }
          primaryButton={
            isAuthenticated
              ? {
                  label: strings('card.card_home.done'),
                  onPress: () => navigation.goBack(),
                  testID: CardHomeSelectors.SETUP_PENDING_DONE_BUTTON,
                }
              : {
                  // Same sign-in route Card welcome uses for returning users.
                  label: strings('card.card_onboarding.login_button'),
                  onPress: () =>
                    navigation.navigate(Routes.CARD.AUTHENTICATION),
                  testID: CardHomeSelectors.SETUP_PENDING_LOG_IN_BUTTON,
                }
          }
        />
        {moreSheet}
      </SafeAreaView>
    );
  }

  // --- Main render ---
  return (
    <Box twClassName="flex-1 bg-background-default">
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
        // Shown whenever the old footer links showed (every non-loading state).
        endButtonIconProps={isLoading ? undefined : [moreButtonProps]}
      />
      <ScrollView
        style={tw.style('flex-1 bg-background-default')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        contentContainerStyle={tw.style('flex-grow pb-8')}
        testID={CardHomeSelectors.CARD_VIEW_TITLE}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary.default]}
            tintColor={theme.colors.icon.default}
          />
        }
      >
        {isLoading ? (
          <CardHomeLoadingSkeleton />
        ) : (
          <>
            {/* Status banners sit under the header and above the balance. */}
            {hasDashboardBanners ? (
              <Box
                twClassName="px-4 pt-2 mb-4 gap-2"
                testID={CardHomeSelectors.DASHBOARD_BANNERS}
              >
                {hasAlertSectionBanners ? (
                  <CardAlertSection
                    alerts={dashboardAlerts}
                    onNavigateToSpendingLimit={
                      actions.manageSpendingLimitAction
                    }
                    onDismissSpendingLimitWarning={() =>
                      setIsSpendingLimitWarningDismissed(true)
                    }
                    provisioningView={provisioningView}
                  />
                ) : null}
                {isAuthenticated && showUkMigrationSoftBanner ? (
                  <Box testID={CardHomeSelectors.UK_MIGRATION_SOFT_BANNER}>
                    <CardMessageBox
                      messageType={CardMessageBoxType.UkMigrationSoft}
                      values={
                        ukMigrationSoftDeadlineLabel
                          ? { deadline: ukMigrationSoftDeadlineLabel }
                          : undefined
                      }
                      onConfirm={handleUkMigrationBannerConfirm}
                      onClose={() => setIsUkMigrationSoftBannerDismissed(true)}
                    />
                  </Box>
                ) : null}
                {isAuthenticated && isUkMigrationForced ? (
                  <Box testID={CardHomeSelectors.UK_MIGRATION_REQUIRED_BANNER}>
                    <CardMessageBox
                      messageType={CardMessageBoxType.UkMigrationRequired}
                      onConfirm={handleUkMigrationBannerConfirm}
                    />
                  </Box>
                ) : null}
                {isAuthenticated && isBlocked ? (
                  <Box>
                    <CardMessageBox messageType={CardMessageBoxType.Blocked} />
                  </Box>
                ) : null}
                {isAuthenticated && showVerificationPendingBanner ? (
                  <Box testID={CardHomeSelectors.VERIFICATION_PENDING_NOTICE}>
                    <CardMessageBox
                      messageType={CardMessageBoxType.WalletVerificationPending}
                      values={{ devices: pendingDevicesLabel }}
                      onConfirm={
                        canOpenInWallet ? handleOpenInWallet : undefined
                      }
                    />
                  </Box>
                ) : null}
              </Box>
            ) : null}

            {/* The available balance leads in place of the old "Card" title, using
            the Money home balance header. States that hide the balance today
            (setup actions or alert-only) show no header at all. */}
            {isAuthenticated && !hasSetupActions && !hasAlertOnlyState && (
              <CardBalanceDisplay
                isLoading={isLoading}
                balanceAmount={balanceAmount}
                privacyMode={privacyMode}
                currentCurrency={currentCurrency}
                onTogglePrivacy={handleTogglePrivacy}
                showInfoBadge={creditIncludedInBalance}
                onInfoPress={handleOpenCreditBalanceTooltip}
                infoBadgeTestID={CardHomeSelectors.CREDIT_BALANCE_INFO_BUTTON}
                isUnavailable={primaryToken?.isUnavailable}
              />
            )}

            {/* Card art sits on the page at full content width (no panel).
                Stacked above the content below so the freeze animation's
                drips fall over the action buttons; the animation overlay
                itself ignores touches (pointerEvents="none"). */}
            <Box twClassName="mt-4 mx-4 z-20 overflow-visible">
              <Animated.View
                style={[
                  tw.style('w-full relative overflow-visible'),
                  arrival.cardStyle,
                ]}
              >
                {/* Muted while identity is in review, so the card doesn't look ready. */}
                <Box
                  twClassName={`overflow-visible ${isSignedOutKycPending ? 'opacity-50' : ''}`}
                  testID={CardHomeSelectors.CARD_ART}
                >
                  {/* Freeze/unfreeze only fire triggers on the mounted virtual
                      face. While the card details are revealed it is only
                      hidden, and the details render on top at the card face's
                      exact bounds. */}
                  {showFreezeCardArt ? (
                    // Every wrapper stays overflow-visible: Android clips by
                    // default, which would cut the drips off at the card edge.
                    <Box twClassName="relative overflow-visible">
                      <Box
                        twClassName={
                          isRevealingCardDetails
                            ? 'overflow-visible opacity-0'
                            : 'overflow-visible'
                        }
                        testID={CardHomeSelectors.CARD_FREEZE_RIVE_WRAPPER}
                      >
                        <CardFreezeUnfreezeAnimation
                          isFrozen={isFrozen && isAuthenticated}
                          fallbackSource={cardArtFallbackPng}
                          width={windowWidth - 32}
                          testID={CardHomeSelectors.CARD_FREEZE_RIVE}
                        />
                      </Box>
                      {isRevealingCardDetails && (
                        <Box twClassName="absolute inset-0">
                          <CardImageSection
                            isLoading={isLoading || isSetupReconciling}
                            isCardDetailsLoading={
                              actions.isCardDetailsLoading ||
                              actions.isSensitiveDetailsLoading
                            }
                            cardDetailsImageUrl={actions.cardDetailsImageUrl}
                            isCardDetailsImageLoading={
                              actions.isCardDetailsImageLoading
                            }
                            onImageLoad={actions.onCardDetailsImageLoad}
                            onImageError={actions.onCardDetailsImageError}
                            cardSensitiveDetails={actions.cardSensitiveDetails}
                            onCopyDetail={actions.copyCardDetail}
                            cardType={data?.card?.type}
                            cardStatus={data?.card?.status}
                          />
                        </Box>
                      )}
                    </Box>
                  ) : arrival.usesRiveCard && allowCardRive ? (
                    <MoneyCardTiltAnimation
                      key={arrival.revealKey}
                      isMetalCard={hasMetalCard}
                      fillWidth
                      playRevealOnMount={arrival.playReveal}
                      revealDelayMs={arrival.revealDelayMs}
                      testID={CardHomeSelectors.CARD_ARRIVAL_RIVE}
                    />
                  ) : (
                    <CardImageSection
                      isLoading={isLoading || isSetupReconciling}
                      isCardDetailsLoading={
                        actions.isCardDetailsLoading ||
                        actions.isSensitiveDetailsLoading
                      }
                      cardDetailsImageUrl={actions.cardDetailsImageUrl}
                      isCardDetailsImageLoading={
                        actions.isCardDetailsImageLoading
                      }
                      onImageLoad={actions.onCardDetailsImageLoad}
                      onImageError={actions.onCardDetailsImageError}
                      cardSensitiveDetails={actions.cardSensitiveDetails}
                      onCopyDetail={actions.copyCardDetail}
                      cardType={data?.card?.type}
                      cardStatus={data?.card?.status}
                    />
                  )}
                </Box>
              </Animated.View>

              {isAuthenticated && !isUkMigrationForced && hasSetupActions && (
                <Box twClassName="w-full mt-4">
                  <CardActionsButtons
                    actions={effectiveActions}
                    isLoading={isLoading}
                    onEnableCard={enableCard ?? actions.enableCardAction}
                    isEnableCardDisabled={
                      isEnableCardPending || isSetupReconciling
                    }
                  />
                </Box>
              )}
            </Box>

            {isAuthenticated &&
              !isLoading &&
              walletEntry === 'push' &&
              !isUkMigrationForced && (
                <Box twClassName="w-full px-4 pt-3 items-center justify-center">
                  {isProvisioning ? (
                    <Box twClassName="h-12 items-center justify-center">
                      <Spinner
                        testID="push-provisioning-spinner"
                        spinnerIconProps={{ size: IconSize.Xl }}
                      />
                    </Box>
                  ) : (
                    <AddToWalletButton
                      onPress={
                        isProvisioning ? undefined : initiateProvisioning
                      }
                      buttonStyle="blackOutline"
                      buttonType="basic"
                      // Match the MMDS Button Lg: full width, 48pt tall, pill corners.
                      borderRadius={ADD_TO_WALLET_HEIGHT / 2}
                      style={{
                        width: windowWidth - ADD_TO_WALLET_SIDE_PADDING * 2,
                        height: ADD_TO_WALLET_HEIGHT,
                      }}
                    />
                  )}
                </Box>
              )}

            {isAuthenticated && (
              <CardHomeActionButtonRow
                isGlass={isGlassSurface}
                isTightTop={
                  !isLoading && walletEntry === 'push' && !isUkMigrationForced
                }
                add={
                  showAddFundsAction
                    ? {
                        onPress: actions.addFundsAction,
                        disabled:
                          !isSwapEnabled && !primaryToken?.isMoneyAccountEntry,
                      }
                    : undefined
                }
                details={
                  actionVisibility.details
                    ? {
                        onPress: () => {
                          void actions.viewCardDetailsAction();
                        },
                        isShowingDetails: isCardDetailsVisible,
                      }
                    : undefined
                }
                pin={
                  actionVisibility.pin
                    ? {
                        onPress: () => {
                          void actions.viewPinAction();
                        },
                        disabled: actions.isPinLoading,
                      }
                    : undefined
                }
                freeze={
                  actionVisibility.freeze
                    ? {
                        onPress: () => {
                          void actions.handleToggleFreeze();
                        },
                        isFrozen,
                        // A details fetch in flight would cover the freeze
                        // animation, and clearing details cannot cancel it.
                        disabled: isFreezeLoading || isCardDetailsLoading,
                      }
                    : undefined
                }
              />
            )}
            {showHomeSegments && (
              <Box twClassName="px-4 mt-4 mb-4">
                <SegmentedControl
                  value={activeHomeSegment}
                  onChange={(value) =>
                    setActiveHomeSegment(value as CardHomeSegment)
                  }
                  isFullWidth
                  testID={CardHomeSelectors.HOME_SEGMENTS}
                >
                  <FilterButton
                    value={CardHomeSegment.Manage}
                    testID={CardHomeSelectors.MANAGE_SEGMENT}
                  >
                    {strings('card.card_home.segments.manage')}
                  </FilterButton>
                  <FilterButton
                    value={CardHomeSegment.Activity}
                    testID={CardHomeSelectors.ACTIVITY_SEGMENT}
                  >
                    {strings('card.card_home.segments.activity')}
                  </FilterButton>
                </SegmentedControl>
              </Box>
            )}

            {showRecentActivity && (
              <CardHomeRecentActivity
                transactions={recentTransactions}
                isLoading={isRecentActivityLoading}
                hasError={Boolean(recentActivityError)}
                onRetry={() => {
                  void refetchRecentTransactions();
                }}
                onSeeAll={
                  transactionHistoryDestination
                    ? () =>
                        actions.transactionHistoryAction(
                          transactionHistoryDestination,
                        )
                    : undefined
                }
                onTransactionPress={handleRecentTransactionPress}
                privacyMode={privacyMode}
              />
            )}

            {isAuthenticated &&
              credit.hasCredit &&
              !hasSetupActions &&
              !hasAlertOnlyState &&
              !isUkMigrationForced && (
                <Box
                  twClassName="mx-4 mt-4"
                  testID={CardHomeSelectors.CREDIT_BANNER}
                >
                  <CardMessageBox
                    messageType={
                      redeemsToMoneyAccount
                        ? CardMessageBoxType.CreditAvailable
                        : CardMessageBoxType.CreditAvailableNoMoneyAccount
                    }
                    values={{ amount: refundFiatLabel }}
                    onConfirm={actions.redeemCreditAction}
                  />
                </Box>
              )}

            {isAuthenticated && showLinkMoneyAccountCta && (
              <>
                <Box twClassName="mb-6 mt-7">
                  <MoneyMetaMaskCard
                    mode="link"
                    hideCardImage
                    apy={moneyAccountApyPercent}
                    showMetalCard={hasMetalCard}
                    isLinkDisabled={isMoneyAccountLinkInProgress}
                    onGetNowPress={handleLinkMoneyAccountCard}
                    onLinkPress={handleLinkMoneyAccountCard}
                    analyticsScreen={CardScreens.HOME}
                    analyticsEntryPoint={
                      CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD
                    }
                    analyticsFlow={CardFlow.MONEY_ACCOUNT_LINKAGE}
                    analyticsCardState="unlinked_card"
                    analyticsReady={isCardAnalyticsReady}
                  />
                </Box>
                <Box
                  twClassName="h-px bg-border-muted"
                  testID={CardHomeSelectors.LINK_MONEY_ACCOUNT_DIVIDER_BOTTOM}
                />
              </>
            )}

            {isAuthenticated &&
              !isUkMigrationForced &&
              ((showManageOptions && !isBlocked) ||
                showSpendingLimitProgress) && (
                <ManageCardOptions
                  spendingLimitOnly={!(showManageOptions && !isBlocked)}
                  spendingLimitReadOnly={isBlocked}
                  privacyMode={privacyMode}
                  card={data?.card}
                  account={data?.account}
                  capabilities={capabilities}
                  isSpendingLimitActive={isSpendingLimitActive}
                  showLimitedSpendingAmounts={showSpendingLimitProgress}
                  spendingLimitRemaining={
                    data?.primaryFundingAsset?.spendingCap
                  }
                  spendingLimitTotal={
                    data?.primaryFundingAsset?.originalSpendingCap ??
                    data?.primaryFundingAsset?.spendingCap
                  }
                  spendingLimitSymbol={
                    primaryToken?.displaySymbol ??
                    data?.primaryFundingAsset?.symbol
                  }
                  isMetalCardCheckoutEnabled={isMetalCardCheckoutEnabled}
                  isAuthenticated={isAuthenticated}
                  isLoading={isLoading}
                  hasSetupActions={hasSetupActions}
                  hasAlertOnlyState={hasAlertOnlyState}
                  hasSetupAlerts={hasSetupAlerts}
                  userLocation={userLocation}
                  isFrozen={isFrozen}
                  isFreezeLoading={isFreezeLoading}
                  isPinLoading={actions.isPinLoading}
                  cardDetailsVisible={isCardDetailsVisible}
                  onViewCardDetails={actions.viewCardDetailsAction}
                  onViewPin={actions.viewPinAction}
                  onSetPin={actions.setPinAction}
                  onToggleFreeze={actions.handleToggleFreeze}
                  onManageSpendingLimit={actions.manageSpendingLimitAction}
                  onContactDetails={actions.contactDetailsAction}
                  showDigitalWalletInstructions={walletEntry === 'instructions'}
                  onDigitalWalletInstructions={
                    actions.digitalWalletInstructionsAction
                  }
                  showHowToUseApplePay={isCardInWallet && !canAddToWallet}
                  onHowToUseApplePay={actions.howToUseApplePayAction}
                  showUnlinkMoneyAccount={canUnlinkMoneyAccount}
                  onUnlinkMoneyAccount={() =>
                    actions.unlinkMoneyAccountAction(
                      fallbackFundingSourceSymbol,
                    )
                  }
                  showRevokeAllowance={canRevokeAllowance}
                  onRevokeAllowance={actions.revokeAllowanceAction}
                  fundingAccountName={fundingAccountName}
                  onOrderMetalCard={actions.orderMetalCardAction}
                  onChangeAsset={actions.changeAssetAction}
                  hasPriorityTokenBalance={hasPriorityTokenBalance}
                  hiddenQuickActionRows={actionVisibility}
                  onCashback={actions.cashbackAction}
                  onTravel={actions.navigateToTravelPage}
                  onTransactionHistory={
                    transactionHistoryDestination
                      ? () =>
                          actions.transactionHistoryAction(
                            transactionHistoryDestination,
                          )
                      : undefined
                  }
                  showTransactionHistoryDuringSetup={
                    isImmersve && hasSetupActions
                  }
                  showTransactionHistoryRow={
                    transactionHistoryDestination === 'money'
                  }
                />
              )}

            <CardScreenshotDeterrent
              enabled={
                !!actions.cardDetailsImageUrl || !!actions.cardSensitiveDetails
              }
            />
          </>
        )}
      </ScrollView>
      {/* Outside the ScrollView so the sheet covers the whole screen,
          header included, and does not scroll with the list. */}
      {moreSheet}
    </Box>
  );
};

function formatPendingDevices(devices: WalletPassDevice[] | undefined): string {
  if (!devices?.length) {
    return '';
  }

  const names = devices.map((walletDevice) =>
    strings(
      walletDevice === 'phone'
        ? 'card.push_provisioning.device_iphone'
        : 'card.push_provisioning.device_apple_watch',
    ),
  );

  if (names.length < 2) {
    return names[0];
  }

  return strings('card.push_provisioning.device_list_and', {
    first: names[0],
    second: names[1],
  });
}

export default CardHome;
