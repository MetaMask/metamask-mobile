import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import {
  AllowanceState,
  CardStatus,
  CardType,
  CardStateWarning,
  CardMessageBoxType,
} from '../../types';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';
import CardImage from '../../components/CardImage';
import { CardHomeSelectors } from './CardHome.testIds';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../../Tokens/constants';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import {
  DEPOSIT_SUPPORTED_TOKENS,
  SPENDING_LIMIT_UNSUPPORTED_TOKENS,
} from '../../constants';
import { useCardSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import {
  clearAllCache,
  resetAuthenticatedData,
  selectUserCardLocation,
} from '../../../../../core/redux/slices/card';
import { selectMetalCardCheckoutFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { isAuthenticationError } from '../../util/isAuthenticationError';
import { removeCardBaanxToken } from '../../util/cardTokenVault';
import useLoadCardData from '../../hooks/useLoadCardData';
import useCardDetailsToken from '../../hooks/useCardDetailsToken';
import useAuthentication from '../../../../../core/Authentication/hooks/useAuthentication';
import { ReauthenticateErrorType } from '../../../../../core/Authentication/types';
import { CardActions } from '../../util/metrics';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { useAssetBalances } from '../../hooks/useAssetBalances';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import SpendingLimitProgressBar from '../../components/SpendingLimitProgressBar/SpendingLimitProgressBar';
import { createAddFundsModalNavigationDetails } from '../../components/AddFundsBottomSheet/AddFundsBottomSheet';
import { createAssetSelectionModalNavigationDetails } from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { usePushProvisioning, getWalletName } from '../../pushProvisioning';
import { AddToWalletButton } from '@expensify/react-native-wallet';
import { CardScreenshotDeterrent } from '../../components/CardScreenshotDeterrent';
import { createPasswordBottomSheetNavigationDetails } from '../../components/PasswordBottomSheet';
import {
  buildProvisioningUserAddress,
  buildShippingAddress,
  buildCardholderName,
  type ShippingAddress,
} from '../../util/buildUserAddress';

/**
 * Route params for CardHome screen
 */
interface CardHomeRouteParams {
  showDeeplinkToast?: boolean;
}

/**
 * CardHome Component
 *
 * Main view for the MetaMask Card feature that displays:
 * - User's card balance with privacy controls
 * - Priority token information for spending
 * - Card management options (advanced management)
 *
 * @param props - Component props
 * @returns JSX element representing the card home screen
 */
const CardHome = () => {
  const { PreferencesController } = Engine.context;
  const [retries, setRetries] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHandlingAuthError, setIsHandlingAuthError] = useState(false);
  const { toastRef } = useContext(ToastContext);
  const { logoutFromProvider, isLoading: isSDKLoading } = useCardSDK();
  const userLocation = useSelector(selectUserCardLocation);
  const isMetalCardCheckoutEnabled = useSelector(
    selectMetalCardCheckoutFeatureFlag,
  );
  const {
    fetchCardDetailsToken,
    isLoading: isCardDetailsLoading,
    isImageLoading: isCardDetailsImageLoading,
    onImageLoad: onCardDetailsImageLoad,
    imageUrl: cardDetailsImageUrl,
    clearImageUrl: clearCardDetailsImageUrl,
  } = useCardDetailsToken();
  const { reauthenticate } = useAuthentication();
  const hasTrackedCardHomeView = useRef(false);
  const hasLoadedCardHomeView = useRef(false);
  const hasCompletedInitialFetchRef = useRef(false);
  const hasHandledAuthErrorRef = useRef(false);
  const isComponentUnmountedRef = useRef(false);
  const hasShownDeeplinkToast = useRef(false);
  const [
    isCloseSpendingLimitWarningShown,
    setIsCloseSpendingLimitWarningShown,
  ] = useState(true);

  const route =
    useRoute<RouteProp<{ params: CardHomeRouteParams }, 'params'>>();
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const tw = useTailwind();

  const privacyMode = useSelector(selectPrivacyMode);

  const {
    priorityToken,
    cardDetails,
    isLoading,
    error: cardError,
    warning,
    isAuthenticated,
    isBaanxLoginEnabled,
    fetchAllData,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    kycStatus,
  } = useLoadCardData();

  const assetBalancesMap = useAssetBalances(
    priorityToken ? [priorityToken] : [],
  );
  const assetBalance = assetBalancesMap.get(
    `${priorityToken?.address?.toLowerCase()}-${priorityToken?.caipChainId}-${priorityToken?.walletAddress?.toLowerCase()}`,
  );
  const {
    asset,
    balanceFiat,
    balanceFormatted,
    rawFiatNumber,
    rawTokenBalance,
  } = assetBalance ?? {};

  const { navigateToCardPage, navigateToTravelPage, navigateToCardTosPage } =
    useNavigateToCardPage(navigation);

  const { openSwaps } = useOpenSwaps({
    priorityToken,
  });
  const isSwapEnabledForPriorityToken = useIsSwapEnabledForPriorityToken(
    priorityToken?.walletAddress,
  );

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isAllowanceLimited = useMemo(
    () =>
      !isAuthenticated &&
      priorityToken?.allowanceState === AllowanceState.Limited,
    [priorityToken, isAuthenticated],
  );

  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return balanceFormatted;
    }

    return balanceFiat;
  }, [balanceFiat, balanceFormatted]);

  // Get cardholder name from user details (firstName + lastName)
  const cardholderName = useMemo(
    () => buildCardholderName(kycStatus?.userDetails),
    [kycStatus?.userDetails],
  );

  // Build user address for Google Wallet provisioning
  const userAddressForProvisioning = useMemo(
    () => buildProvisioningUserAddress(kycStatus?.userDetails, cardholderName),
    [kycStatus?.userDetails, cardholderName],
  );

  // Memoize cardDetails for push provisioning to avoid infinite loops
  const cardDetailsForProvisioning = useMemo(
    () =>
      cardDetails
        ? {
            id: cardDetails.id,
            holderName: cardDetails.holderName,
            panLast4: cardDetails.panLast4,
            status: cardDetails.status,
            expiryDate: cardDetails.expiryDate,
          }
        : null,
    [cardDetails],
  );

  const {
    initiateProvisioning: initiatePushProvisioning,
    isProvisioning: isPushProvisioning,
    canAddToWallet,
  } = usePushProvisioning({
    cardDetails: cardDetailsForProvisioning,
    userAddress: userAddressForProvisioning,
    onSuccess: () => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.push_provisioning.success_message', {
              walletName: getWalletName(),
            }),
          },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
    },
    onError: (error) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label:
              error.message || strings('card.push_provisioning.error_unknown'),
          },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.error.muted,
        hasNoTimeout: false,
      });
    },
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAllData]);

  useEffect(() => {
    // Early return if already tracked to prevent any possibility of duplicate tracking
    if (hasTrackedCardHomeView.current) {
      return;
    }

    // Don't track while SDK is still loading to prevent premature tracking
    if (isSDKLoading) {
      return;
    }

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
      // Set flag immediately to prevent race conditions
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
    balanceFormatted,
    balanceFiat,
    rawTokenBalance,
    rawFiatNumber,
    trackEvent,
    createEventBuilder,
    isSDKLoading,
  ]);

  // Show toast notification when navigating from deeplink
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
        .addProperties({
          action: CardActions.OPEN_ONBOARDING_DELEGATION_FLOW,
        })
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
        .addProperties({
          action: CardActions.CHANGE_ASSET_BUTTON,
        })
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
        .addProperties({
          action: CardActions.MANAGE_SPENDING_LIMIT_BUTTON,
        })
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

  const userShippingAddress: ShippingAddress | undefined = useMemo(
    () => buildShippingAddress(kycStatus?.userDetails),
    [kycStatus?.userDetails],
  );

  const orderMetalCardAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ORDER_METAL_CARD_BUTTON,
        })
        .build(),
    );

    navigation.navigate(Routes.CARD.CHOOSE_YOUR_CARD, {
      flow: 'upgrade',
      shippingAddress: userShippingAddress,
    });
  }, [navigation, trackEvent, createEventBuilder, userShippingAddress]);

  const isUserEligibleForMetalCard = useMemo(
    () =>
      isMetalCardCheckoutEnabled &&
      isBaanxLoginEnabled &&
      isAuthenticated &&
      userLocation === 'us' &&
      userShippingAddress &&
      cardDetails?.type === CardType.VIRTUAL,
    [
      isMetalCardCheckoutEnabled,
      isBaanxLoginEnabled,
      isAuthenticated,
      userLocation,
      userShippingAddress,
      cardDetails,
    ],
  );

  const showCardDetailsErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_home.view_card_details_error') },
      ],
      hasNoTimeout: false,
      iconName: IconName.Warning,
    });
  }, [toastRef]);

  const onCardDetailsImageError = useCallback(() => {
    clearCardDetailsImageUrl();
    showCardDetailsErrorToast();
  }, [clearCardDetailsImageUrl, showCardDetailsErrorToast]);

  const fetchAndShowCardDetails = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VIEW_CARD_DETAILS_BUTTON,
          card_type: cardDetails?.type,
        })
        .build(),
    );

    try {
      await fetchCardDetailsToken(cardDetails?.type);
    } catch {
      showCardDetailsErrorToast();
    }
  }, [
    fetchCardDetailsToken,
    showCardDetailsErrorToast,
    cardDetails?.type,
    trackEvent,
    createEventBuilder,
  ]);

  const viewCardDetailsAction = useCallback(async () => {
    if (isCardDetailsLoading || isCardDetailsImageLoading) {
      return;
    }

    // If already showing details, just hide them (no auth needed)
    if (cardDetailsImageUrl) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.HIDE_CARD_DETAILS_BUTTON,
          })
          .build(),
      );
      clearCardDetailsImageUrl();
      return;
    }

    // Require biometric verification before showing card details
    try {
      await reauthenticate();
      // Biometric authentication succeeded
      await fetchAndShowCardDetails();
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Biometrics not configured - show password bottom sheet as fallback
      if (
        errorMessage.includes(
          ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
        )
      ) {
        navigation.navigate(
          ...createPasswordBottomSheetNavigationDetails({
            onSuccess: fetchAndShowCardDetails,
          }),
        );
        return;
      }

      // User cancelled biometric - silently return
      if (errorMessage.includes(ReauthenticateErrorType.BIOMETRIC_ERROR)) {
        return;
      }

      // Other authentication failures
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.card_home.biometric_verification_required'),
          },
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
    reauthenticate,
    fetchAndShowCardDetails,
    navigation,
    toastRef,
    trackEvent,
    createEventBuilder,
  ]);

  const cardSetupState = useMemo(() => {
    const needsSetup =
      isBaanxLoginEnabled &&
      (warning === CardStateWarning.NoCard ||
        warning === CardStateWarning.NeedDelegation);

    const isKYCVerified =
      isAuthenticated && kycStatus?.verificationState === 'VERIFIED';

    const isKYCPending =
      isBaanxLoginEnabled &&
      isAuthenticated &&
      (kycStatus?.verificationState === 'PENDING' ||
        kycStatus?.verificationState === 'UNVERIFIED');

    const canEnable = isKYCVerified && !isLoading;

    const setupTestId =
      warning === CardStateWarning.NoCard
        ? CardHomeSelectors.ENABLE_CARD_BUTTON
        : CardHomeSelectors.ENABLE_ASSETS_BUTTON;

    return { needsSetup, canEnable, isKYCPending, setupTestId };
  }, [warning, isBaanxLoginEnabled, isAuthenticated, kycStatus, isLoading]);

  /**
   * Check if the card is being provisioned.
   * Show info box when: VERIFIED + has delegated assets + card not yet provisioned
   */
  const isCardProvisioning = useMemo(
    () =>
      isAuthenticated &&
      kycStatus?.verificationState === 'VERIFIED' &&
      warning === CardStateWarning.NoCard &&
      (externalWalletDetailsData?.mappedWalletDetails?.length ?? 0) > 0,
    [isAuthenticated, kycStatus, warning, externalWalletDetailsData],
  );

  const ButtonsSection = useMemo(() => {
    if (isLoading) {
      return (
        <Skeleton
          height={28}
          width={'100%'}
          style={tw.style('rounded-xl')}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
        />
      );
    }

    if (!isBaanxLoginEnabled) {
      return (
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('card.card_home.add_funds')}
          size={ButtonSize.Lg}
          onPress={addFundsAction}
          width={ButtonWidthTypes.Full}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
        />
      );
    }

    if (isCardProvisioning) {
      return null;
    }

    if (cardSetupState.needsSetup) {
      if (!cardSetupState.canEnable) {
        return null;
      }

      return (
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('card.card_home.enable_card_button_label')}
          size={ButtonSize.Lg}
          onPress={openOnboardingDelegationAction}
          width={ButtonWidthTypes.Full}
          testID={cardSetupState.setupTestId}
        />
      );
    }

    return (
      <Box twClassName="w-full gap-2 flex-row justify-between items-center">
        <Button
          variant={ButtonVariants.Secondary}
          style={tw.style(
            'w-1/2',
            !isSwapEnabledForPriorityToken && 'opacity-50',
          )}
          label={strings('card.card_home.add_funds')}
          size={ButtonSize.Lg}
          onPress={addFundsAction}
          width={ButtonWidthTypes.Full}
          disabled={!isSwapEnabledForPriorityToken}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
        />
        <Button
          variant={ButtonVariants.Secondary}
          style={tw.style('w-1/2')}
          label={strings('card.card_home.change_asset')}
          size={ButtonSize.Lg}
          onPress={changeAssetAction}
          width={ButtonWidthTypes.Full}
          testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
        />
      </Box>
    );
  }, [
    addFundsAction,
    changeAssetAction,
    cardSetupState,
    isBaanxLoginEnabled,
    isLoading,
    isSwapEnabledForPriorityToken,
    tw,
    openOnboardingDelegationAction,
    isCardProvisioning,
  ]);

  useEffect(
    () => () => {
      isComponentUnmountedRef.current = true;
    },
    [],
  );

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
      } catch (error) {
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

  /**
   * Check if the current token supports the spending limit progress bar feature.
   * Some tokens (e.g., aUSDC) have different allowance behavior and are unsupported.
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
   * This warning is shown when the user is close to their spending limit.
   * We should show when the user has consumed 80% or more of their total allowance.
   * This matches the progress bar color change threshold.
   */
  const isCloseSpendingLimitWarning = useMemo(() => {
    if (!isAuthenticated || !isSpendingLimitSupported) {
      return false;
    }

    const totalAllowance = Number(priorityToken?.totalAllowance) || 0;
    const remainingAllowance = Number(priorityToken?.allowance) || 0;

    // Show warning when remaining allowance is 20% or less of total (consumed >= 80%)
    return (
      priorityToken?.allowanceState === AllowanceState.Limited &&
      remainingAllowance <= totalAllowance * 0.2
    );
  }, [isAuthenticated, isSpendingLimitSupported, priorityToken]);

  if (cardError) {
    const isAuthError = isAuthenticated && isAuthenticationError(cardError);

    if (isHandlingAuthError || isAuthError) {
      return (
        <Box twClassName="flex-1 items-center justify-center bg-background-default">
          <ActivityIndicator size="large" />
        </Box>
      );
    }

    return (
      <Box twClassName="flex-1 items-center justify-center bg-background-default gap-2">
        <Icon
          name={IconName.Forest}
          size={IconSize.Xl}
          color={IconColor.Default}
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
        {retries < 3 && !isAuthenticationError(cardError) && (
          <Box twClassName="pt-2">
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                setRetries((prevState) => prevState + 1);
                fetchAllData();
              }}
              testID={CardHomeSelectors.TRY_AGAIN_BUTTON}
            />
          </Box>
        )}
      </Box>
    );
  }

  return (
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
      <Text style={tw.style('px-4 pt-4')} variant={TextVariant.HeadingLg}>
        {strings('card.card_home.title')}
      </Text>
      {isCloseSpendingLimitWarningShown && isCloseSpendingLimitWarning && (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onConfirm={() => {
            navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
              flow: 'enable',
              priorityToken,
              allTokens,
              delegationSettings,
              externalWalletDetailsData,
            });
          }}
          onDismiss={() => {
            setIsCloseSpendingLimitWarningShown(false);
          }}
        />
      )}
      {cardSetupState.isKYCPending && (
        <CardMessageBox messageType={CardMessageBoxType.KYCPending} />
      )}
      {isCardProvisioning && (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      )}
      <Box twClassName="mt-4 bg-background-muted rounded-lg mx-4 py-4 px-4">
        <Box twClassName="w-full relative">
          {isLoading || isCardDetailsLoading ? (
            <Box
              twClassName="w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: 851 / 540 }}
            >
              <Skeleton
                height={'100%'}
                width={'100%'}
                style={tw.style('rounded-xl')}
                testID={
                  isCardDetailsLoading
                    ? CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON
                    : undefined
                }
              />
            </Box>
          ) : cardDetailsImageUrl ? (
            <Box
              twClassName="w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: 851 / 540 }}
            >
              {isCardDetailsImageLoading && (
                <Skeleton
                  height={'100%'}
                  width={'100%'}
                  style={tw.style('rounded-xl absolute inset-0 z-10')}
                  testID={CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON}
                />
              )}
              <Image
                source={{ uri: cardDetailsImageUrl }}
                style={tw.style('w-full h-full')}
                resizeMode="cover"
                onLoad={onCardDetailsImageLoad}
                onError={onCardDetailsImageError}
                testID={CardHomeSelectors.CARD_DETAILS_IMAGE}
              />
            </Box>
          ) : (
            <CardImage
              type={cardDetails?.type ?? CardType.VIRTUAL}
              status={cardDetails?.status ?? CardStatus.ACTIVE}
              address={priorityToken?.walletAddress}
            />
          )}
        </Box>
        <Box
          style={tw.style(
            'items-center justify-between flex-row w-full mt-4',
            cardSetupState.needsSetup && 'hidden',
          )}
        >
          <Box twClassName="flex-col">
            <Box twClassName="flex-row items-center gap-2">
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                variant={ComponentTextVariant.HeadingMD}
              >
                {isLoading ||
                balanceAmount === TOKEN_BALANCE_LOADING ||
                balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                  <Skeleton
                    height={28}
                    width={100}
                    style={tw.style('rounded-xl')}
                    testID={CardHomeSelectors.BALANCE_SKELETON}
                  />
                ) : (
                  (balanceAmount ?? '0')
                )}
              </SensitiveText>
              <TouchableOpacity
                onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
                testID={CardHomeSelectors.PRIVACY_TOGGLE_BUTTON}
                style={tw.style(isLoading ? 'hidden' : '')}
              >
                <Icon
                  name={privacyMode ? IconName.EyeSlash : IconName.Eye}
                  size={IconSize.Md}
                  color={IconColor.Default}
                />
              </TouchableOpacity>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              twClassName={`text-text-alternative ${isLoading ? 'hidden' : ''}`}
            >
              {strings('card.card_home.available_balance')}
            </Text>
          </Box>
          {isLoading ? (
            <Skeleton
              height={40}
              width={40}
              style={tw.style('rounded-full')}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          ) : (
            <CardAssetItem
              asset={asset}
              privacyMode={privacyMode}
              balanceFormatted={balanceFormatted}
            />
          )}
        </Box>
        {isAllowanceLimited && (
          <Box twClassName="w-full">
            <Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-text-alternative"
              >
                {strings('card.card_home.limited_spending_warning')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-text-alternative font-bold"
              >
                {strings(
                  'card.card_home.manage_card_options.manage_spending_limit',
                )}
                {'.'}
              </Text>
            </Text>
          </Box>
        )}
        {isAuthenticated &&
          isSpendingLimitSupported &&
          priorityToken?.allowanceState === AllowanceState.Limited && (
            <SpendingLimitProgressBar
              isLoading={isLoading}
              decimals={priorityToken?.decimals ?? 6}
              totalAllowance={priorityToken?.totalAllowance ?? '0'}
              remainingAllowance={priorityToken?.allowance ?? '0'}
              symbol={priorityToken?.symbol ?? ''}
            />
          )}
        {ButtonsSection && (
          <Box twClassName="w-full mt-4">{ButtonsSection}</Box>
        )}
      </Box>

      {!isLoading && canAddToWallet && (
        <Box twClassName="w-full px-4 pt-4 items-center justify-center">
          {isPushProvisioning ? (
            <Box twClassName="py-3">
              <ActivityIndicator
                size="large"
                color={theme.colors.primary.default}
              />
            </Box>
          ) : (
            <AddToWalletButton
              onPress={
                isPushProvisioning ? undefined : initiatePushProvisioning
              }
              buttonStyle="blackOutline"
              buttonType="basic"
              borderRadius={4}
            />
          )}
        </Box>
      )}

      <Box style={tw.style(cardSetupState.needsSetup && 'hidden')}>
        {isAuthenticated && !isLoading && cardDetails && (
          <ManageCardListItem
            title={strings(
              cardDetailsImageUrl
                ? 'card.card_home.manage_card_options.hide_card_details'
                : 'card.card_home.manage_card_options.view_card_details',
            )}
            description={strings(
              'card.card_home.manage_card_options.view_card_details_description',
            )}
            onPress={viewCardDetailsAction}
            testID={CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON}
          />
        )}
        {isBaanxLoginEnabled &&
          !isLoading &&
          !isSolanaChainId(priorityToken?.caipChainId ?? '') && (
            <ManageCardListItem
              title={strings(
                'card.card_home.manage_card_options.manage_spending_limit',
              )}
              description={strings(
                priorityToken?.allowanceState === AllowanceState.Enabled
                  ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
                  : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted',
              )}
              rightIcon={IconName.ArrowRight}
              onPress={manageSpendingLimitAction}
              testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
            />
          )}
      </Box>
      {!isLoading && !cardSetupState.isKYCPending && !isCardProvisioning && (
        <>
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.manage_card')}
            description={strings(
              'card.card_home.manage_card_options.advanced_card_management_description',
            )}
            rightIcon={IconName.Export}
            onPress={navigateToCardPage}
            testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
          />
          {isUserEligibleForMetalCard && (
            <ManageCardListItem
              title={strings(
                'card.card_home.manage_card_options.order_metal_card',
              )}
              description={strings(
                'card.card_home.manage_card_options.order_metal_card_description',
              )}
              rightIcon={IconName.ArrowRight}
              onPress={orderMetalCardAction}
              testID={CardHomeSelectors.ORDER_METAL_CARD_ITEM}
            />
          )}
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.travel_title')}
            description={strings(
              'card.card_home.manage_card_options.travel_description',
            )}
            rightIcon={IconName.Export}
            onPress={navigateToTravelPage}
            testID={CardHomeSelectors.TRAVEL_ITEM}
          />
        </>
      )}
      {isAuthenticated && !isLoading && (
        <>
          <Box
            twClassName={`h-px mx-4 bg-border-muted ${cardSetupState.isKYCPending || isCardProvisioning ? 'hidden' : ''}`}
          />
          <TouchableOpacity
            onPress={navigateToCardTosPage}
            testID={CardHomeSelectors.CARD_TOS_ITEM}
            style={tw.style('py-4 px-4')}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('card.card_home.manage_card_options.card_tos_title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={logoutAction}
            testID={CardHomeSelectors.LOGOUT_ITEM}
            style={tw.style('py-4 px-4 mb-6')}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('card.card_home.logout')}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <CardScreenshotDeterrent enabled={!!cardDetailsImageUrl} />
    </ScrollView>
  );
};

export default CardHome;
