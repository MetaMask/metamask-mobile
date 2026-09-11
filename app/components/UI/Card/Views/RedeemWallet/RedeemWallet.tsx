import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Skeleton,
  Button,
  ButtonVariant,
  ButtonSize,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandard,
  AvatarAccount,
  AvatarBaseSize,
  IconColor,
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
} from '@metamask/design-system-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import useRedeemableWallet, {
  type RedeemableWalletMode,
} from '../../hooks/useRedeemableWallet';
import useRedeemDestination from '../../hooks/useRedeemDestination';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  selectCardHomeDataStatus,
  selectCardActiveProviderId,
} from '../../../../../selectors/cardController';
import { withCardProvider } from '../../util/metrics';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { getUsdToFiatConversionRate } from '../../../Money/utils/moneyActivityFiat';
import { getStablecoinFiatAmount } from '../../util/getStablecoinFiatAmount';
import { formatWithThreshold } from '../../../../../util/assets';
import { formatAddress } from '../../../../../util/address';
import type { RootState } from '../../../../../reducers';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import Routes from '../../../../../constants/navigation/Routes';
import {
  formatAmount,
  formatCurrency,
  getRedeemWithdrawalAmounts,
} from './RedeemWallet.utils';
import { REDEEM_CONFIG } from './RedeemWallet.config';
import { CardRedeemWithdrawalInProgressError } from '../../../../../core/Engine/controllers/card-controller/provider-types';

interface RedeemWalletProps {
  mode: RedeemableWalletMode;
}

const RedeemWallet: React.FC<RedeemWalletProps> = ({ mode }) => {
  const config = REDEEM_CONFIG[mode];
  const { testIds } = config;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const headerHandlers = useCardHeaderHandlers('back');
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);

  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { startLinkFlow, canLink: canLinkMoneyAccount } =
    useMoneyAccountCardLinkage();

  const {
    wallet,
    isLoading,
    error,
    estimation,
    isEstimating,
    fetchEstimation,
    withdraw,
    isWithdrawing,
    withdrawError,
    monitoringStatus,
    monitoringError,
    resetWithdraw,
  } = useRedeemableWallet(mode);

  const balance = wallet?.balance ?? '0';
  const currency = formatCurrency(wallet?.currency ?? '');
  const isWithdrawable = wallet?.isWithdrawable ?? false;

  const feePrice = estimation?.price ?? '0';
  const { roundedFeeNum, expectedToReceiveNumber, hasInsufficientBalance } =
    getRedeemWithdrawalAmounts(balance, feePrice);

  const destination = useRedeemDestination({
    currency: wallet?.currency,
    network: estimation?.network,
  });

  const avatarAccountType = useSelector(selectAvatarAccountType);
  const receivingAddress = destination.receivingAddress;
  const receivingAccount = useSelector((state: RootState) =>
    receivingAddress
      ? getMemoizedInternalAccountByAddress(state, receivingAddress)
      : undefined,
  );

  const headlineBalance = useMemo(() => {
    if (config.showFiatBalance) {
      const usdToFiat = getUsdToFiatConversionRate(currencyRates);
      const balanceNum = parseFloat(balance);
      const fiatAmount = getStablecoinFiatAmount(balanceNum, usdToFiat);
      if (fiatAmount !== undefined) {
        return formatWithThreshold(fiatAmount, 0.01, I18n.locale, {
          style: 'currency',
          currency: currentCurrency?.toUpperCase() || 'USD',
        });
      }
    }
    return `${formatAmount(balance)} ${currency}`;
  }, [
    config.showFiatBalance,
    currencyRates,
    balance,
    currentCurrency,
    currency,
  ]);

  const destinationChip = useMemo(() => {
    if (destination.isMoneyAccountDestination) {
      return (
        <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
          <MoneyBalanceIcon width={24} height={24} name="money-balance" />
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            twClassName="shrink"
          >
            {strings('card.card_spending_limit.money_account_label')}
          </Text>
        </Box>
      );
    }
    if (!receivingAddress) {
      return null;
    }
    return (
      <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
        <AvatarAccount
          address={receivingAddress}
          variant={getAvatarAccountVariant(avatarAccountType)}
          size={AvatarBaseSize.Sm}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          twClassName="shrink"
        >
          {receivingAccount?.metadata?.name ||
            formatAddress(receivingAddress, 'short')}
        </Text>
      </Box>
    );
  }, [
    destination.isMoneyAccountDestination,
    receivingAddress,
    receivingAccount,
    avatarAccountType,
  ]);

  const isFundingStatusLoading =
    cardHomeDataStatus === 'idle' || cardHomeDataStatus === 'loading';
  const hasFundingStatusError = cardHomeDataStatus === 'error';
  const isFundingStatusLoaded = cardHomeDataStatus === 'success';
  const isFundingStatusUnavailable =
    isFundingStatusLoading || hasFundingStatusError;
  const showLoadingError = !!error || hasFundingStatusError;

  const useMoneyAccountFlow = destination.isMoneyAccountDestination;
  const needsSetup =
    isFundingStatusLoaded &&
    destination.isResolved &&
    !destination.hasApprovedDestination;
  const showSetupBanner =
    needsSetup && (!useMoneyAccountFlow || canLinkMoneyAccount);

  // Fetch when wallet data becomes available (including late loads while focused).
  useEffect(() => {
    if (wallet) {
      fetchEstimation().catch(() => undefined);
    }
  }, [wallet, fetchEstimation]);

  // Refresh estimation whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      if (wallet) {
        fetchEstimation().catch(() => undefined);
      }
    }, [wallet, fetchEstimation]),
  );

  useEffect(() => {
    const isFailed = monitoringStatus === 'failed' || !!monitoringError;
    const isSuccess = monitoringStatus === 'success';
    // A rejected submit for an already-in-flight redeem (this mode or the
    // other) is not a real failure — the controller owns the outcome.
    const submitFailed =
      !!withdrawError &&
      !(withdrawError instanceof CardRedeemWithdrawalInProgressError);

    // A rejected submit while the controller still reports a withdrawal in
    // flight means a duplicate press was rejected, not that the withdrawal
    // failed. The controller owns the outcome, so wait for it.
    if (monitoringStatus === 'monitoring' || isWithdrawing) return;

    if (isSuccess) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings(config.strings.withdrawalSuccess) }],
        iconName: ToastIconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
      resetWithdraw();
      navigation.goBack();
      return;
    }

    if (isFailed || submitFailed) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings(config.strings.withdrawalFailed) }],
        iconName: ToastIconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
      if (isFailed) {
        resetWithdraw();
      }
    }
  }, [
    monitoringStatus,
    monitoringError,
    withdrawError,
    isWithdrawing,
    toastRef,
    theme,
    navigation,
    config,
    resetWithdraw,
  ]);

  const handleWithdraw = useCallback(async () => {
    if (
      needsSetup ||
      isFundingStatusUnavailable ||
      isWithdrawing ||
      monitoringStatus === 'monitoring' ||
      monitoringStatus === 'success'
    ) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: config.analyticsAction,
            type: 'withdraw',
          }),
        )
        .build(),
    );

    try {
      await fetchEstimation();
    } catch {
      // Estimation failure surfaces via estimationError / button state; still
      // allow withdraw — controller re-fetches estimation at submit time.
    }
    withdraw(balance);
  }, [
    balance,
    withdraw,
    fetchEstimation,
    trackEvent,
    createEventBuilder,
    activeProviderId,
    needsSetup,
    isFundingStatusUnavailable,
    isWithdrawing,
    monitoringStatus,
    config,
  ]);

  const handleNavigateToSpendingLimit = useCallback(() => {
    navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
      flow: 'enable',
      ...(destination.delegationToken
        ? { selectedToken: destination.delegationToken }
        : {}),
    });
  }, [navigation, destination.delegationToken]);

  const handleSetupPress = useCallback(() => {
    if (useMoneyAccountFlow) {
      startLinkFlow(config.moneyAccountOrigin);
      return;
    }
    handleNavigateToSpendingLimit();
  }, [
    useMoneyAccountFlow,
    startLinkFlow,
    handleNavigateToSpendingLimit,
    config,
  ]);

  const handleOpenRefundInfo = useCallback(() => {
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.CREDIT_REFUND_TOOLTIP,
      params: { isMoneyAccount: destination.isMoneyAccountDestination },
    });
  }, [navigation, destination.isMoneyAccountDestination]);

  // Keep the button locked through success until resetWithdraw/goBack run —
  // otherwise it briefly re-enables between monitor completion and navigation.
  const isProcessing =
    isWithdrawing ||
    monitoringStatus === 'monitoring' ||
    monitoringStatus === 'success';

  const buttonLabel = useMemo(() => {
    if (
      !isWithdrawable ||
      hasInsufficientBalance ||
      needsSetup ||
      isFundingStatusUnavailable ||
      !destination.isResolved
    ) {
      return strings(config.strings.withdrawUnavailable);
    }
    if (
      destination.isMoneyAccountDestination &&
      config.withdrawToMoneyAccount
    ) {
      return strings(config.withdrawToMoneyAccount);
    }
    return strings(config.strings.withdraw);
  }, [
    isWithdrawable,
    hasInsufficientBalance,
    needsSetup,
    isFundingStatusUnavailable,
    destination.isResolved,
    destination.isMoneyAccountDestination,
    config,
  ]);

  const fundingWarningMessageType = useMoneyAccountFlow
    ? config.moneyAccountRequiredType
    : config.fundingRequiredType;

  const isButtonDisabled =
    isLoading ||
    !isWithdrawable ||
    isProcessing ||
    isEstimating ||
    hasInsufficientBalance ||
    isFundingStatusUnavailable ||
    !destination.isResolved ||
    needsSetup;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={testIds.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <Box twClassName="flex-1 px-4">
        {config.screenTitle ? (
          <Text variant={TextVariant.HeadingLg} twClassName="pt-2 pb-2">
            {strings(config.screenTitle)}
          </Text>
        ) : null}
        {showSetupBanner ? (
          <Box twClassName="pt-4" testID={testIds.FUNDING_WARNING}>
            <CardMessageBox
              messageType={fundingWarningMessageType}
              onConfirm={handleSetupPress}
            />
          </Box>
        ) : null}

        <Box twClassName="py-4" testID={testIds.BALANCE_TITLE}>
          {isLoading ? (
            <Skeleton height={32} width={160} style={tw.style('rounded-lg')} />
          ) : (
            <Text variant={TextVariant.HeadingLg}>{headlineBalance}</Text>
          )}
          <Box twClassName="flex-row items-center gap-1 mt-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(config.strings.available)}
            </Text>
            {config.showRefundInfo ? (
              <ButtonIcon
                onPress={handleOpenRefundInfo}
                iconName={IconName.Info}
                size={ButtonIconSize.Sm}
                iconProps={{ color: IconColor.IconAlternative }}
                testID={testIds.REFUND_INFO_BUTTON}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            ) : null}
          </Box>
        </Box>

        {showLoadingError ? (
          <Box twClassName="rounded-xl bg-background-muted p-4 items-center">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings(config.strings.loadingError)}
            </Text>
          </Box>
        ) : (
          <Box
            twClassName="rounded-xl bg-background-muted p-4"
            testID={testIds.DETAILS_CARD}
          >
            <Box twClassName="gap-3">
              <KeyValueRow
                variant={KeyValueRowVariant.Summary}
                twClassName="px-0 h-auto"
                keyLabel={strings(config.strings.networkFee)}
                value={
                  isLoading || isEstimating ? (
                    <Skeleton
                      height={20}
                      width={80}
                      style={tw.style('rounded-md')}
                    />
                  ) : (
                    `${formatAmount(roundedFeeNum)} ${currency}`
                  )
                }
              />
              <KeyValueRow
                variant={KeyValueRowVariant.Summary}
                twClassName="px-0 h-auto"
                keyLabel={strings(config.strings.expectedToReceive)}
                value={
                  isLoading || isEstimating ? (
                    <Skeleton
                      height={20}
                      width={80}
                      style={tw.style('rounded-md')}
                    />
                  ) : (
                    `${formatAmount(expectedToReceiveNumber)} ${currency}`
                  )
                }
              />
              {(isLoading || isEstimating || destinationChip) && (
                <Box testID={testIds.TO_ROW}>
                  <KeyValueRow
                    variant={KeyValueRowVariant.Summary}
                    twClassName="px-0 h-auto"
                    keyLabel={strings(config.strings.to)}
                    value={
                      isLoading || isEstimating ? (
                        <Skeleton
                          height={20}
                          width={120}
                          style={tw.style('rounded-md')}
                        />
                      ) : (
                        destinationChip
                      )
                    }
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Box twClassName="px-4 pb-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleWithdraw}
          isFullWidth
          isDisabled={isButtonDisabled}
          isLoading={isProcessing}
          testID={testIds.WITHDRAW_BUTTON}
        >
          {buttonLabel}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default RedeemWallet;
