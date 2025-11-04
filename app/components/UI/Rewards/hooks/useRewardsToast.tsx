import { useCallback, useContext, useMemo } from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { strings } from '../../../../../locales/i18n';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';

export type RewardsToastOptions = ToastOptions & {
  hapticsType: NotificationFeedbackType;
};

export interface RewardsToastConfig {
  success: (title: string, subtitle?: string) => RewardsToastOptions;
  error: (title: string, subtitle?: string) => RewardsToastOptions;
}

const getRewardsToastLabels = (title: string, subtitle?: string) => {
  const labels = [
    {
      label: title,
      isBold: true,
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
        iconColor: theme.colors.primary.default,
        backgroundColor: theme.colors.primary.muted,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: getRewardsToastLabels(title, subtitle),
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: strings('rewards.toast_dismiss'),
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
      error: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Error,
        iconColor: theme.colors.background.muted,
        backgroundColor: theme.colors.error.default,
        hapticsType: NotificationFeedbackType.Error,
        labelOptions: getRewardsToastLabels(title, subtitle),
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: strings('rewards.toast_dismiss'),
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
    }),
    [
      theme.colors.background.muted,
      theme.colors.error.default,
      theme.colors.primary.default,
      theme.colors.primary.muted,
      toastRef,
    ],
  );

  return {
    showToast,
    RewardsToastOptions,
  };
};

export default useRewardsToast;
