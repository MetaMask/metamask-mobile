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
import type { MoneyAccountDepositIntent } from './useMoneyAccount';

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

export type DepositIntent = MoneyAccountDepositIntent;

interface DepositToastKeys {
  inProgressTitle: string;
  inProgressBody: string;
  successTitle: string;
  failedTitle: string;
  failedBody: string;
}

const DEPOSIT_TOAST_KEYS: Record<DepositIntent, DepositToastKeys> = {
  convert: {
    inProgressTitle: 'money.toasts.deposit_in_progress_title_convert',
    inProgressBody: 'money.toasts.in_progress_body',
    successTitle: 'money.toasts.deposit_success_title_convert',
    failedTitle: 'money.toasts.deposit_failed_title_convert',
    failedBody: 'money.toasts.deposit_failed_body_convert',
  },
  addMusd: {
    inProgressTitle: 'money.toasts.deposit_in_progress_title_add_musd',
    inProgressBody: 'money.toasts.in_progress_body',
    successTitle: 'money.toasts.deposit_success_title_add_musd',
    failedTitle: 'money.toasts.deposit_failed_title_add_musd',
    failedBody: 'money.toasts.deposit_failed_body_add_musd',
  },
  card: {
    inProgressTitle: 'money.toasts.deposit_in_progress_title_card',
    inProgressBody: 'money.toasts.deposit_in_progress_body_card',
    successTitle: 'money.toasts.deposit_success_title_card',
    failedTitle: 'money.toasts.deposit_failed_title_card',
    failedBody: 'money.toasts.deposit_failed_body_add_musd',
  },
};

const getDepositToastKeys = (intent?: DepositIntent): DepositToastKeys =>
  DEPOSIT_TOAST_KEYS[intent ?? 'convert'];

export interface DepositInProgressParams {
  intent?: DepositIntent;
}

export interface DepositSuccessParams {
  amountFiat?: string;
  intent?: DepositIntent;
}

export interface DepositFailedParams {
  intent?: DepositIntent;
}

export interface WithdrawSuccessParams {
  amountFiat?: string;
  destination: string;
}

export interface SendSuccessParams {
  amountFiat?: string;
  destination: string;
}

export interface MoneyToastOptionsConfig {
  deposit: {
    inProgress: (params?: DepositInProgressParams) => MoneyToastOptions;
    success: (params: DepositSuccessParams) => MoneyToastOptions;
    failed: (params?: DepositFailedParams) => MoneyToastOptions;
  };
  withdraw: {
    inProgress: () => MoneyToastOptions;
    success: (params: WithdrawSuccessParams) => MoneyToastOptions;
    failed: () => MoneyToastOptions;
  };
  send: {
    inProgress: () => MoneyToastOptions;
    success: (params: SendSuccessParams) => MoneyToastOptions;
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

  const MoneyToastOptions: MoneyToastOptionsConfig = useMemo(() => {
    const buildSendToast = (
      base: MoneyToastOptions,
      primaryKey: string,
      secondaryKey: string,
      secondaryParams?: Record<string, string>,
    ): MoneyToastOptions => ({
      ...base,
      labelOptions: getMoneyToastLabels({
        primary: strings(primaryKey),
        primaryIsBold: true,
        secondary: (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(secondaryKey, secondaryParams)}
          </Text>
        ),
      }),
      closeButtonOptions,
    });

    return {
      deposit: {
        inProgress: (params?: DepositInProgressParams) => {
          const keys = getDepositToastKeys(params?.intent);
          return {
            ...moneyBaseToastOptions.inProgress,
            labelOptions: getMoneyToastLabels({
              primary: strings(keys.inProgressTitle),
              primaryIsBold: true,
              secondary: (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(keys.inProgressBody)}
                </Text>
              ),
            }),
            closeButtonOptions,
          };
        },
        success: ({ amountFiat, intent }: DepositSuccessParams) => ({
          ...moneyBaseToastOptions.success,
          labelOptions: getMoneyToastLabels({
            primary: strings(getDepositToastKeys(intent).successTitle),
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
        failed: (params?: DepositFailedParams) => {
          const keys = getDepositToastKeys(params?.intent);
          return {
            ...moneyBaseToastOptions.error,
            labelOptions: getMoneyToastLabels({
              primary: strings(keys.failedTitle),
              primaryIsBold: true,
              secondary: (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(keys.failedBody)}
                </Text>
              ),
            }),
            closeButtonOptions,
          };
        },
      },
      withdraw: {
        inProgress: () => ({
          ...moneyBaseToastOptions.inProgress,
          labelOptions: getMoneyToastLabels({
            primary: strings('money.toasts.withdraw_in_progress_title'),
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
            primary: strings('money.toasts.withdraw_success_title'),
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
      send: {
        inProgress: () =>
          buildSendToast(
            moneyBaseToastOptions.inProgress,
            'money.toasts.send_in_progress_title',
            'money.toasts.in_progress_body',
          ),
        success: ({ amountFiat, destination }: SendSuccessParams) =>
          amountFiat
            ? buildSendToast(
                moneyBaseToastOptions.success,
                'money.toasts.send_success_title',
                'money.toasts.send_success_body',
                { amount: amountFiat, destination },
              )
            : buildSendToast(
                moneyBaseToastOptions.success,
                'money.toasts.send_success_title',
                'money.toasts.send_success_body_no_amount',
                { destination },
              ),
        failed: () =>
          buildSendToast(
            moneyBaseToastOptions.error,
            'money.toasts.send_failed_title',
            'money.toasts.send_failed_body',
          ),
      },
    };
  }, [
    closeButtonOptions,
    moneyBaseToastOptions.error,
    moneyBaseToastOptions.inProgress,
    moneyBaseToastOptions.success,
  ]);

  return { showToast, MoneyToastOptions };
};

export default useMoneyToasts;
