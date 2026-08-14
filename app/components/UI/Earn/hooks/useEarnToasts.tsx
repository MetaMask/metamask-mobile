import {
  playNotification,
  NotificationMoment,
  type HapticNotificationMoment,
} from '../../../../util/haptics';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  Spinner,
  IconColor,
  IconSize as ReactNativeDsIconSize,
  toast,
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';

export type EarnToastOptions = ToastOptions & {
  hapticsType: HapticNotificationMoment;
};

export interface MusdConversionInProgressParams {
  tokenSymbol: string;
}

export interface EarnToastOptionsConfig {
  mUsdConversion: {
    inProgress: (params: MusdConversionInProgressParams) => EarnToastOptions;
    success: EarnToastOptions;
    failed: EarnToastOptions;
  };
  bonusClaim: {
    inProgress: EarnToastOptions;
    success: EarnToastOptions;
    failed: EarnToastOptions;
  };
  tronWithdrawal: {
    failed: (errors: string[]) => EarnToastOptions;
  };
}

const EARN_TOASTS_DEFAULT_OPTIONS: Partial<EarnToastOptions> = {
  hasNoTimeout: false,
};

const useEarnToasts = (): {
  showToast: (config: EarnToastOptions) => void;
  EarnToastOptions: EarnToastOptionsConfig;
} => {
  const showToast = useCallback((config: EarnToastOptions) => {
    const { hapticsType, ...toastOptions } = config;
    toast(toastOptions);
    playNotification(hapticsType);
  }, []);

  const earnBaseToastOptions: Record<string, EarnToastOptions> = useMemo(
    () => ({
      success: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        severity: ToastSeverity.Success,
        hapticsType: NotificationMoment.Success,
      },
      inProgress: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        hapticsType: NotificationMoment.Warning,
        hasNoTimeout: true,
        startAccessory: (
          <Spinner
            color={IconColor.IconDefault}
            spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
          />
        ),
      },
      error: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        severity: ToastSeverity.Danger,
        hapticsType: NotificationMoment.Error,
      },
    }),
    [],
  );

  const EarnToastOptions: EarnToastOptionsConfig = useMemo(
    () => ({
      mUsdConversion: {
        inProgress: ({ tokenSymbol }: MusdConversionInProgressParams) => ({
          ...earnBaseToastOptions.inProgress,
          title: strings('earn.musd_conversion.toasts.converting', {
            token: tokenSymbol,
          }),
        }),
        success: {
          ...earnBaseToastOptions.success,
          title: strings('earn.musd_conversion.toasts.delivered'),
          description: strings(
            'earn.musd_conversion.toasts.delivered_description',
          ),
        },
        failed: {
          ...earnBaseToastOptions.error,
          title: strings('earn.musd_conversion.toasts.failed'),
        },
      },
      bonusClaim: {
        inProgress: {
          ...earnBaseToastOptions.inProgress,
          title: strings('earn.bonus_claim.toasts.claiming'),
        },
        success: {
          ...earnBaseToastOptions.success,
          title: strings('earn.bonus_claim.toasts.delivered'),
        },
        failed: {
          ...earnBaseToastOptions.error,
          title: strings('earn.bonus_claim.toasts.failed'),
        },
      },
      tronWithdrawal: {
        failed: (errors: string[]) => ({
          ...earnBaseToastOptions.error,
          title: strings('stake.tron.unstaked_banner.error'),
          ...(errors.length > 0 && {
            description: errors.map((err) => `\u2022 ${err}`).join('\n'),
          }),
        }),
      },
    }),
    [
      earnBaseToastOptions.error,
      earnBaseToastOptions.inProgress,
      earnBaseToastOptions.success,
    ],
  );

  return { showToast, EarnToastOptions };
};

export default useEarnToasts;
