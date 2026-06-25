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
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow';
import useCashbackWallet from '../../hooks/useCashbackWallet';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { CASHBACK_MONEY_ACCOUNT_ORIGIN } from '../../hooks/useCardPostAuthRedirect';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions } from '../../util/metrics';
import { CashbackSelectors } from './Cashback.testIds';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  selectCardHasApprovedLineaFunding,
  selectCardHomeDataStatus,
  selectCardLineaUsdcToken,
  selectIsCardResidencyBlocked,
  selectIsMoneyAccountDelegatedForCard,
} from '../../../../../selectors/cardController';
import { selectMoneyEnableMoneyAccountFlag } from '../../../Money/selectors/featureFlags';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import { CardMessageBoxType } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  formatAmount,
  formatCurrency,
  getCashbackWithdrawalAmounts,
} from './Cashback.utils';

const Cashback: React.FC = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const headerHandlers = useCardHeaderHandlers('back');
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasApprovedLineaFunding = useSelector(
    selectCardHasApprovedLineaFunding,
  );
  const isMoneyAccountDelegated = useSelector(
    selectIsMoneyAccountDelegatedForCard,
  );
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isResidencyBlocked = useSelector(selectIsCardResidencyBlocked);
  const lineaUsdcToken = useSelector(selectCardLineaUsdcToken);
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const { startLinkFlow, canLink: canLinkMoneyAccount } =
    useMoneyAccountCardLinkage();

  const {
    cashbackWallet,
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
  } = useCashbackWallet();

  const balance = cashbackWallet?.balance ?? '0';
  const currency = formatCurrency(cashbackWallet?.currency ?? 'musd');
  const isWithdrawable = cashbackWallet?.isWithdrawable ?? false;

  const feePrice = estimation?.price ?? '0';
  const { roundedFeeNum, netAmount, netAmountNumber, hasInsufficientBalance } =
    getCashbackWithdrawalAmounts(balance, feePrice);
  const isFundingStatusLoading =
    cardHomeDataStatus === 'idle' || cardHomeDataStatus === 'loading';
  const hasFundingStatusError = cardHomeDataStatus === 'error';
  const isFundingStatusLoaded = cardHomeDataStatus === 'success';
  const useMoneyAccountFlow = isMoneyAccountEnabled && !isResidencyBlocked;
  const hasApprovedRedemptionDestination = useMoneyAccountFlow
    ? isMoneyAccountDelegated
    : hasApprovedLineaFunding || isMoneyAccountDelegated;
  const needsSetup = isFundingStatusLoaded && !hasApprovedRedemptionDestination;
  const isFundingStatusUnavailable =
    isFundingStatusLoading || hasFundingStatusError;
  const showLoadingError = !!error || hasFundingStatusError;
  const showSetupBanner =
    needsSetup && (!useMoneyAccountFlow || canLinkMoneyAccount);

  useEffect(() => {
    if (cashbackWallet) {
      fetchEstimation().catch(() => undefined);
    }
  }, [cashbackWallet, fetchEstimation]);

  useEffect(() => {
    if (monitoringStatus === 'success') {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.cashback_screen.withdrawal_success'),
          },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
      navigation.goBack();
    }
  }, [monitoringStatus, toastRef, theme, navigation]);

  useEffect(() => {
    if (monitoringStatus === 'failed' || monitoringError) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.cashback_screen.withdrawal_failed'),
          },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    }
  }, [monitoringStatus, monitoringError, toastRef, theme]);

  useEffect(() => {
    if (withdrawError) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.cashback_screen.withdrawal_failed'),
          },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    }
  }, [withdrawError, toastRef, theme]);

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
          action: CardActions.CASHBACK_BUTTON,
          type: 'withdraw',
        })
        .build(),
    );
    withdraw(netAmount);
  }, [
    netAmount,
    withdraw,
    trackEvent,
    createEventBuilder,
    needsSetup,
    isFundingStatusUnavailable,
  ]);

  const handleNavigateToSpendingLimit = useCallback(() => {
    navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
      flow: 'enable',
      ...(lineaUsdcToken ? { selectedToken: lineaUsdcToken } : {}),
    });
  }, [navigation, lineaUsdcToken]);

  const handleSetupPress = useCallback(() => {
    if (useMoneyAccountFlow) {
      startLinkFlow(CASHBACK_MONEY_ACCOUNT_ORIGIN);
      return;
    }

    handleNavigateToSpendingLimit();
  }, [useMoneyAccountFlow, startLinkFlow, handleNavigateToSpendingLimit]);

  const isProcessing = isWithdrawing || monitoringStatus === 'monitoring';

  const buttonLabel = useMemo(() => {
    if (
      !isWithdrawable ||
      hasInsufficientBalance ||
      needsSetup ||
      isFundingStatusUnavailable
    ) {
      return strings('card.cashback_screen.withdraw_unavailable');
    }
    return strings('card.cashback_screen.withdraw');
  }, [
    isWithdrawable,
    hasInsufficientBalance,
    needsSetup,
    isFundingStatusUnavailable,
  ]);

  const fundingWarningMessageType = useMoneyAccountFlow
    ? CardMessageBoxType.CashbackMoneyAccountRequired
    : CardMessageBoxType.CashbackFundingRequired;

  const isButtonDisabled =
    isLoading ||
    !isWithdrawable ||
    isProcessing ||
    isEstimating ||
    hasInsufficientBalance ||
    isFundingStatusUnavailable ||
    needsSetup;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={CashbackSelectors.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <Box twClassName="flex-1 px-4">
        {showSetupBanner ? (
          <Box twClassName="pt-4" testID={CashbackSelectors.FUNDING_WARNING}>
            <CardMessageBox
              messageType={fundingWarningMessageType}
              onConfirm={handleSetupPress}
            />
          </Box>
        ) : null}

        <Box twClassName="py-4" testID={CashbackSelectors.BALANCE_TITLE}>
          {isLoading ? (
            <Skeleton height={32} width={160} style={tw.style('rounded-lg')} />
          ) : (
            <Text variant={TextVariant.HeadingLg}>
              {formatAmount(balance)} {currency}
            </Text>
          )}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={tw.style('mt-1')}
          >
            {strings('card.cashback_screen.available_cashback')}
          </Text>
        </Box>

        {showLoadingError ? (
          <Box twClassName="rounded-xl bg-background-muted p-4 items-center">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('card.cashback_screen.loading_error')}
            </Text>
          </Box>
        ) : (
          <Box
            twClassName="rounded-xl bg-background-muted p-4"
            testID={CashbackSelectors.DETAILS_CARD}
          >
            <Box twClassName="gap-3">
              <KeyValueRow
                field={{
                  label: {
                    text: strings('card.cashback_screen.network_fee'),
                  },
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
                  label: {
                    text: strings('card.cashback_screen.expected_to_receive'),
                  },
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
                        text: `${formatAmount(netAmountNumber)} ${currency}`,
                      }
                    ),
                }}
              />
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
          testID={CashbackSelectors.WITHDRAW_BUTTON}
        >
          {buttonLabel}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default Cashback;
