import {
  playNotification,
  NotificationMoment,
  type HapticNotificationMoment,
} from '../../../../util/haptics';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  Spinner,
  IconSize as ReactNativeDsIconSize,
  toast,
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';
import type { MoneyAccountDepositIntent } from './useMoneyAccount';

export type MoneyToastOptions = ToastOptions & {
  hapticsType: HapticNotificationMoment;
  onPress?: () => void;
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

interface ToastPressParams {
  onPress?: () => void;
}

export interface DepositInProgressParams extends ToastPressParams {
  intent?: DepositIntent;
}

export interface DepositSuccessParams extends ToastPressParams {
  amountFiat?: string;
  intent?: DepositIntent;
}

export interface DepositFailedParams extends ToastPressParams {
  intent?: DepositIntent;
}

export interface WithdrawSuccessParams {
  amountFiat?: string;
  destination: string;
}

export interface SendSuccessParams extends ToastPressParams {
  amountFiat?: string;
  destination: string;
}

export type SendInProgressParams = ToastPressParams;

export type SendFailedParams = ToastPressParams;

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
    inProgress: (params?: SendInProgressParams) => MoneyToastOptions;
    success: (params: SendSuccessParams) => MoneyToastOptions;
    failed: (params?: SendFailedParams) => MoneyToastOptions;
  };
}

const MONEY_TOASTS_DEFAULT_OPTIONS: Partial<MoneyToastOptions> = {
  hasNoTimeout: false,
};

const useMoneyToasts = (): {
  showToast: (config: MoneyToastOptions) => void;
  closeToast: () => void;
  MoneyToastOptions: MoneyToastOptionsConfig;
} => {
  const closeToast = useCallback(() => {
    toast.dismiss();
  }, []);

  const buildToastPress = useCallback((onPress?: () => void) => {
    if (!onPress) {
      return undefined;
    }
    return () => {
      toast.dismiss();
      onPress();
    };
  }, []);

  const moneyBaseToastOptions: Record<string, MoneyToastOptions> = useMemo(
    () => ({
      success: {
        ...(MONEY_TOASTS_DEFAULT_OPTIONS as MoneyToastOptions),
        severity: ToastSeverity.Success,
        hapticsType: NotificationMoment.Success,
      },
      inProgress: {
        ...(MONEY_TOASTS_DEFAULT_OPTIONS as MoneyToastOptions),
        hapticsType: NotificationMoment.Warning,
        hasNoTimeout: true,
        startAccessory: (
          <Spinner spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }} />
        ),
      },
      error: {
        ...(MONEY_TOASTS_DEFAULT_OPTIONS as MoneyToastOptions),
        severity: ToastSeverity.Danger,
        hapticsType: NotificationMoment.Error,
      },
    }),
    [],
  );

  const showToast = useCallback((config: MoneyToastOptions) => {
    const { hapticsType, onPress, ...toastOptions } = config;
    toast({
      ...toastOptions,
      ...(onPress
        ? {
            titleProps: { onPress },
            descriptionProps: { onPress },
          }
        : {}),
    });
    playNotification(hapticsType);
  }, []);

  const MoneyToastOptions: MoneyToastOptionsConfig = useMemo(() => {
    const buildSendToast = (
      base: MoneyToastOptions,
      primaryKey: string,
      secondaryKey: string,
      secondaryParams?: Record<string, string>,
      onPress?: () => void,
    ): MoneyToastOptions => ({
      ...base,
      title: strings(primaryKey),
      description: strings(secondaryKey, secondaryParams),
      onPress: buildToastPress(onPress),
    });

    return {
      deposit: {
        inProgress: (params?: DepositInProgressParams) => {
          const keys = getDepositToastKeys(params?.intent);
          return {
            ...moneyBaseToastOptions.inProgress,
            title: strings(keys.inProgressTitle),
            description: strings(keys.inProgressBody),
            onPress: buildToastPress(params?.onPress),
          };
        },
        success: ({ amountFiat, intent, onPress }: DepositSuccessParams) => ({
          ...moneyBaseToastOptions.success,
          title: strings(getDepositToastKeys(intent).successTitle),
          description: amountFiat
            ? strings('money.toasts.deposit_success_body', {
                amount: amountFiat,
              })
            : strings('money.toasts.deposit_success_body_no_amount'),
          onPress: buildToastPress(onPress),
        }),
        failed: (params?: DepositFailedParams) => {
          const keys = getDepositToastKeys(params?.intent);
          return {
            ...moneyBaseToastOptions.error,
            title: strings(keys.failedTitle),
            description: strings(keys.failedBody),
            onPress: buildToastPress(params?.onPress),
          };
        },
      },
      withdraw: {
        inProgress: () => ({
          ...moneyBaseToastOptions.inProgress,
          title: strings('money.toasts.withdraw_in_progress_title'),
          description: strings('money.toasts.in_progress_body'),
        }),
        success: ({ amountFiat, destination }: WithdrawSuccessParams) => ({
          ...moneyBaseToastOptions.success,
          title: strings('money.toasts.withdraw_success_title'),
          description: amountFiat
            ? strings('money.toasts.withdraw_success_body', {
                amount: amountFiat,
                destination,
              })
            : strings('money.toasts.withdraw_success_body_no_amount', {
                destination,
              }),
        }),
        failed: () => ({
          ...moneyBaseToastOptions.error,
          title: strings('money.toasts.withdraw_failed_title'),
          description: strings('money.toasts.withdraw_failed_body'),
        }),
      },
      send: {
        inProgress: (params?: SendInProgressParams) =>
          buildSendToast(
            moneyBaseToastOptions.inProgress,
            'money.toasts.send_in_progress_title',
            'money.toasts.in_progress_body',
            undefined,
            params?.onPress,
          ),
        success: ({ amountFiat, destination, onPress }: SendSuccessParams) =>
          amountFiat
            ? buildSendToast(
                moneyBaseToastOptions.success,
                'money.toasts.send_success_title',
                'money.toasts.send_success_body',
                { amount: amountFiat, destination },
                onPress,
              )
            : buildSendToast(
                moneyBaseToastOptions.success,
                'money.toasts.send_success_title',
                'money.toasts.send_success_body_no_amount',
                { destination },
                onPress,
              ),
        failed: (params?: SendFailedParams) =>
          buildSendToast(
            moneyBaseToastOptions.error,
            'money.toasts.send_failed_title',
            'money.toasts.send_failed_body',
            undefined,
            params?.onPress,
          ),
      },
    };
  }, [
    buildToastPress,
    moneyBaseToastOptions.error,
    moneyBaseToastOptions.inProgress,
    moneyBaseToastOptions.success,
  ]);

  return { showToast, closeToast, MoneyToastOptions };
};

export default useMoneyToasts;
