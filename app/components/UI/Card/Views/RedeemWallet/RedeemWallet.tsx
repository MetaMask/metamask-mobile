import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
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
  HeaderStandard,
  AvatarAccount,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import useRedeemableWallet, {
  type RedeemableWalletMode,
} from '../../hooks/useRedeemableWallet';
import useRedeemDestination from '../../hooks/useRedeemDestination';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectCardHomeDataStatus } from '../../../../../selectors/cardController';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { getUsdToFiatConversionRate } from '../../../Money/utils/moneyActivityFiat';
import { formatWithThreshold } from '../../../../../util/assets';
import { formatAddress } from '../../../../../util/address';
import type { RootState } from '../../../../../reducers';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import Routes from '../../../../../constants/navigation/Routes';
import {
  formatAmount,
  formatCurrency,
  getCashbackWithdrawalAmounts,
} from '../Cashback/Cashback.utils';
import { REDEEM_CONFIG } from './RedeemWallet.config';

interface RedeemWalletProps {
  mode: RedeemableWalletMode;
}

const RedeemWallet: React.FC<RedeemWalletProps> = ({ mode }) => {
  const config = REDEEM_CONFIG[mode];
  const { testIds } = config;
  const navigation = useNavigation();
  const tw = useTailwind();
  const headerHandlers = useCardHeaderHandlers('back');
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();

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
    getCashbackWithdrawalAmounts(balance, feePrice);

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
      if (usdToFiat !== undefined && Number.isFinite(balanceNum)) {
        // ponytail: prices the refund balance as 1 stablecoin ~= 1 USD
        // (ceiling: assumes USDC/USDT ~= $1; upgrade path is a market lookup).
        return formatWithThreshold(balanceNum * usdToFiat, 0.01, I18n.locale, {
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

  useEffect(() => {
    if (wallet) {
      fetchEstimation().catch(() => undefined);
    }
  }, [wallet, fetchEstimation]);

  useEffect(() => {
    if (monitoringStatus === 'success') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings(config.strings.withdrawalSuccess) }],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
      navigation.goBack();
    }
  }, [monitoringStatus, toastRef, theme, navigation, config]);

  useEffect(() => {
    if (monitoringStatus === 'failed' || monitoringError) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings(config.strings.withdrawalFailed) }],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    }
  }, [monitoringStatus, monitoringError, toastRef, theme, config]);

  useEffect(() => {
    if (withdrawError) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings(config.strings.withdrawalFailed) }],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    }
  }, [withdrawError, toastRef, theme, config]);

  useEffect(
    () => () => {
      resetWithdraw();
    },
    [resetWithdraw],
  );

  const handleWithdraw = useCallback(() => {
    if (needsSetup || isFundingStatusUnavailable) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: config.analyticsAction,
          type: 'withdraw',
        })
        .build(),
    );
    withdraw(balance);
  }, [
    balance,
    withdraw,
    trackEvent,
    createEventBuilder,
    needsSetup,
    isFundingStatusUnavailable,
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

  const isProcessing = isWithdrawing || monitoringStatus === 'monitoring';

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
              <TouchableOpacity
                onPress={handleOpenRefundInfo}
                testID={testIds.REFUND_INFO_BUTTON}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
              </TouchableOpacity>
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
                field={{
                  label: { text: strings(config.strings.networkFee) },
                }}
                value={{
                  label:
                    isLoading || isEstimating ? (
                      <Skeleton
                        height={20}
                        width={80}
                        style={tw.style('rounded-md')}
                      />
                    ) : (
                      { text: `${formatAmount(roundedFeeNum)} ${currency}` }
                    ),
                }}
              />
              <KeyValueRow
                field={{
                  label: { text: strings(config.strings.expectedToReceive) },
                }}
                value={{
                  label:
                    isLoading || isEstimating ? (
                      <Skeleton
                        height={20}
                        width={80}
                        style={tw.style('rounded-md')}
                      />
                    ) : (
                      {
                        text: `${formatAmount(
                          expectedToReceiveNumber,
                        )} ${currency}`,
                      }
                    ),
                }}
              />
              <Box testID={testIds.TO_ROW}>
                <KeyValueRow
                  field={{ label: { text: strings(config.strings.to) } }}
                  value={{
                    label:
                      isLoading || isEstimating || !destination.isResolved ? (
                        <Skeleton
                          height={20}
                          width={120}
                          style={tw.style('rounded-md')}
                        />
                      ) : (
                        destinationChip
                      ),
                  }}
                />
              </Box>
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
