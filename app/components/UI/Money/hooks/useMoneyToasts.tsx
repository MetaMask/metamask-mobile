import {
  playNotification,
  NotificationMoment,
  type HapticNotificationMoment,
} from '../../../../util/haptics';
import React, { useCallback, useContext, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { useAppThemeFromContext } from '../../../../util/theme';
import {
  Spinner,
  IconSize as ReactNativeDsIconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export type MoneyToastOptions = Omit<
  Extract<ToastOptions, { variant: ToastVariants.Icon }>,
  'labelOptions'
> & {
  hapticsType: HapticNotificationMoment;
  labelOptions?: {
    label: string | React.ReactNode;
    isBold?: boolean;
  }[];
};

export interface DepositSuccessParams {
  amountFiat?: string;
}

export interface WithdrawSuccessParams {
  amountFiat?: string;
  destination: string;
}

export interface MoneyToastOptionsConfig {
  deposit: {
    inProgress: () => MoneyToastOptions;
    success: (params: DepositSuccessParams) => MoneyToastOptions;
    failed: () => MoneyToastOptions;
  };
  withdraw: {
    inProgress: () => MoneyToastOptions;
    success: (params: WithdrawSuccessParams) => MoneyToastOptions;
    failed: () => MoneyToastOptions;
  };
}

interface MoneyToastLabelOptions {
  primary: string | React.ReactNode;
  secondary: string | React.ReactNode;
  primaryIsBold?: boolean;
}

const getMoneyToastLabels = ({
  primary,
  secondary,
  primaryIsBold = false,
}: MoneyToastLabelOptions) => [
  { label: primary, isBold: primaryIsBold },
  { label: '\n', isBold: false },
  { label: secondary, isBold: false },
];

const MONEY_TOASTS_DEFAULT_OPTIONS: Partial<MoneyToastOptions> = {
  hasNoTimeout: false,
};

const toastStyles = StyleSheet.create({
  iconWrapper: {
    marginRight: 16,
  },
});

const useMoneyToasts = (): {
  showToast: (config: MoneyToastOptions) => void;
  MoneyToastOptions: MoneyToastOptionsConfig;
} => {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();

  const closeToast = useCallback(() => {
    toastRef?.current?.closeToast();
  }, [toastRef]);

  const closeButtonOptions = useMemo(
    () => ({
      variant: ButtonIconVariant.Icon,
      iconName: IconName.Close,
      onPress: closeToast,
    }),
    [closeToast],
  );

  const moneyBaseToastOptions: Record<string, MoneyToastOptions> = useMemo(
    () => ({
      success: {
        ...(MONEY_TOASTS_DEFAULT_OPTIONS as MoneyToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hapticsType: NotificationMoment.Success,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Icon
              name={IconName.Confirmation}
              color={theme.colors.success.default}
              size={IconSize.Lg}
            />
          </View>
        ),
      },
      inProgress: {
        ...(MONEY_TOASTS_DEFAULT_OPTIONS as MoneyToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hapticsType: NotificationMoment.Warning,
        hasNoTimeout: true,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Spinner spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }} />
          </View>
        ),
      },
      error: {
        ...(MONEY_TOASTS_DEFAULT_OPTIONS as MoneyToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CircleX,
        iconColor: theme.colors.error.default,
        hapticsType: NotificationMoment.Error,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Icon
              name={IconName.CircleX}
              color={theme.colors.error.default}
              size={IconSize.Lg}
            />
          </View>
        ),
      },
    }),
    [theme],
  );

  const showToast = useCallback(
    (config: MoneyToastOptions) => {
      const { hapticsType, ...toastOptions } = config;
      toastRef?.current?.showToast(toastOptions as ToastOptions);
      playNotification(hapticsType);
    },
    [toastRef],
  );

  const MoneyToastOptions: MoneyToastOptionsConfig = useMemo(
    () => ({
      deposit: {
        inProgress: () => ({
          ...moneyBaseToastOptions.inProgress,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.in_progress_title'),
            primaryIsBold: true,
            secondary: (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('money.toasts.in_progress_body')}
              </Text>
            ),
          }),
          closeButtonOptions,
        }),
        success: ({ amountFiat }: DepositSuccessParams) => ({
          ...moneyBaseToastOptions.success,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.success_title'),
            primaryIsBold: true,
            secondary: (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {amountFiat
                  ? strings('money.toasts.deposit_success_body', {
                      amount: amountFiat,
                    })
                  : strings('money.toasts.deposit_success_body_no_amount')}
              </Text>
            ),
          }),
          closeButtonOptions,
        }),
        failed: () => ({
          ...moneyBaseToastOptions.error,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.deposit_failed_title'),
            primaryIsBold: true,
            secondary: (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('money.toasts.deposit_failed_body')}
              </Text>
            ),
          }),
          closeButtonOptions,
        }),
      },
      withdraw: {
        inProgress: () => ({
          ...moneyBaseToastOptions.inProgress,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.in_progress_title'),
            primaryIsBold: true,
            secondary: (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('money.toasts.in_progress_body')}
              </Text>
            ),
          }),
          closeButtonOptions,
        }),
        success: ({ amountFiat, destination }: WithdrawSuccessParams) => ({
          ...moneyBaseToastOptions.success,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.success_title'),
            primaryIsBold: true,
            secondary: (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {amountFiat
                  ? strings('money.toasts.withdraw_success_body', {
                      amount: amountFiat,
                      destination,
                    })
                  : strings('money.toasts.withdraw_success_body_no_amount', {
                      destination,
                    })}
              </Text>
            ),
          }),
          closeButtonOptions,
        }),
        failed: () => ({
          ...moneyBaseToastOptions.error,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.withdraw_failed_title'),
            primaryIsBold: true,
            secondary: (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('money.toasts.withdraw_failed_body')}
              </Text>
            ),
          }),
          closeButtonOptions,
        }),
      },
    }),
    [
      closeButtonOptions,
      moneyBaseToastOptions.error,
      moneyBaseToastOptions.inProgress,
      moneyBaseToastOptions.success,
    ],
  );

  return { showToast, MoneyToastOptions };
};

export default useMoneyToasts;
