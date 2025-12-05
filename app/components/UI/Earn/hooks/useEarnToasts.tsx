import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
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
import { TokenIconWithSpinner } from '../components/TokenIconWithSpinner';

export type EarnToastOptions = Omit<
  Extract<ToastOptions, { variant: ToastVariants.Icon }>,
  'labelOptions'
> & {
  hapticsType: NotificationFeedbackType;
  // Overwriting ToastOptions.labelOptions to also support ReactNode since this works.
  labelOptions?: {
    label: string | React.ReactNode;
    isBold?: boolean;
  }[];
};

export interface MusdConversionInProgressParams {
  tokenSymbol: string;
  tokenIcon?: string;
  estimatedTimeSeconds?: number;
}

export interface EarnToastOptionsConfig {
  mUsdConversion: {
    inProgress: (params: MusdConversionInProgressParams) => EarnToastOptions;
    success: EarnToastOptions;
    failed: EarnToastOptions;
  };
}

interface EarnToastLabelOptions {
  primary: string | React.ReactNode;
  secondary?: string | React.ReactNode;
  primaryIsBold?: boolean;
}

const getEarnToastLabels = ({
  primary,
  secondary,
  primaryIsBold = true,
}: EarnToastLabelOptions) => {
  const labels = [
    {
      label: primary,
      isBold: primaryIsBold,
    },
  ];

  if (secondary) {
    labels.push(
      {
        label: '\n',
        isBold: false,
      },
      {
        label: secondary,
        isBold: false,
      },
    );
  }

  return labels;
};

const formatEstimatedTime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) {
    return strings('earn.musd_conversion.toasts.eta', { time: '< 1 minute' });
  }

  if (seconds < 60) {
    const secondText = seconds === 1 ? 'second' : 'seconds';
    return strings('earn.musd_conversion.toasts.eta', {
      time: `${seconds} ${secondText}`,
    });
  }

  const minutes = Math.ceil(seconds / 60);
  const minuteText = minutes === 1 ? 'minute' : 'minutes';
  return strings('earn.musd_conversion.toasts.eta', {
    time: `${minutes} ${minuteText}`,
  });
};

const EARN_TOASTS_DEFAULT_OPTIONS: Partial<EarnToastOptions> = {
  hasNoTimeout: false,
  customBottomOffset: 32,
};

const toastStyles = StyleSheet.create({
  iconWrapper: {
    marginRight: 16,
  },
});

const useEarnToasts = (): {
  showToast: (config: EarnToastOptions) => void;
  EarnToastOptions: EarnToastOptionsConfig;
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

  const earnBaseToastOptions: Record<string, EarnToastOptions> = useMemo(
    () => ({
      success: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hapticsType: NotificationFeedbackType.Success,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Icon
              name={IconName.Confirmation}
              color={theme.colors.success.default}
              size={IconSize.Xl}
            />
          </View>
        ),
      },
      error: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CircleX,
        iconColor: theme.colors.error.default,
        hapticsType: NotificationFeedbackType.Error,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Icon
              name={IconName.CircleX}
              color={theme.colors.error.default}
              size={IconSize.Xl}
            />
          </View>
        ),
      },
    }),
    [theme],
  );

  const showToast = useCallback(
    (config: EarnToastOptions) => {
      const { hapticsType, ...toastOptions } = config;
      toastRef?.current?.showToast(toastOptions as ToastOptions);
      notificationAsync(hapticsType);
    },
    [toastRef],
  );

  // Centralized toast options for Earn
  const EarnToastOptions: EarnToastOptionsConfig = useMemo(
    () => ({
      mUsdConversion: {
        inProgress: ({
          tokenSymbol,
          tokenIcon,
          estimatedTimeSeconds,
        }: MusdConversionInProgressParams) => ({
          ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          iconColor: theme.colors.icon.default,
          backgroundColor: theme.colors.background.default,
          hapticsType: NotificationFeedbackType.Warning,
          hasNoTimeout: true,
          startAccessory: (
            <TokenIconWithSpinner
              tokenSymbol={tokenSymbol}
              tokenIcon={tokenIcon}
            />
          ),
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.converting', {
              token: tokenSymbol,
            }),
          }),
          descriptionOptions: {
            description: formatEstimatedTime(estimatedTimeSeconds),
          },
          closeButtonOptions,
        }),
        success: {
          ...earnBaseToastOptions.success,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.delivered'),
          }),
          closeButtonOptions,
        },
        failed: {
          ...earnBaseToastOptions.error,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.failed'),
          }),
          closeButtonOptions,
        },
      },
    }),
    [
      closeButtonOptions,
      earnBaseToastOptions.error,
      earnBaseToastOptions.success,
      theme.colors.background.default,
      theme.colors.icon.default,
    ],
  );

  return { showToast, EarnToastOptions };
};

export default useEarnToasts;
