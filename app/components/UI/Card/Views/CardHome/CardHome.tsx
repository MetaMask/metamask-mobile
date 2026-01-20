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
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles from './CardHome.styles';
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
  CardWarningBoxType,
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
} from '../../../../../core/redux/slices/card';
import CardWarningBox from '../../components/CardWarningBox/CardWarningBox';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { isAuthenticationError } from '../../util/isAuthenticationError';
import { removeCardBaanxToken } from '../../util/cardTokenVault';
import useLoadCardData from '../../hooks/useLoadCardData';
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

  const styles = createStyles(theme);

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

  const needToEnableCard = useMemo(
    () => warning === CardStateWarning.NoCard,
    [warning],
  );
  const needToEnableAssets = useMemo(
    () => warning === CardStateWarning.NeedDelegation,
    [warning],
  );

  const canEnableCard = useMemo(() => {
    if (!isBaanxLoginEnabled) {
      return true;
    }

    if (!isAuthenticated || !kycStatus || isLoading) {
      return false;
    }

    return kycStatus.verificationState === 'VERIFIED';
  }, [isAuthenticated, isBaanxLoginEnabled, kycStatus, isLoading]);

  const isKYCPendingOrUnverified = useMemo(() => {
    if (!isAuthenticated || !isBaanxLoginEnabled || !kycStatus) {
      return false;
    }
    return (
      kycStatus.verificationState === 'PENDING' ||
      kycStatus.verificationState === 'UNVERIFIED'
    );
  }, [isAuthenticated, isBaanxLoginEnabled, kycStatus]);

  const ButtonsSection = useMemo(() => {
    if (isLoading) {
      return (
        <Skeleton
          height={28}
          width={'100%'}
          style={styles.skeletonRounded}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
        />
      );
    }

    if (isBaanxLoginEnabled) {
      if (needToEnableCard) {
        if (!canEnableCard) {
          return null;
        }

        // KYC verified users - delegation will automatically provision the card
        return (
          <Button
            variant={ButtonVariants.Primary}
            style={styles.defaultMarginTop}
            label={strings('card.card_home.enable_card_button_label')}
            size={ButtonSize.Lg}
            onPress={openOnboardingDelegationAction}
            width={ButtonWidthTypes.Full}
            disabled={isLoading}
            loading={isLoading}
            testID={CardHomeSelectors.ENABLE_CARD_BUTTON}
          />
        );
      }

      if (needToEnableAssets) {
        return (
          <Button
            variant={ButtonVariants.Primary}
            style={styles.defaultMarginTop}
            label={strings('card.card_home.enable_card_button_label')}
            size={ButtonSize.Lg}
            onPress={openOnboardingDelegationAction}
            width={ButtonWidthTypes.Full}
            disabled={isLoading}
            loading={isLoading}
            testID={CardHomeSelectors.ENABLE_ASSETS_BUTTON}
          />
        );
      }

      return (
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Primary}
            style={
              !isSwapEnabledForPriorityToken
                ? styles.halfWidthButtonDisabled
                : styles.halfWidthButton
            }
            label={strings('card.card_home.add_funds')}
            size={ButtonSize.Lg}
            onPress={addFundsAction}
            width={ButtonWidthTypes.Full}
            disabled={!isSwapEnabledForPriorityToken}
            loading={isLoading}
            testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
          />
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.halfWidthButton}
            label={strings('card.card_home.change_asset')}
            size={ButtonSize.Lg}
            onPress={changeAssetAction}
            width={ButtonWidthTypes.Full}
            loading={isLoading}
            testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
          />
        </View>
      );
    }

    return (
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_home.add_funds')}
        size={ButtonSize.Lg}
        onPress={addFundsAction}
        width={ButtonWidthTypes.Full}
        loading={isLoading}
        testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
      />
    );
  }, [
    addFundsAction,
    changeAssetAction,
    canEnableCard,
    isBaanxLoginEnabled,
    isLoading,
    isSwapEnabledForPriorityToken,
    needToEnableAssets,
    needToEnableCard,
    styles,
    openOnboardingDelegationAction,
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    return (
      <View style={styles.errorContainer}>
        <Icon
          name={IconName.Forest}
          size={IconSize.Xl}
          color={theme.colors.icon.default}
        />
        <Text
          variant={TextVariant.HeadingSM}
          color={theme.colors.text.alternative}
        >
          {strings('card.card_home.error_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={theme.colors.text.alternative}
          style={styles.errorDescription}
        >
          {strings('card.card_home.error_description')}
        </Text>
        {retries < 3 && !isAuthenticationError(cardError) && (
          <View style={styles.tryAgainButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                setRetries((prevState) => prevState + 1);
                fetchAllData();
              }}
              testID={CardHomeSelectors.TRY_AGAIN_BUTTON}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
      contentContainerStyle={styles.contentContainer}
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
      {isCloseSpendingLimitWarningShown && isCloseSpendingLimitWarning && (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
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
      {isAuthenticated && isBaanxLoginEnabled && isKYCPendingOrUnverified && (
        <CardWarningBox warning={CardWarningBoxType.KYCPending} />
      )}
      <View style={styles.cardBalanceContainer}>
        <View
          style={[
            styles.balanceTextContainer,
            styles.defaultHorizontalPadding,
            (needToEnableAssets || needToEnableCard) && styles.shouldBeHidden,
          ]}
        >
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.HeadingLG}
          >
            {isLoading ||
            balanceAmount === TOKEN_BALANCE_LOADING ||
            balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <Skeleton
                height={28}
                width={'50%'}
                style={styles.skeletonRounded}
                testID={CardHomeSelectors.BALANCE_SKELETON}
              />
            ) : (
              (balanceAmount ?? '0')
            )}
          </SensitiveText>
          <TouchableOpacity
            onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
            testID={CardHomeSelectors.PRIVACY_TOGGLE_BUTTON}
          >
            <Icon
              name={privacyMode ? IconName.EyeSlash : IconName.Eye}
              size={IconSize.Md}
              color={theme.colors.icon.alternative}
            />
          </TouchableOpacity>
        </View>
        {isAllowanceLimited && (
          <View
            style={[
              styles.limitedAllowanceWarningContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <Text>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
              >
                {strings('card.card_home.limited_spending_warning', {
                  manageCard: '',
                })}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
                style={styles.limitedAllowanceManageCardText}
              >
                {strings('card.card_home.manage_card_options.manage_card')}
                {'.'}
              </Text>
            </Text>
          </View>
        )}
        <View
          style={[
            styles.cardImageContainer,
            styles.defaultHorizontalPadding,
            isAllowanceLimited && styles.defaultMarginTop,
          ]}
        >
          {isLoading ? (
            <Skeleton
              height={240}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          ) : (
            <CardImage
              type={cardDetails?.type ?? CardType.VIRTUAL}
              status={cardDetails?.status ?? CardStatus.ACTIVE}
              address={priorityToken?.walletAddress}
            />
          )}
        </View>
        <View
          style={[
            styles.cardAssetItemContainer,
            styles.defaultHorizontalPadding,
            (needToEnableAssets || needToEnableCard) && styles.shouldBeHidden,
          ]}
        >
          {isLoading ? (
            <Skeleton
              height={50}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          ) : (
            <CardAssetItem
              asset={asset}
              privacyMode={privacyMode}
              balanceFormatted={balanceFormatted}
            />
          )}
        </View>

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

        <View
          style={[styles.buttonsContainerBase, styles.defaultHorizontalPadding]}
        >
          {ButtonsSection}
        </View>
      </View>

      <View
        style={[
          (needToEnableAssets || needToEnableCard) && styles.shouldBeHidden,
        ]}
      >
        {isBaanxLoginEnabled &&
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
      </View>
      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.manage_card')}
        description={strings(
          'card.card_home.manage_card_options.advanced_card_management_description',
        )}
        rightIcon={IconName.Export}
        onPress={navigateToCardPage}
        testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
      />
      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.travel_title')}
        description={strings(
          'card.card_home.manage_card_options.travel_description',
        )}
        rightIcon={IconName.Export}
        onPress={navigateToTravelPage}
        testID={CardHomeSelectors.TRAVEL_ITEM}
      />

      {isAuthenticated && (
        <>
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.card_tos_title')}
            description={strings(
              'card.card_home.manage_card_options.card_tos_description',
            )}
            rightIcon={IconName.Export}
            onPress={navigateToCardTosPage}
            testID={CardHomeSelectors.CARD_TOS_ITEM}
          />
          <ManageCardListItem
            title={strings('card.card_home.logout')}
            description={strings('card.card_home.logout_description')}
            rightIcon={IconName.Logout}
            onPress={logoutAction}
          />
        </>
      )}
    </ScrollView>
  );
};

export default CardHome;
