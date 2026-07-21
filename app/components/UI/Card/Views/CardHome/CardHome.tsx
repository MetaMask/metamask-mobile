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
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import {
  CommonActions,
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
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  selectIsCardAuthenticated,
  selectCardLastUnauthenticatedReason,
  selectCardUserLocation,
  selectCardHomeDataStatus,
  selectCardRedemptionDestinationIsMoneyAccount,
  selectMoneyAccountVedaTokenConfig,
  selectCardActiveProviderId,
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
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectMetalCardCheckoutFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import useCreditBalance from '../../hooks/useCreditBalance';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import MoneyMetaMaskCard from '../../../Money/components/MoneyMetaMaskCard';
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
import { CardType, CardMessageBoxType } from '../../types';
import {
  isSpendingLimitSupportedToken,
  IMMERSVE_SUPPORT_EMAIL,
  IMMERSVE_TERMS_URL,
} from '../../constants';
import { CardHomeSelectors } from './CardHome.testIds';
import CardAlertSection from './components/CardAlertSection';
import CardActionsButtons from './components/CardActionsButtons';
import CardBalanceDisplay from './components/CardBalanceDisplay';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import { formatWithThreshold } from '../../../../../util/assets';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import CardImageSection from './components/CardImageSection';
import ManageCardOptions from './components/ManageCardOptions';
import CardHomeFooter from './components/CardHomeFooter';
import { useCardHomeActions } from './hooks/useCardHomeActions';
import { useCardHomeAnalytics } from './hooks/useCardHomeAnalytics';
import { useCardProvisioning } from './hooks/useCardProvisioning';
import { useImmersveCardProvisioning } from './hooks/useImmersveCardProvisioning';
import { CardEntryPoint, CardFlow, CardScreens } from '../../util/metrics';

interface CardHomeRouteParams {
  showDeeplinkToast?: boolean;
}

const SETUP_ALERT_TYPES = new Set(['kyc_pending', 'card_provisioning']);

const CardHome = () => {
  // --- Data ---
  const { data, isLoading, isError, refetch, primaryToken } = useCardHomeData();
  const capabilities = useCardCapabilities();
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
  const isImmersve = useSelector(selectCardActiveProviderId) === 'immersve';
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

  // --- Extracted hooks ---
  const actions = useCardHomeActions({
    data,
    primaryToken,
    isFrozen,
    cardTermsAndConditionsUrl,
    capabilities,
  });

  const isBlocked = data?.card?.status === CardStatus.BLOCKED;

  const { initiateProvisioning, isProvisioning, canAddToWallet } =
    useCardProvisioning(data);

  const {
    pendingAction: immersvePendingAction,
    resumePendingAction,
    isReconciling: isReconcilingImmersveProvisioning,
  } = useImmersveCardProvisioning(data);

  // --- Money Account linkage ---
  const {
    canLink: canLinkMoneyAccount,
    startLinkFlow: startMoneyAccountLink,
    isLinking: isMoneyAccountLinkInProgress,
  } = useMoneyAccountCardLinkage();
  const { apyPercent: moneyAccountApyPercent } = useMoneyAccountBalance();
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
    if (
      wasAuth &&
      !isAuthenticated &&
      lastUnauthenticatedReason !== 'onboarding_token_revoked'
    ) {
      navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
    }
  }, [isAuthenticated, lastUnauthenticatedReason, navigation]);

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

  const handleRedeemCredit = useCallback(() => {
    navigation.navigate(Routes.CARD.CREDIT_REDEEM);
  }, [navigation]);

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

  const isSpendingLimitActive =
    data?.primaryFundingAsset?.status === FundingAssetStatus.Active;

  const hasPriorityTokenBalance = (primaryToken?.rawTokenBalance ?? 0) > 0;

  const canUnlinkMoneyAccount = useMemo(() => {
    if (!primaryToken?.isMoneyAccountEntry) return false;

    const tokenMoneyAccountAddress = primaryToken.walletAddress;
    const activeMoneyAccountAddress = primaryMoneyAccount?.address;
    return Boolean(
      tokenMoneyAccountAddress &&
        activeMoneyAccountAddress &&
        tokenMoneyAccountAddress.toLowerCase() ===
          activeMoneyAccountAddress.toLowerCase(),
    );
  }, [
    primaryMoneyAccount?.address,
    primaryToken?.isMoneyAccountEntry,
    primaryToken?.walletAddress,
  ]);

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

  // --- Error state ---
  if (isError) {
    return (
      <Box twClassName="flex-1 bg-background-default">
        <HeaderStandard
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
        />
        <Box twClassName="flex-1 items-center justify-center gap-2">
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
      </Box>
    );
  }

  // --- Main render ---
  return (
    <Box twClassName="flex-1 bg-background-default">
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
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
            hasPendingVerification={Boolean(immersvePendingAction)}
            onContinueVerification={resumePendingAction}
            isReconcilingProvisioning={isReconcilingImmersveProvisioning}
          />
        </Box>

        {isBlocked && (
          <Box twClassName="mx-4 mt-2">
            <CardMessageBox messageType={CardMessageBoxType.Blocked} />
          </Box>
        )}

        <Box twClassName="mt-4 bg-background-muted rounded-lg mx-4 py-4 px-4">
          <Box twClassName="w-full relative">
            <CardImageSection
              isLoading={isLoading}
              isCardDetailsLoading={
                actions.isCardDetailsLoading ||
                actions.isSensitiveDetailsLoading
              }
              cardDetailsImageUrl={actions.cardDetailsImageUrl}
              isCardDetailsImageLoading={actions.isCardDetailsImageLoading}
              onImageLoad={actions.onCardDetailsImageLoad}
              onImageError={actions.onCardDetailsImageError}
              cardSensitiveDetails={actions.cardSensitiveDetails}
              onCopyDetail={actions.copyCardDetail}
              cardType={data?.card?.type}
              cardStatus={data?.card?.status}
              walletAddress={
                isAuthenticated
                  ? primaryToken?.isMoneyAccountEntry
                    ? strings('card.card_spending_limit.money_account_label')
                    : data?.primaryFundingAsset?.walletAddress
                  : undefined
              }
            />
          </Box>

          {!hasSetupActions && !hasAlertOnlyState && (
            <CardBalanceDisplay
              isLoading={isLoading}
              balanceAmount={balanceAmount}
              privacyMode={privacyMode}
              assetBalance={primaryToken ?? undefined}
              onTogglePrivacy={handleTogglePrivacy}
              showInfoBadge={creditIncludedInBalance}
              onInfoPress={handleOpenCreditBalanceTooltip}
              infoBadgeTestID={CardHomeSelectors.CREDIT_BALANCE_INFO_BUTTON}
            />
          )}

          {showSpendingLimitProgress && data?.primaryFundingAsset && (
            <SpendingLimitProgressBar
              isLoading={isLoading}
              decimals={data.primaryFundingAsset.decimals ?? 6}
              totalAllowance={
                data.primaryFundingAsset.originalSpendingCap ??
                data.primaryFundingAsset.spendingCap ??
                '0'
              }
              remainingAllowance={data.primaryFundingAsset.spendingCap ?? '0'}
              symbol={
                primaryToken?.displaySymbol ??
                data.primaryFundingAsset.symbol ??
                ''
              }
              privacyMode={privacyMode}
              hasOriginalAllowance={
                !!data.primaryFundingAsset.originalSpendingCap
              }
            />
          )}

          {((data?.actions ?? []).length > 0 || isLoading) && (
            <Box twClassName="w-full mt-4">
              <CardActionsButtons
                actions={data?.actions ?? []}
                isLoading={isLoading}
                isSwapEnabled={isSwapEnabled}
                isMoneyAccountEntry={!!primaryToken?.isMoneyAccountEntry}
                onAddFunds={actions.addFundsAction}
                onEnableCard={actions.enableCardAction}
              />
            </Box>
          )}
        </Box>

        {credit.hasCredit && !hasSetupActions && !hasAlertOnlyState && (
          <Box twClassName="mx-4 mt-4" testID={CardHomeSelectors.CREDIT_BANNER}>
            <CardMessageBox
              messageType={
                redeemsToMoneyAccount
                  ? CardMessageBoxType.CreditAvailable
                  : CardMessageBoxType.CreditAvailableNoMoneyAccount
              }
              values={{ amount: refundFiatLabel }}
              onConfirm={handleRedeemCredit}
            />
          </Box>
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

        {canLinkMoneyAccount && (
          <>
            <Box twClassName="mb-6 mt-7">
              <MoneyMetaMaskCard
                mode="link"
                hideCardImage
                apy={moneyAccountApyPercent}
                showMetalCard={hasMetalCard}
                isLinkDisabled={isMoneyAccountLinkInProgress}
                onGetNowPress={handleLinkMoneyAccountCard}
                onHeaderPress={handleLinkMoneyAccountCard}
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

        {!isBlocked && (
          <ManageCardOptions
            card={data?.card}
            account={data?.account}
            capabilities={capabilities}
            isSpendingLimitActive={isSpendingLimitActive}
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
            onToggleFreeze={actions.handleToggleFreeze}
            onManageSpendingLimit={actions.manageSpendingLimitAction}
            showUnlinkMoneyAccount={canUnlinkMoneyAccount}
            onUnlinkMoneyAccount={() =>
              actions.unlinkMoneyAccountAction(fallbackFundingSourceSymbol)
            }
            onOrderMetalCard={actions.orderMetalCardAction}
            onChangeAsset={actions.changeAssetAction}
            hasPriorityTokenBalance={hasPriorityTokenBalance}
            onCashback={actions.cashbackAction}
            onTravel={actions.navigateToTravelPage}
          />
        )}

        <CardHomeFooter
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          hasAlerts={hasAlertOnlyState}
          hasSetupActions={hasSetupActions}
          supportEmail={supportEmail}
          onNavigateToCardTos={actions.navigateToCardTosPage}
          onLogout={actions.logoutAction}
        />

        <CardScreenshotDeterrent
          enabled={
            !!actions.cardDetailsImageUrl || !!actions.cardSensitiveDetails
          }
        />
      </ScrollView>
    </Box>
  );
};

export default CardHome;
