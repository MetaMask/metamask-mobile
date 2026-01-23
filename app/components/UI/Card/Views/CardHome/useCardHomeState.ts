import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { strings } from '../../../../../../locales/i18n';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import {
  AllowanceState,
  CardTokenAllowance,
  CardDetailsResponse,
} from '../../types';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../../Tokens/constants';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import {
  DEPOSIT_SUPPORTED_TOKENS,
  SPENDING_LIMIT_UNSUPPORTED_TOKENS,
} from '../../constants';
import { useCardSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import {
  clearAllCache,
  resetAuthenticatedData,
} from '../../../../../core/redux/slices/card';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { isAuthenticationError } from '../../util/isAuthenticationError';
import { removeCardBaanxToken } from '../../util/cardTokenVault';
import useLoadCardData from '../../hooks/useLoadCardData';
import useCardDetailsToken from '../../hooks/useCardDetailsToken';
import { CardActions } from '../../util/metrics';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { useAssetBalances } from '../../hooks/useAssetBalances';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { createAddFundsModalNavigationDetails } from '../../components/AddFundsBottomSheet/AddFundsBottomSheet';
import { createAssetSelectionModalNavigationDetails } from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import type {
  CardHomeViewState,
  CardHomeFeatures,
  CardHomeState,
  CardAssetBalance,
  CardDetailsTokenState,
} from './CardHome.types';

/**
 * Route params for CardHome screen
 */
interface CardHomeRouteParams {
  showDeeplinkToast?: boolean;
}

/**
 * Consolidated hook for CardHome state management.
 *
 * This hook:
 * - Consumes existing hooks (useLoadCardData, useCardDetailsToken, etc.)
 * - Derives a single CardHomeViewState discriminated union
 * - Returns all data needed by the UI in one place
 *
 * @returns CardHomeState - Complete state object for rendering CardHome
 */
const useCardHomeState = (): CardHomeState => {
  const { PreferencesController } = Engine.context;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: CardHomeRouteParams }, 'params'>>();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { logoutFromProvider, isLoading: isSDKLoading } = useCardSDK();
  const privacyMode = useSelector(selectPrivacyMode);

  // Local state
  const [retries, setRetries] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHandlingAuthError, setIsHandlingAuthError] = useState(false);
  const [isSpendingLimitWarningDismissed, setIsSpendingLimitWarningDismissed] =
    useState(false);

  // Refs for tracking
  const hasTrackedCardHomeView = useRef(false);
  const hasLoadedCardHomeView = useRef(false);
  const hasCompletedInitialFetchRef = useRef(false);
  const hasHandledAuthErrorRef = useRef(false);
  const isComponentUnmountedRef = useRef(false);
  const hasShownDeeplinkToast = useRef(false);

  // Load card data
  const {
    priorityToken,
    cardDetails,
    isLoading,
    error: cardError,
    isAuthenticated,
    isBaanxLoginEnabled,
    fetchAllData,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    kycStatus,
  } = useLoadCardData();

  // Card details token (for viewing card number/CVV)
  const {
    fetchCardDetailsToken: fetchCardDetailsTokenRaw,
    isLoading: isCardDetailsLoading,
    isImageLoading: isCardDetailsImageLoading,
    onImageLoad: onCardDetailsImageLoad,
    imageUrl: cardDetailsImageUrl,
    clearImageUrl: clearCardDetailsImageUrl,
  } = useCardDetailsToken();

  // Asset balances
  const assetBalancesMap = useAssetBalances(
    priorityToken ? [priorityToken] : [],
  );
  const assetBalanceRaw = assetBalancesMap.get(
    `${priorityToken?.address?.toLowerCase()}-${priorityToken?.caipChainId}-${priorityToken?.walletAddress?.toLowerCase()}`,
  );

  // Navigation helpers
  const { navigateToCardPage, navigateToTravelPage, navigateToCardTosPage } =
    useNavigateToCardPage(navigation);
  const { openSwaps } = useOpenSwaps({ priorityToken });
  const isSwapEnabledForPriorityToken = useIsSwapEnabledForPriorityToken(
    priorityToken?.walletAddress,
  );

  // Toggle privacy mode
  const togglePrivacyMode = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAllData]);

  // Dismiss spending limit warning
  const dismissSpendingLimitWarning = useCallback(() => {
    setIsSpendingLimitWarningDismissed(true);
  }, []);

  // ========== Derived State Computations ==========

  /**
   * Check if the current token supports the spending limit progress bar feature.
   */
  const isSpendingLimitSupported = useMemo(() => {
    if (
      !priorityToken?.symbol ||
      isSolanaChainId(priorityToken.caipChainId ?? '')
    ) {
      return false;
    }
    return !SPENDING_LIMIT_UNSUPPORTED_TOKENS.includes(
      priorityToken.symbol.toUpperCase(),
    );
  }, [priorityToken?.symbol, priorityToken?.caipChainId]);

  /**
   * Check if user is close to spending limit (consumed >= 80%)
   */
  const isCloseToSpendingLimit = useMemo(() => {
    if (!isAuthenticated || !isSpendingLimitSupported) {
      return false;
    }

    const totalAllowance = Number(priorityToken?.totalAllowance) || 0;
    const remainingAllowance = Number(priorityToken?.allowance) || 0;

    return (
      priorityToken?.allowanceState === AllowanceState.Limited &&
      remainingAllowance <= totalAllowance * 0.2
    );
  }, [isAuthenticated, isSpendingLimitSupported, priorityToken]);

  /**
   * Check if allowance is limited (for unauthenticated users)
   */
  const isAllowanceLimited = useMemo(
    () =>
      !isAuthenticated &&
      priorityToken?.allowanceState === AllowanceState.Limited,
    [priorityToken, isAuthenticated],
  );

  /**
   * Determine if card setup is needed and related states
   *
   * For VERIFIED users:
   * 1. Card + Delegated tokens → ready state (full UI)
   * 2. No Card + Delegated tokens → provisioning state (message box, no actions)
   * 3. No Card + No Delegated tokens → enable card button
   * 4. Card + No Delegated tokens → enable card button
   */
  const cardSetupState = useMemo(() => {
    const isKYCVerified =
      isAuthenticated && kycStatus?.verificationState === 'VERIFIED';

    const isKYCPending =
      isBaanxLoginEnabled &&
      isAuthenticated &&
      (kycStatus?.verificationState === 'PENDING' ||
        kycStatus?.verificationState === 'UNVERIFIED');

    // Determine card and delegation status
    const hasCard = !!cardDetails;
    const hasDelegatedTokens =
      (externalWalletDetailsData?.mappedWalletDetails?.length ?? 0) > 0;

    // Provisioning: VERIFIED + no card + has delegated tokens (Case 2)
    const isProvisioning =
      isBaanxLoginEnabled && isKYCVerified && !hasCard && hasDelegatedTokens;

    // Need delegation: VERIFIED + no delegated tokens (Cases 3 & 4)
    const needsDelegation =
      isBaanxLoginEnabled && isKYCVerified && !hasDelegatedTokens;

    // Setup required when either provisioning OR needs delegation
    const needsSetup = isProvisioning || needsDelegation;

    // Can enable only when needs delegation (not when provisioning)
    const canEnable = needsDelegation && !isLoading;

    return { needsSetup, canEnable, isKYCPending, isProvisioning };
  }, [
    isBaanxLoginEnabled,
    isAuthenticated,
    kycStatus,
    cardDetails,
    externalWalletDetailsData,
    isLoading,
  ]);

  // ========== Action Handlers ==========

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
    );
    const isPriorityTokenSupportedDeposit = !!DEPOSIT_SUPPORTED_TOKENS.find(
      (t) => t.toLowerCase() === priorityToken?.symbol?.toLowerCase(),
    );

    if (isPriorityTokenSupportedDeposit) {
      navigation.navigate(
        ...createAddFundsModalNavigationDetails({
          priorityToken: priorityToken ?? undefined,
        }),
      );
    } else if (priorityToken) {
      openSwaps({});
    }
  }, [trackEvent, createEventBuilder, priorityToken, openSwaps, navigation]);

  const openOnboardingDelegationAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.OPEN_ONBOARDING_DELEGATION_FLOW })
        .build(),
    );

    navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
      flow: 'manage',
      priorityToken,
      allTokens,
      delegationSettings,
      externalWalletDetailsData,
    });
  }, [
    navigation,
    priorityToken,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    trackEvent,
    createEventBuilder,
  ]);

  const changeAssetAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.CHANGE_ASSET_BUTTON })
        .build(),
    );

    if (isAuthenticated) {
      navigation.navigate(
        ...createAssetSelectionModalNavigationDetails({
          tokensWithAllowances: allTokens,
          delegationSettings,
          cardExternalWalletDetails: externalWalletDetailsData,
        }),
      );
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
  ]);

  const manageSpendingLimitAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.MANAGE_SPENDING_LIMIT_BUTTON })
        .build(),
    );

    if (isAuthenticated) {
      navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
        flow: 'enable',
        priorityToken,
        allTokens,
        delegationSettings,
        externalWalletDetailsData,
      });
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [
    isAuthenticated,
    navigation,
    trackEvent,
    createEventBuilder,
    priorityToken,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
  ]);

  const logoutAction = useCallback(() => {
    Alert.alert(
      strings('card.card_home.logout_confirmation_title'),
      strings('card.card_home.logout_confirmation_message'),
      [
        {
          text: strings('card.card_home.logout_confirmation_cancel'),
          style: 'cancel',
        },
        {
          text: strings('card.card_home.logout_confirmation_confirm'),
          style: 'destructive',
          onPress: () => {
            logoutFromProvider();
            navigation.goBack();
          },
        },
      ],
    );
  }, [logoutFromProvider, navigation]);

  const onCardDetailsImageError = useCallback(() => {
    clearCardDetailsImageUrl();
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_home.view_card_details_error') },
      ],
      hasNoTimeout: false,
      iconName: IconName.Warning,
    });
  }, [clearCardDetailsImageUrl, toastRef]);

  const viewCardDetailsAction = useCallback(async () => {
    if (isCardDetailsLoading || isCardDetailsImageLoading) {
      return;
    }

    if (cardDetailsImageUrl) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({ action: CardActions.HIDE_CARD_DETAILS_BUTTON })
          .build(),
      );
      clearCardDetailsImageUrl();
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VIEW_CARD_DETAILS_BUTTON,
          card_type: cardDetails?.type,
        })
        .build(),
    );

    try {
      await fetchCardDetailsTokenRaw(cardDetails?.type);
    } catch {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_home.view_card_details_error') },
        ],
        hasNoTimeout: false,
        iconName: IconName.Warning,
      });
    }
  }, [
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    cardDetailsImageUrl,
    clearCardDetailsImageUrl,
    fetchCardDetailsTokenRaw,
    toastRef,
    cardDetails?.type,
    trackEvent,
    createEventBuilder,
  ]);

  // ========== Side Effects ==========

  // Cleanup on unmount
  useEffect(
    () => () => {
      isComponentUnmountedRef.current = true;
    },
    [],
  );

  // Track card home view event
  useEffect(() => {
    if (hasTrackedCardHomeView.current || isSDKLoading) {
      return;
    }

    const { balanceFormatted, balanceFiat, rawFiatNumber, rawTokenBalance } =
      assetBalanceRaw ?? {};

    const hasValidTokenBalance =
      balanceFormatted !== undefined &&
      balanceFormatted !== TOKEN_BALANCE_LOADING &&
      balanceFormatted !== TOKEN_BALANCE_LOADING_UPPERCASE;

    const hasValidFiatBalance =
      balanceFiat !== undefined &&
      balanceFiat !== TOKEN_BALANCE_LOADING &&
      balanceFiat !== TOKEN_BALANCE_LOADING_UPPERCASE &&
      balanceFiat !== TOKEN_RATE_UNDEFINED;

    const isLoaded =
      !!priorityToken && (hasValidTokenBalance || hasValidFiatBalance);

    if (isLoaded) {
      hasTrackedCardHomeView.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_HOME_VIEWED)
          .addProperties({
            token_symbol_priority: priorityToken?.symbol,
            token_raw_balance_priority:
              rawTokenBalance !== undefined && isNaN(rawTokenBalance)
                ? 0
                : rawTokenBalance,
            token_fiat_balance_priority:
              rawFiatNumber !== undefined && isNaN(rawFiatNumber)
                ? 0
                : rawFiatNumber,
          })
          .build(),
      );
    }
  }, [
    priorityToken,
    assetBalanceRaw,
    trackEvent,
    createEventBuilder,
    isSDKLoading,
  ]);

  // Show deeplink toast
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

  // Handle authentication errors
  useEffect(() => {
    const handleAuthenticationError = async () => {
      const isAuthError =
        Boolean(cardError) &&
        isAuthenticated &&
        isAuthenticationError(cardError);

      if (!isAuthError) {
        hasHandledAuthErrorRef.current = false;
        return;
      }

      if (hasHandledAuthErrorRef.current) {
        return;
      }

      hasHandledAuthErrorRef.current = true;
      setIsHandlingAuthError(true);

      try {
        await removeCardBaanxToken();

        if (isComponentUnmountedRef.current) {
          return;
        }

        dispatch(resetAuthenticatedData());
        dispatch(clearAllCache());

        navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
      } catch {
        if (!isComponentUnmountedRef.current) {
          navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
        }
      } finally {
        if (!isComponentUnmountedRef.current) {
          setIsHandlingAuthError(false);
        }
      }
    };

    handleAuthenticationError();
  }, [cardError, dispatch, isAuthenticated, navigation]);

  // Initial data fetch
  useEffect(() => {
    if (isSDKLoading) {
      return;
    }
    if (!hasLoadedCardHomeView.current && isAuthenticated) {
      hasLoadedCardHomeView.current = true;
      fetchAllData().then(() => {
        hasCompletedInitialFetchRef.current = true;
      });
    }
  }, [fetchAllData, isAuthenticated, isSDKLoading]);

  // Refetch on focus if needed
  useFocusEffect(
    useCallback(() => {
      if (!hasCompletedInitialFetchRef.current) {
        return;
      }

      if (isSDKLoading || !isAuthenticated) {
        return;
      }

      if (!externalWalletDetailsData && !isLoading) {
        fetchAllData();
      }
    }, [
      isSDKLoading,
      isAuthenticated,
      externalWalletDetailsData,
      isLoading,
      fetchAllData,
    ]),
  );

  // ========== Derive View State ==========

  const viewState = useMemo((): CardHomeViewState => {
    // Error state
    if (cardError) {
      const isAuthError = isAuthenticated && isAuthenticationError(cardError);

      return {
        status: 'error',
        error:
          cardError instanceof Error ? cardError : new Error(String(cardError)),
        canRetry: retries < 3 && !isAuthenticationError(cardError),
        isAuthError: isAuthError || isHandlingAuthError,
      };
    }

    // SDK loading - always wait for SDK initialization
    if (isSDKLoading) {
      return { status: 'loading' };
    }

    // KYC pending state - check BEFORE data loading
    // (KYC pending users won't have priorityToken/cardDetails)
    if (cardSetupState.isKYCPending) {
      return { status: 'kyc_pending' };
    }

    // Setup required state - check BEFORE data loading
    // (Users without card/delegation won't have priorityToken/cardDetails)
    if (cardSetupState.needsSetup) {
      return {
        status: 'setup_required',
        canEnable: cardSetupState.canEnable,
        isProvisioning: cardSetupState.isProvisioning,
      };
    }

    // Data loading state - only wait for core data for users who should have it
    // (Not in KYC pending or setup required state)
    const hasCoreData = !!priorityToken && !!cardDetails;
    if (isLoading && !isRefreshing && !hasCoreData) {
      return { status: 'loading' };
    }

    // Ready state - derive all feature flags
    const features: CardHomeFeatures = {
      isAuthenticated,
      isBaanxLoginEnabled,
      canViewCardDetails: isAuthenticated && !!cardDetails,
      canManageSpendingLimit:
        isBaanxLoginEnabled &&
        !isSolanaChainId(priorityToken?.caipChainId ?? ''),
      canChangeAsset: isBaanxLoginEnabled,
      showSpendingLimitWarning:
        !isSpendingLimitWarningDismissed && isCloseToSpendingLimit,
      showSpendingLimitProgress:
        isAuthenticated &&
        isSpendingLimitSupported &&
        priorityToken?.allowanceState === AllowanceState.Limited,
      showAllowanceLimitedWarning: isAllowanceLimited,
      isSwapEnabled: isSwapEnabledForPriorityToken,
    };

    return { status: 'ready', features };
  }, [
    cardError,
    isAuthenticated,
    isHandlingAuthError,
    retries,
    isSDKLoading,
    isLoading,
    isRefreshing,
    priorityToken,
    cardSetupState,
    isBaanxLoginEnabled,
    cardDetails,
    isSpendingLimitWarningDismissed,
    isCloseToSpendingLimit,
    isSpendingLimitSupported,
    isAllowanceLimited,
    isSwapEnabledForPriorityToken,
  ]);

  // ========== Build Asset Balance ==========

  const assetBalance: CardAssetBalance | null = useMemo(() => {
    if (!assetBalanceRaw) {
      return null;
    }

    return {
      asset: assetBalanceRaw.asset,
      balanceFiat: assetBalanceRaw.balanceFiat,
      balanceFormatted: assetBalanceRaw.balanceFormatted,
      rawFiatNumber: assetBalanceRaw.rawFiatNumber,
      rawTokenBalance: assetBalanceRaw.rawTokenBalance,
    };
  }, [assetBalanceRaw]);

  // ========== Build Card Details Token State ==========

  const cardDetailsToken: CardDetailsTokenState = useMemo(
    () => ({
      isLoading: isCardDetailsLoading,
      isImageLoading: isCardDetailsImageLoading,
      imageUrl: cardDetailsImageUrl,
      onImageLoad: onCardDetailsImageLoad,
      onImageError: onCardDetailsImageError,
      fetchCardDetailsToken: async () => {
        await fetchCardDetailsTokenRaw(cardDetails?.type);
      },
      clearImageUrl: clearCardDetailsImageUrl,
    }),
    [
      isCardDetailsLoading,
      isCardDetailsImageLoading,
      cardDetailsImageUrl,
      onCardDetailsImageLoad,
      onCardDetailsImageError,
      fetchCardDetailsTokenRaw,
      clearCardDetailsImageUrl,
      cardDetails?.type,
    ],
  );

  // ========== Build Final State ==========

  // Wrap fetchAllData with retry tracking
  const fetchAllDataWithRetry = useCallback(async () => {
    setRetries((prev) => prev + 1);
    await fetchAllData();
  }, [fetchAllData]);

  return {
    viewState,
    priorityToken: priorityToken as CardTokenAllowance | null,
    cardDetails: cardDetails as CardDetailsResponse | null,
    assetBalance,
    cardDetailsToken,
    privacyMode,
    togglePrivacyMode,
    fetchAllData: fetchAllDataWithRetry,
    handleRefresh,
    isRefreshing,
    addFundsAction,
    changeAssetAction,
    manageSpendingLimitAction,
    viewCardDetailsAction,
    navigateToCardPage,
    navigateToTravelPage,
    navigateToCardTosPage,
    logoutAction,
    openOnboardingDelegationAction,
    isSpendingLimitWarningDismissed,
    dismissSpendingLimitWarning,
    isAuthenticated,
  };
};

export default useCardHomeState;
