import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  TextButton,
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
  selectApplePayLearnMoreUrl,
  selectMetalCardCheckoutFeatureFlag,
} from '../../../../../selectors/featureFlagController/card';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { useCardHomeData } from '../../hooks/useCardHomeData';
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
import CardActionsButtons from './components/CardActionsButtons';
import CardBalanceDisplay from './components/CardBalanceDisplay';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import { formatWithThreshold } from '../../../../../util/assets';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import CardImageSection from './components/CardImageSection';
import cardArtFallbackPng from '../../../../../images/mm_card_regular.png';
import ManageCardOptions from './components/ManageCardOptions';
import CardHomeLoadingSkeleton from './components/CardHomeLoadingSkeleton';
import CardHomeRecentActivity from './components/CardHomeRecentActivity';
import CardFreezeUnfreezeAnimation from '../../components/CardFreezeUnfreezeAnimation';
import { useCardRecentTransactions } from '../../hooks/useCardRecentTransactions';
import CardHomeActionButtonRow, {
  getCardHomeActionVisibility,
} from './components/CardHomeActionButtonRow';
import CardHomeMoreSheet from './components/CardHomeMoreSheet';
import { useIsGlassSurfaceEnabled } from '../../../../hooks/useIsGlassSurfaceEnabled';
import { selectMoneyBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/moneyBrandRefresh';
import { useCardArrivalAnimation } from './hooks/useCardArrivalAnimation';
import { useCardHomeActions } from './hooks/useCardHomeActions';
import { useCardHomeAnalytics } from './hooks/useCardHomeAnalytics';
import { useCardIntercomSupport } from './hooks/useCardIntercomSupport';
import { useCardWalletProvisioning } from './hooks/useCardWalletProvisioning';
import { getWalletTypeForPlatform } from '../../pushProvisioning/constants';
import { useCardEnableCard } from './hooks/useCardEnableCard';
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

const SETUP_ALERT_TYPES = new Set([
  'kyc_pending',
  'card_provisioning',
  'allowance_revoked',
]);

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
  const recentTransactions = useCardRecentTransactions();
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
  const applePayLearnMoreUrl = useSelector(selectApplePayLearnMoreUrl);
  const handleLearnMoreAboutApplePay = useCallback(() => {
    Linking.openURL(applePayLearnMoreUrl).catch(() => undefined);
  }, [applePayLearnMoreUrl]);
  const pendingDevicesLabel = formatPendingDevices(pendingVerificationDevices);
  const handleOpenInWallet = useCallback(() => {
    openInWallet().catch(() => undefined);
  }, [openInWallet]);

  const { canEnableCard, enableCard, provisioningView, isEnableCardPending } =
    useCardEnableCard(data, { recheckOnFocus: true });
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshUkMigrationState();
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refreshUkMigrationState]);

  // --- Refetch card data when the screen regains focus (e.g. after a swap) ---
  useFocusEffect(
    useCallback(() => {
      Engine.context.CardController.fetchCardHomeData();
    }, []),
  );

  // --- Auth state transition: navigate to auth screen on logout ---
  // Defer the redirect until Card Home is focused. A provider switch during
  // UK migration marks the user signed out while SignUp is on top; replacing
  // the focused route from this background screen unmounts that flow.
  const wasAuthenticated = useRef(isAuthenticated);
  const pendingAuthRedirect = useRef(false);
  useEffect(() => {
    if (
      wasAuthenticated.current &&
      !isAuthenticated &&
      lastUnauthenticatedReason !== 'onboarding_token_revoked'
    ) {
      pendingAuthRedirect.current = true;
    }
    if (isAuthenticated) {
      pendingAuthRedirect.current = false;
    }
    wasAuthenticated.current = isAuthenticated;
    if (pendingAuthRedirect.current && isFocused) {
      pendingAuthRedirect.current = false;
      navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
    }
  }, [isAuthenticated, isFocused, lastUnauthenticatedReason, navigation]);

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
  useEffect(() => {
    if (!isUkMigrationSoft || hasOpenedUkMigrationSheet.current || isLoading) {
      return;
    }
    hasOpenedUkMigrationSheet.current = true;
    handleOpenUkMigrationSheet();
  }, [handleOpenUkMigrationSheet, isLoading, isUkMigrationSoft]);

  const hasSetupAlerts = alerts.some((a) => SETUP_ALERT_TYPES.has(a.type));

  const hasAlertOnlyState = hasSetupAlerts && effectiveActions.length === 0;

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
    !hasSetupActions;

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
    !isLoading &&
    !isUkMigrationForced &&
    !hasSetupActions &&
    effectiveActions.some((a) => a.type === 'add_funds');
  const isCardDetailsVisible =
    (!!actions.cardDetailsImageUrl || !!actions.cardSensitiveDetails) &&
    isAuthenticated;
  const isFreezeLoading =
    actions.freeze.isPending || actions.unfreeze.isPending;

  const arrival = useCardArrivalAnimation({
    fromCardOnboarding: !!route.params?.fromCardOnboarding,
    cardType: data?.card?.type,
    isRevealingCardDetails:
      actions.isCardDetailsLoading ||
      actions.isSensitiveDetailsLoading ||
      Boolean(actions.cardSensitiveDetails) ||
      Boolean(actions.cardDetailsImageUrl),
  });

  // Terms and Contact support live in a "More" sheet behind the header's
  // vertical-ellipsis button, the same button Money home uses (MoneyHeader).
  const moreSheet = isMoreSheetOpen ? (
    <CardHomeMoreSheet
      onClose={() => setIsMoreSheetOpen(false)}
      isAuthenticated={isAuthenticated}
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
      return provisioningView !== 'hidden';
    }
    return false;
  });
  const showVerificationPendingBanner =
    !isLoading && pendingDevicesLabel.length > 0 && !isUkMigrationForced;
  const hasDashboardBanners =
    hasAlertSectionBanners ||
    showUkMigrationSoftBanner ||
    isUkMigrationForced ||
    isBlocked ||
    showVerificationPendingBanner;

  // Activity / Manage segments only in the active and frozen states of a
  // fully set-up card. Every other state keeps the management list as
  // before, with no segments.
  const showHomeSegments =
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
                {showUkMigrationSoftBanner ? (
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
                {isUkMigrationForced ? (
                  <Box testID={CardHomeSelectors.UK_MIGRATION_REQUIRED_BANNER}>
                    <CardMessageBox
                      messageType={CardMessageBoxType.UkMigrationRequired}
                      onConfirm={handleUkMigrationBannerConfirm}
                    />
                  </Box>
                ) : null}
                {isBlocked ? (
                  <Box>
                    <CardMessageBox messageType={CardMessageBoxType.Blocked} />
                  </Box>
                ) : null}
                {showVerificationPendingBanner ? (
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
            {!hasSetupActions && !hasAlertOnlyState && (
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

            {/* Card art sits on the page at full content width (no panel). */}
            <Box twClassName="mt-4 mx-4">
              <Animated.View
                style={[tw.style('w-full relative'), arrival.cardStyle]}
              >
                {/* Muted while identity is in review, so the card doesn't look ready. */}
                <Box
                  twClassName={`overflow-visible ${isSignedOutKycPending ? 'opacity-50' : ''}`}
                  testID={CardHomeSelectors.CARD_ART}
                >
                  {/* The Rive card stays mounted whenever the signed-in card is shown,
                      so freeze/unfreeze only fire triggers — no swapping layers. */}
                  {showFreezeAnimation || (isAuthenticated && !isLoading) ? (
                    <CardFreezeUnfreezeAnimation
                      isFrozen={isFrozen && isAuthenticated}
                      fallbackSource={cardArtFallbackPng}
                      width={windowWidth - 32}
                      testID={CardHomeSelectors.CARD_FREEZE_RIVE}
                    />
                  ) : arrival.usesRiveCard ? (
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

              {!isUkMigrationForced && hasSetupActions && (
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

            {!isLoading && walletEntry === 'push' && !isUkMigrationForced && (
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
                    onPress={isProvisioning ? undefined : initiateProvisioning}
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

            <Box twClassName="z-10">
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
                        onPress: actions.viewCardDetailsAction,
                        isShowingDetails: isCardDetailsVisible,
                      }
                    : undefined
                }
                pin={
                  actionVisibility.pin
                    ? {
                        onPress: actions.viewPinAction,
                        disabled: actions.isPinLoading,
                      }
                    : undefined
                }
                freeze={
                  actionVisibility.freeze
                    ? {
                        onPress: actions.handleToggleFreeze,
                        isFrozen: isFrozen && isAuthenticated,
                        disabled: isFreezeLoading,
                      }
                    : undefined
                }
              />
            </Box>

            {showHomeSegments && (
              <Box twClassName="px-4 mt-4 mb-4 z-10">
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

            {credit.hasCredit &&
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

            {showLinkMoneyAccountCta && (
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

            {!isBlocked && !isUkMigrationForced && showManageOptions && (
              <ManageCardOptions
                card={data?.card}
                account={data?.account}
                capabilities={capabilities}
                isSpendingLimitActive={isSpendingLimitActive}
                showLimitedSpendingAmounts={showSpendingLimitProgress}
                spendingLimitRemaining={data?.primaryFundingAsset?.spendingCap}
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
                isFreezeLoading={
                  actions.freeze.isPending || actions.unfreeze.isPending
                }
                isPinLoading={actions.isPinLoading}
                cardDetailsVisible={
                  (!!actions.cardDetailsImageUrl ||
                    !!actions.cardSensitiveDetails) &&
                  isAuthenticated
                }
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
                  actions.unlinkMoneyAccountAction(fallbackFundingSourceSymbol)
                }
                showRevokeAllowance={canRevokeAllowance}
                onRevokeAllowance={actions.revokeAllowanceAction}
                fundingAccountName={fundingAccountName}
                onOrderMetalCard={actions.orderMetalCardAction}
                onChangeAsset={actions.changeAssetAction}
                hasPriorityTokenBalance={hasPriorityTokenBalance}
                hideQuickActionRows={
                  actionVisibility.details ||
                  actionVisibility.pin ||
                  actionVisibility.freeze
                }
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
              />
            )}

            {moreSheet}

            <CardScreenshotDeterrent
              enabled={
                !!actions.cardDetailsImageUrl || !!actions.cardSensitiveDetails
              }
            />
          </>
        )}
      </ScrollView>
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
