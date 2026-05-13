import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import {
  StackActions,
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  selectIsCardAuthenticated,
  selectCardUserLocation,
  selectIsCardholder,
} from '../../../../../selectors/cardController';
import {
  CardStatus,
  FundingAssetStatus,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import SpendingLimitProgressBar from '../../components/SpendingLimitProgressBar/SpendingLimitProgressBar';
import { AddToWalletButton } from '../../pushProvisioning/components/AddToWalletButton';
import { CardScreenshotDeterrent } from '../../components/CardScreenshotDeterrent';
import AnimatedSpinner from '../../../AnimatedSpinner';
import Routes from '../../../../../constants/navigation/Routes';
import { TOKEN_RATE_UNDEFINED } from '../../../Tokens/constants';
import { isSpendingLimitSupportedToken } from '../../constants';
import { CardHomeSelectors } from './CardHome.testIds';
import CardAlertSection from './components/CardAlertSection';
import CardActionsButtons from './components/CardActionsButtons';
import CardBalanceHeader from './components/CardBalanceHeader';
import CardActionPills from './components/CardActionPills';
import CardCashbackBanner from './components/CardCashbackBanner';
import FlippableCard from './components/FlippableCard';
import ManageCardOptionsSlim from './components/ManageCardOptionsSlim';
import { useCardHomeActions } from './hooks/useCardHomeActions';
import { useCardHomeAnalytics } from './hooks/useCardHomeAnalytics';
import { useCardProvisioning } from './hooks/useCardProvisioning';

interface CardHomeRouteParams {
  showDeeplinkToast?: boolean;
}

const SETUP_ALERT_TYPES = new Set(['kyc_pending', 'card_provisioning']);

const CardHome = () => {
  // --- Data ---
  const { data, isLoading, isError, refetch, primaryToken } = useCardHomeData();
  const capabilities = useCardCapabilities();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const isCardholder = useSelector(selectIsCardholder);
  const userLocation = useSelector(selectCardUserLocation);
  const privacyMode = useSelector(selectPrivacyMode);
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: CardHomeRouteParams }, 'params'>>();
  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);

  const isSwapEnabled = useIsSwapEnabledForPriorityToken(
    data?.primaryFundingAsset?.walletAddress,
  );

  const isFrozen = data?.card?.status === CardStatus.FROZEN;

  const hasSetupActions = (data?.actions ?? []).some(
    (a) => a.type === 'enable_card',
  );

  // --- Extracted hooks ---
  const actions = useCardHomeActions({
    data,
    primaryToken,
    isFrozen,
  });

  const { initiateProvisioning, isProvisioning, canAddToWallet } =
    useCardProvisioning(data);

  useCardHomeAnalytics({
    data,
    isLoading,
    hasSetupActions,
    balanceFormatted: primaryToken?.balanceFormatted,
    rawTokenBalance: primaryToken?.rawTokenBalance,
    rawFiatNumber: primaryToken?.rawFiatNumber,
  });

  const [isSpendingLimitWarningDismissed, setIsSpendingLimitWarningDismissed] =
    useState(false);

  const handleTogglePrivacy = useCallback((value: boolean) => {
    Engine.context.PreferencesController.setPrivacyMode(value);
  }, []);

  // --- Pull-to-refresh ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // --- Refetch card data when the screen regains focus (e.g. after a swap) ---
  const refetched = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!refetched.current) {
        refetched.current = true;
        refetch();
      }
    }, [refetch]),
  );

  // --- Auth state transition: navigate to auth screen on logout ---
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    const wasAuth = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (wasAuth && !isAuthenticated) {
      navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
    }
  }, [isAuthenticated, navigation]);

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
  const balanceAmount = useMemo(() => {
    const { balanceFiat, balanceFormatted } = primaryToken ?? {};
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return balanceFormatted;
    }
    return balanceFiat;
  }, [primaryToken]);

  const hasSetupAlerts = (data?.alerts ?? []).some((a) =>
    SETUP_ALERT_TYPES.has(a.type),
  );

  const hasAlertOnlyState =
    hasSetupAlerts && (data?.actions ?? []).length === 0;

  const showSpendingLimitProgress =
    isAuthenticated &&
    data?.primaryFundingAsset?.status === FundingAssetStatus.Limited &&
    isSpendingLimitSupportedToken(data?.primaryFundingAsset?.symbol) &&
    !hasSetupActions;

  const hasPriorityTokenBalance = (primaryToken?.rawTokenBalance ?? 0) > 0;

  // Logged-out cardholders still see the action/manage UI; every tap routes
  // to auth via useCardHomeActions.
  const isLoggedOutCardholder = !isAuthenticated && isCardholder;

  const isFullySetUp =
    !isLoading &&
    !hasSetupActions &&
    !hasAlertOnlyState &&
    (!!data?.card || isLoggedOutCardholder);

  const hideManageOptions = isAuthenticated && !hasPriorityTokenBalance;

  // --- Action pill visibility (only after onboarding is complete) ---
  const showActionPills = isFullySetUp && !hideManageOptions;
  const showCashbackBanner =
    isAuthenticated &&
    !hasSetupActions &&
    !hasAlertOnlyState &&
    !!capabilities?.supportsCashback &&
    data?.account?.verificationStatus === 'VERIFIED';
  void userLocation; // userLocation reserved for future regional gating

  // --- Error state ---
  if (isError) {
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
    );
  }

  // --- Main render ---
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
      <Box twClassName="mx-4 mt-2">
        <CardAlertSection
          alerts={(data?.alerts ?? []).filter(
            (a) =>
              !(
                a.type === 'close_to_spending_limit' &&
                isSpendingLimitWarningDismissed
              ),
          )}
          onNavigateToSpendingLimit={actions.manageSpendingLimitAction}
          onDismissSpendingLimitWarning={() =>
            setIsSpendingLimitWarningDismissed(true)
          }
        />
      </Box>

      {!hasSetupActions && !hasAlertOnlyState && (
        <CardBalanceHeader
          isLoading={isLoading}
          balanceAmount={balanceAmount}
          privacyMode={privacyMode}
          onTogglePrivacy={handleTogglePrivacy}
        />
      )}

      <Box twClassName="mx-4">
        <FlippableCard
          isLoading={isLoading}
          cardDetailsImageUrl={actions.cardDetailsImageUrl}
          isCardDetailsImageLoading={actions.isCardDetailsImageLoading}
          onImageLoad={actions.onCardDetailsImageLoad}
          onImageError={actions.onCardDetailsImageError}
          cardType={data?.card?.type}
          cardStatus={data?.card?.status}
          walletAddress={
            isAuthenticated
              ? data?.primaryFundingAsset?.walletAddress
              : undefined
          }
        />
      </Box>

      {showSpendingLimitProgress && data?.primaryFundingAsset && (
        <Box twClassName="mx-4 mt-2">
          <SpendingLimitProgressBar
            isLoading={isLoading}
            decimals={data.primaryFundingAsset.decimals ?? 6}
            totalAllowance={
              data.primaryFundingAsset.originalSpendingCap ??
              data.primaryFundingAsset.spendingCap ??
              '0'
            }
            remainingAllowance={data.primaryFundingAsset.spendingCap ?? '0'}
            symbol={data.primaryFundingAsset.symbol ?? ''}
            privacyMode={privacyMode}
            hasOriginalAllowance={
              !!data.primaryFundingAsset.originalSpendingCap
            }
          />
        </Box>
      )}

      {hasSetupActions && (
        <Box twClassName="mx-4 mt-4">
          <CardActionsButtons
            actions={data?.actions ?? []}
            isLoading={isLoading}
            isSwapEnabled={isSwapEnabled}
            onAddFunds={actions.addFundsAction}
            onEnableCard={actions.enableCardAction}
          />
        </Box>
      )}

      {showActionPills && (
        <CardActionPills
          isLoading={isLoading}
          showFund={
            isLoggedOutCardholder ||
            (data?.actions ?? []).some((a) => a.type === 'add_funds')
          }
          isFundDisabled={!isLoggedOutCardholder && !isSwapEnabled}
          onFund={actions.addFundsAction}
          showDetails={isLoggedOutCardholder || !!data?.card}
          isDetailsLoading={
            actions.isCardDetailsLoading || actions.isCardDetailsImageLoading
          }
          isDetailsShown={!!actions.cardDetailsImageUrl}
          onDetails={actions.viewCardDetailsAction}
          showPin={
            isLoggedOutCardholder ||
            (!!capabilities?.supportsPinView && !!data?.card)
          }
          isPinLoading={actions.isPinLoading}
          onPin={actions.viewPinAction}
          showFreeze={
            isLoggedOutCardholder ||
            (!!data?.card?.isFreezable &&
              data?.card?.status !== CardStatus.BLOCKED)
          }
          isFrozen={isFrozen}
          isFreezeLoading={
            actions.freeze.isPending || actions.unfreeze.isPending
          }
          onToggleFreeze={actions.handleToggleFreeze}
        />
      )}

      {!isLoading && canAddToWallet && (
        <Box twClassName="w-full px-4 pt-4 items-center justify-center">
          {isProvisioning ? (
            <Box twClassName="py-3">
              <AnimatedSpinner testID="push-provisioning-spinner" />
            </Box>
          ) : (
            <AddToWalletButton
              onPress={isProvisioning ? undefined : initiateProvisioning}
              buttonStyle="blackOutline"
              buttonType="basic"
              borderRadius={4}
            />
          )}
        </Box>
      )}

      {showCashbackBanner && (
        <CardCashbackBanner
          cardType={data?.card?.type}
          privacyMode={privacyMode}
          onPress={actions.cashbackAction}
        />
      )}

      {showCashbackBanner && (
        <Box twClassName="h-px bg-border-muted mx-4 mt-6" />
      )}

      {showActionPills && (
        <ManageCardOptionsSlim
          primaryToken={primaryToken}
          fundingAssetStatus={data?.primaryFundingAsset?.status}
          onChangeAsset={actions.changeAssetAction}
          onManageSpendingLimit={actions.manageSpendingLimitAction}
        />
      )}

      <CardScreenshotDeterrent enabled={!!actions.cardDetailsImageUrl} />
    </ScrollView>
  );
};

export default CardHome;
