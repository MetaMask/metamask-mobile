import { useCallback, useContext, useMemo } from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
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
      }),
    }),
    [theme],
  );

  return {
    showToast,
    RewardsToastOptions,
  };
};

export default useRewardsToast;
