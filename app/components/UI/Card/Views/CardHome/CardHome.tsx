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
} from '../../../../../selectors/cardController';
import {
  CardStatus,
  FundingAssetStatus,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectMetalCardCheckoutFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import { useAssetBalances } from '../../hooks/useAssetBalances';
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
import { CardHomeSelectors } from './CardHome.testIds';
import CardAlertSection from './components/CardAlertSection';
import CardActionsButtons from './components/CardActionsButtons';
import CardBalanceDisplay from './components/CardBalanceDisplay';
import CardImageSection from './components/CardImageSection';
import ManageCardOptions from './components/ManageCardOptions';
import CardHomeFooter from './components/CardHomeFooter';
import { useCardHomeActions } from './hooks/useCardHomeActions';
import { useCardHomeAnalytics } from './hooks/useCardHomeAnalytics';
import { useCardProvisioning } from './hooks/useCardProvisioning';
import { toCardTokenAllowance } from '../../util/toCardTokenAllowance';

interface CardHomeRouteParams {
  showDeeplinkToast?: boolean;
}

const SETUP_ALERT_TYPES = new Set(['kyc_pending', 'card_provisioning']);

const CardHome = () => {
  // --- Data ---
  const { data, isLoading, isError, refetch } = useCardHomeData();
  const capabilities = useCardCapabilities();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const userLocation = useSelector(selectCardUserLocation);
  const privacyMode = useSelector(selectPrivacyMode);
  const isMetalCardCheckoutEnabled = useSelector(
    selectMetalCardCheckoutFeatureFlag,
  );
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: CardHomeRouteParams }, 'params'>>();
  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);

  // --- Wallet-side balance data ---
  const legacyPriorityToken = useMemo(
    () => (data?.primaryAsset ? toCardTokenAllowance(data.primaryAsset) : null),
    [data?.primaryAsset],
  );
  const assetBalancesMap = useAssetBalances(
    legacyPriorityToken ? [legacyPriorityToken] : [],
  );
  const assetBalance = legacyPriorityToken
    ? assetBalancesMap.get(
        `${legacyPriorityToken.address?.toLowerCase()}-${legacyPriorityToken.caipChainId}-${legacyPriorityToken.walletAddress?.toLowerCase()}`,
      )
    : undefined;
  const { balanceFiat, balanceFormatted, rawFiatNumber, rawTokenBalance } =
    assetBalance ?? {};

  const isSwapEnabled = useIsSwapEnabledForPriorityToken(
    data?.primaryAsset?.walletAddress,
  );

  const isFrozen = data?.card?.status === CardStatus.FROZEN;

  const hasSetupActions = (data?.actions ?? []).some(
    (a) => a.type === 'enable_card',
  );

  // --- Extracted hooks ---
  const actions = useCardHomeActions({
    data,
    legacyPriorityToken,
    isFrozen,
  });

  const { initiateProvisioning, isProvisioning, canAddToWallet } =
    useCardProvisioning(data);

  useCardHomeAnalytics({
    data,
    isLoading,
    hasSetupActions,
    balanceFormatted,
    rawTokenBalance,
    rawFiatNumber,
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
    if (
      (actions.freeze.isError || actions.unfreeze.isError) &&
      toastRef?.current
    ) {
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
  }, [actions.freeze.isError, actions.unfreeze.isError, toastRef]);

  // --- Derived state ---
  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return balanceFormatted;
    }
    return balanceFiat;
  }, [balanceFiat, balanceFormatted]);

  const hasSetupAlerts = (data?.alerts ?? []).some((a) =>
    SETUP_ALERT_TYPES.has(a.type),
  );

  const hasAlertOnlyState =
    hasSetupAlerts && (data?.actions ?? []).length === 0;

  const showSpendingLimitProgress =
    isAuthenticated &&
    data?.primaryAsset?.status === FundingAssetStatus.Limited &&
    !hasSetupActions;

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
      <Text style={tw.style('px-4 pt-4')} variant={TextVariant.HeadingLg}>
        {strings('card.card_home.title')}
      </Text>

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

      <Box twClassName="mt-4 bg-background-muted rounded-lg mx-4 py-4 px-4">
        <Box twClassName="w-full relative">
          <CardImageSection
            isLoading={isLoading}
            isCardDetailsLoading={actions.isCardDetailsLoading}
            cardDetailsImageUrl={actions.cardDetailsImageUrl}
            isCardDetailsImageLoading={actions.isCardDetailsImageLoading}
            onImageLoad={actions.onCardDetailsImageLoad}
            onImageError={actions.onCardDetailsImageError}
            cardType={data?.card?.type}
            cardStatus={data?.card?.status}
            walletAddress={
              isAuthenticated ? data?.primaryAsset?.walletAddress : undefined
            }
          />
        </Box>

        {!hasSetupActions && !hasAlertOnlyState && (
          <CardBalanceDisplay
            isLoading={isLoading}
            balanceAmount={balanceAmount}
            privacyMode={privacyMode}
            assetBalance={assetBalance}
            onTogglePrivacy={handleTogglePrivacy}
          />
        )}

        {showSpendingLimitProgress && data?.primaryAsset && (
          <SpendingLimitProgressBar
            isLoading={isLoading}
            decimals={data.primaryAsset.decimals ?? 6}
            totalAllowance={data.primaryAsset.allowance ?? '0'}
            remainingAllowance={data.primaryAsset.balance ?? '0'}
            symbol={data.primaryAsset.symbol ?? ''}
          />
        )}

        {((data?.actions ?? []).length > 0 || isLoading) && (
          <Box twClassName="w-full mt-4">
            <CardActionsButtons
              actions={data?.actions ?? []}
              isLoading={isLoading}
              isSwapEnabled={isSwapEnabled}
              onAddFunds={actions.addFundsAction}
              onChangeAsset={actions.changeAssetAction}
              onEnableCard={actions.enableCardAction}
            />
          </Box>
        )}
      </Box>

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

      <ManageCardOptions
        card={data?.card}
        account={data?.account}
        primaryAsset={data?.primaryAsset}
        capabilities={capabilities}
        isMetalCardCheckoutEnabled={isMetalCardCheckoutEnabled}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        hasSetupActions={hasSetupActions}
        hasAlertOnlyState={hasAlertOnlyState}
        hasSetupAlerts={hasSetupAlerts}
        userLocation={userLocation}
        isFrozen={isFrozen}
        isFreezeLoading={actions.freeze.isPending || actions.unfreeze.isPending}
        isPinLoading={actions.isPinLoading}
        cardDetailsImageUrl={actions.cardDetailsImageUrl}
        onViewCardDetails={actions.viewCardDetailsAction}
        onViewPin={actions.viewPinAction}
        onToggleFreeze={actions.handleToggleFreeze}
        onManageSpendingLimit={actions.manageSpendingLimitAction}
        onOrderMetalCard={actions.orderMetalCardAction}
        onNavigateToCardPage={actions.navigateToCardPage}
        onCashback={actions.cashbackAction}
        onTravel={actions.navigateToTravelPage}
      />

      <CardHomeFooter
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        hasAlerts={hasAlertOnlyState}
        hasSetupActions={hasSetupActions}
        onNavigateToCardTos={actions.navigateToCardTosPage}
        onLogout={actions.logoutAction}
      />

      <CardScreenshotDeterrent enabled={!!actions.cardDetailsImageUrl} />
    </ScrollView>
  );
};

export default CardHome;
