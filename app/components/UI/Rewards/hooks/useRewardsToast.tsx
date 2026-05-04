import { useCallback, useContext, useMemo } from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastDescriptionOptions,
  ToastLabelOptions,
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import {
  playNotification,
  NotificationMoment,
  type HapticNotificationMoment,
} from '../../../../util/haptics';

export type RewardsToastOptions = ToastOptions & {
  hapticsType: HapticNotificationMoment;
};

export interface RewardsToastConfig {
  success: (title: string, subtitle?: string) => RewardsToastOptions;
  error: (title: string, subtitle?: string) => RewardsToastOptions;
  entriesClosed: (title: string, subtitle?: string) => RewardsToastOptions;
}

const getRewardsToastLabels = (title: string): ToastLabelOptions => {
  const labels: ToastLabelOptions = [
    {
      label: title,
      isBold: true,
    },
  ];

  return labels;
};

const getRewardsToastDescriptionLabels = (
  description?: string,
): ToastDescriptionOptions | undefined => {
  if (!description) {
    return undefined;
  }
  return { description };
};

const REWARDS_TOASTS_DEFAULT_OPTIONS: Partial<RewardsToastOptions> = {
  hasNoTimeout: false,
};

const useRewardsToast = (): {
  showToast: (config: RewardsToastOptions) => void;
  RewardsToastOptions: RewardsToastConfig;
} => {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();

  const showToast = useCallback(
    (config: RewardsToastOptions) => {
      const { hapticsType, ...toastOptions } = config;
      toastRef?.current?.showToast(toastOptions as ToastOptions);
      playNotification(hapticsType);
    },
    [toastRef],
  );

  const RewardsToastOptions: RewardsToastConfig = useMemo(
    () => ({
      success: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        backgroundColor: 'transparent',
        hapticsType: NotificationMoment.Success,
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: getRewardsToastDescriptionLabels(subtitle),
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
      error: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: 'transparent',
        hapticsType: NotificationMoment.Error,
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: getRewardsToastDescriptionLabels(subtitle),
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,

          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
      entriesClosed: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Lock,
        iconColor: theme.colors.icon.default,
        backgroundColor: 'transparent',
        hapticsType: NotificationMoment.Warning,
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: getRewardsToastDescriptionLabels(subtitle),
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
    }),
    [
      theme.colors.success.default,
      theme.colors.error.default,
      theme.colors.icon.default,
      toastRef,
    ],
  );

  return {
    showToast,
    RewardsToastOptions,
  };
};

export default useRewardsToast;
