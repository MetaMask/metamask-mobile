import { useCallback, useContext, useMemo } from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastLabelOptions,
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';

export type RewardsToastOptions = ToastOptions & {
  hapticsType: NotificationFeedbackType;
};

export interface RewardsToastConfig {
  success: (title: string, subtitle?: string) => RewardsToastOptions;
  error: (title: string, subtitle?: string) => RewardsToastOptions;
}

const getRewardsToastLabels = (
  title: string,
  subtitle?: string,
): ToastLabelOptions => {
  const labels: ToastLabelOptions = [
    {
      label: title,
      isBold: false,
    },
  ];

  if (subtitle) {
    labels.push(
      {
        label: '\n',
        isBold: false,
      },
      {
        label: subtitle,
        isBold: false,
      },
    );
  }

  return labels;
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
      toastRef?.current?.showToast(config);
      notificationAsync(config.hapticsType);
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
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: getRewardsToastLabels(title, subtitle),
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
        hapticsType: NotificationFeedbackType.Error,
        labelOptions: getRewardsToastLabels(title, subtitle),
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
    [theme.colors.success.default, theme.colors.error.default, toastRef],
  );

  return {
    showToast,
    RewardsToastOptions,
  };
};

export default useRewardsToast;
