import React, { useCallback, useContext, useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastDescriptionOptions,
  ToastLabelOptions,
  ToastLinkButtonOptions,
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
import { strings } from '../../../../../locales/i18n';
import RewardsNotificationIcon from '../../../../images/rewards/notification.svg';
import RewardsTrophyIcon from '../../../../images/rewards/trophy.svg';

export type RewardsToastOptions = ToastOptions & {
  hapticsType: HapticNotificationMoment;
};

export interface OutcomeCtaToastParams {
  title: string;
  description: string;
  ctaLabel: string;
  onCtaPress: () => void;
  onClosePress: () => void;
}

export interface RewardsToastConfig {
  success: (title: string, subtitle?: string) => RewardsToastOptions;
  error: (title: string, subtitle?: string) => RewardsToastOptions;
  loading: (title: string, subtitle?: string) => RewardsToastOptions;
  warning: (title: string, subtitle?: string) => RewardsToastOptions;
  entriesClosed: (title: string, subtitle?: string) => RewardsToastOptions;
  enableNotificationsNudge: (
    linkButtonOptions: ToastLinkButtonOptions,
  ) => RewardsToastOptions;
  outcomeWinner: (params: OutcomeCtaToastParams) => RewardsToastOptions;
  outcomeNonWinner: (params: OutcomeCtaToastParams) => RewardsToastOptions;
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
      loading: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Plain,
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Warning,
        startAccessory: (
          <Box twClassName="p-1 mr-2">
            <ActivityIndicator size="small" color={theme.colors.icon.default} />
          </Box>
        ),
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: getRewardsToastDescriptionLabels(subtitle),
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
      warning: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: theme.colors.warning.default,
        backgroundColor: 'transparent',
        hapticsType: NotificationMoment.Warning,
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: getRewardsToastDescriptionLabels(subtitle),
        hasNoTimeout: true,
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
      enableNotificationsNudge: (
        linkButtonOptions: ToastLinkButtonOptions,
      ) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Plain,
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Warning,
        startAccessory: (
          <Box twClassName="p-1 mr-2">
            <RewardsNotificationIcon
              name="notification"
              width={24}
              height={24}
              color={theme.colors.warning.default}
            />
          </Box>
        ),
        labelOptions: getRewardsToastLabels(
          strings('rewards.notifications_nudge.title'),
        ),
        descriptionOptions: getRewardsToastDescriptionLabels(
          strings('rewards.notifications_nudge.description'),
        ),
        linkButtonOptions,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      }),
      outcomeWinner: ({
        title,
        description,
        ctaLabel,
        onCtaPress,
        onClosePress,
      }: OutcomeCtaToastParams) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        variant: ToastVariants.Plain,
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Success,
        startAccessory: (
          <Box twClassName="p-1 mr-2">
            <RewardsTrophyIcon
              name="trophy"
              width={24}
              height={24}
              color={theme.colors.success.default}
            />
          </Box>
        ),
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: { description },
        linkButtonOptions: {
          label: ctaLabel,
          onPress: onCtaPress,
        },
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: onClosePress,
        },
      }),
      outcomeNonWinner: ({
        title,
        description,
        ctaLabel,
        onCtaPress,
        onClosePress,
      }: OutcomeCtaToastParams) => ({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        backgroundColor: 'transparent',
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Warning,
        labelOptions: getRewardsToastLabels(title),
        descriptionOptions: { description },
        linkButtonOptions: {
          label: ctaLabel,
          onPress: onCtaPress,
        },
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: onClosePress,
        },
      }),
    }),
    [
      theme.colors.success.default,
      theme.colors.error.default,
      theme.colors.icon.default,
      theme.colors.warning.default,
      toastRef,
    ],
  );

  return {
    showToast,
    RewardsToastOptions,
  };
};

export default useRewardsToast;
