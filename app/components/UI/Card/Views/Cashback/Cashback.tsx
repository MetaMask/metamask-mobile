import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow';
import useCashbackWallet from '../../hooks/useCashbackWallet';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions } from '../../util/metrics';
import { CashbackSelectors } from './Cashback.testIds';

const CURRENCY_DISPLAY_MAP: Record<string, string> = {
  musd: 'mUSD',
  usdc: 'USDC',
  usdt: 'USDT',
};

const formatCurrency = (raw: string): string =>
  CURRENCY_DISPLAY_MAP[raw.toLowerCase()] ?? raw.toUpperCase();

const formatAmount = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0.00';
  const truncated = Math.floor(num * 10000) / 10000;
  const formatted = truncated.toFixed(4).replace(/0{1,2}$/, '');
  return formatted;
};

const Cashback: React.FC = () => {
  const tw = useTailwind();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const {
    cashbackWallet,
    isLoading,
    error,
    estimation,
    isEstimating,
    fetchEstimation,
    withdraw,
    isWithdrawing,
    monitoringStatus,
    monitoringError,
    resetWithdraw,
  } = useCashbackWallet();

  const balance = cashbackWallet?.balance ?? '0';
  const currency = formatCurrency(cashbackWallet?.currency ?? 'musd');
  const balanceNum = parseFloat(balance);
  const isWithdrawable = cashbackWallet?.isWithdrawable ?? false;

  const feeRaw = estimation?.price ?? '0';
  const feeNum = parseFloat(feeRaw);
  const expectedToReceiveNum = Math.max(0, balanceNum - feeNum);
  const hasInsufficientBalance = balanceNum <= 0 || balanceNum <= feeNum;

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
    }
  }, [monitoringStatus, toastRef, theme]);

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

  useEffect(
    () => () => {
      resetWithdraw();
    },
    [resetWithdraw],
  );

  const handleWithdraw = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.CASHBACK_BUTTON,
          type: 'withdraw',
        })
        .build(),
    );
    withdraw(balance);
  }, [balance, withdraw, trackEvent, createEventBuilder]);

  const isProcessing = isWithdrawing || monitoringStatus === 'monitoring';

  const buttonLabel = useMemo(() => {
    if (!isWithdrawable || hasInsufficientBalance) {
      return strings('card.cashback_screen.withdraw_unavailable');
    }
    return strings('card.cashback_screen.withdraw');
  }, [isWithdrawable, hasInsufficientBalance]);

  const isButtonDisabled =
    isLoading ||
    !isWithdrawable ||
    isProcessing ||
    isEstimating ||
    hasInsufficientBalance;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={CashbackSelectors.CONTAINER}
    >
      <Box twClassName="flex-1 px-4">
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

        {error ? (
          <Box twClassName="rounded-xl bg-background-alternative p-4 items-center">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('card.cashback_screen.loading_error')}
            </Text>
          </Box>
        ) : (
          <Box
            twClassName="rounded-xl bg-background-alternative p-4"
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
                      { text: `${formatAmount(feeRaw)} ${currency}` }
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
                        text: `${formatAmount(expectedToReceiveNum)} ${currency}`,
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
          variant={ButtonVariants.Primary}
          label={buttonLabel}
          size={ButtonSize.Lg}
          onPress={handleWithdraw}
          width={ButtonWidthTypes.Full}
          isDisabled={isButtonDisabled}
          loading={isProcessing}
          testID={CashbackSelectors.WITHDRAW_BUTTON}
        />
      </Box>
    </SafeAreaView>
  );
};

export default Cashback;
