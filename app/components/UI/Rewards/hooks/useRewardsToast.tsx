import React, { useCallback, useMemo } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  toast,
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';
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

export interface RewardsToastNudgeParams {
  label: string;
  onPress: () => void;
}

export interface RewardsToastConfig {
  success: (title: string, subtitle?: string) => RewardsToastOptions;
  error: (title: string, subtitle?: string) => RewardsToastOptions;
  loading: (title: string, subtitle?: string) => RewardsToastOptions;
  warning: (title: string, subtitle?: string) => RewardsToastOptions;
  entriesClosed: (title: string, subtitle?: string) => RewardsToastOptions;
  enableNotificationsNudge: (
    params: RewardsToastNudgeParams,
  ) => RewardsToastOptions;
  outcomeWinner: (params: OutcomeCtaToastParams) => RewardsToastOptions;
  outcomeNonWinner: (params: OutcomeCtaToastParams) => RewardsToastOptions;
}

const REWARDS_TOASTS_DEFAULT_OPTIONS: Partial<RewardsToastOptions> = {
  hasNoTimeout: false,
};

const useRewardsToast = (): {
  showToast: (config: RewardsToastOptions) => void;
  RewardsToastOptions: RewardsToastConfig;
} => {
  const theme = useAppThemeFromContext();

  const showToast = useCallback((config: RewardsToastOptions) => {
    const { hapticsType, ...toastOptions } = config;
    toast(toastOptions);
    playNotification(hapticsType);
  }, []);

  const RewardsToastOptions: RewardsToastConfig = useMemo(
    () => ({
      success: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        severity: ToastSeverity.Success,
        hapticsType: NotificationMoment.Success,
        title,
        description: subtitle,
        hasNoTimeout: false,
      }),
      error: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        severity: ToastSeverity.Danger,
        hapticsType: NotificationMoment.Error,
        title,
        description: subtitle,
        hasNoTimeout: false,
      }),
      loading: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Warning,
        startAccessory: <Spinner spinnerIconProps={{ size: IconSize.Lg }} />,
        title,
        description: subtitle,
      }),
      warning: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        severity: ToastSeverity.Warning,
        hapticsType: NotificationMoment.Warning,
        title,
        description: subtitle,
        hasNoTimeout: true,
      }),
      entriesClosed: (title: string, subtitle?: string) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        startAccessory: (
          <Icon
            name={IconName.Lock}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
        ),
        hapticsType: NotificationMoment.Warning,
        title,
        description: subtitle,
        hasNoTimeout: false,
      }),
      enableNotificationsNudge: ({
        label,
        onPress,
      }: RewardsToastNudgeParams) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Warning,
        startAccessory: (
          <RewardsNotificationIcon
            name="notification"
            width={24}
            height={24}
            color={theme.colors.warning.default}
          />
        ),
        title: strings('rewards.notifications_nudge.title'),
        description: strings('rewards.notifications_nudge.description'),
        actionButtonLabel: label,
        actionButtonOnPress: onPress,
      }),
      outcomeWinner: ({
        title,
        description,
        ctaLabel,
        onCtaPress,
        onClosePress,
      }: OutcomeCtaToastParams) => ({
        ...(REWARDS_TOASTS_DEFAULT_OPTIONS as RewardsToastOptions),
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Success,
        startAccessory: (
          <RewardsTrophyIcon
            name="trophy"
            width={24}
            height={24}
            color={theme.colors.success.default}
          />
        ),
        title,
        description,
        actionButtonLabel: ctaLabel,
        actionButtonOnPress: onCtaPress,
        onClose: onClosePress,
      }),
      outcomeNonWinner: ({
        title,
        description,
        ctaLabel,
        onCtaPress,
        onClosePress,
      }: OutcomeCtaToastParams) => ({
        severity: ToastSeverity.Success,
        hasNoTimeout: true,
        hapticsType: NotificationMoment.Warning,
        title,
        description,
        actionButtonLabel: ctaLabel,
        actionButtonOnPress: onCtaPress,
        onClose: onClosePress,
      }),
    }),
    [theme.colors.success.default, theme.colors.warning.default],
  );

  return {
    showToast,
    RewardsToastOptions,
  };
};

export default useRewardsToast;
