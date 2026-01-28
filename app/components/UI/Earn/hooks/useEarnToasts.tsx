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
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { IconSize as ReactNativeDsIconSize } from '@metamask/design-system-react-native';

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
}

interface EarnToastLabelOptions {
  primary: string | React.ReactNode;
  secondary?: string | React.ReactNode;
  primaryIsBold?: boolean;
}

const getEarnToastLabels = ({
  primary,
  secondary,
  primaryIsBold = false,
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

const EARN_TOASTS_DEFAULT_OPTIONS: Partial<EarnToastOptions> = {
  hasNoTimeout: false,
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
              size={IconSize.Lg}
            />
          </View>
        ),
      },
      inProgress: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hapticsType: NotificationFeedbackType.Warning,
        hasNoTimeout: true,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Spinner spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }} />
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
        inProgress: ({ tokenSymbol }: MusdConversionInProgressParams) => ({
          ...earnBaseToastOptions.inProgress,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.converting', {
              token: tokenSymbol,
            }),
          }),
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
      bonusClaim: {
        inProgress: {
          ...earnBaseToastOptions.inProgress,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.bonus_claim.toasts.claiming'),
          }),
          closeButtonOptions,
        },
        // Reuse the mUSD conversion success toast as per acceptance criteria
        success: {
          ...earnBaseToastOptions.success,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.bonus_claim.toasts.delivered'),
          }),
          closeButtonOptions,
        },
        failed: {
          ...earnBaseToastOptions.error,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.bonus_claim.toasts.failed'),
          }),
          closeButtonOptions,
        },
      },
    }),
    [
      closeButtonOptions,
      earnBaseToastOptions.error,
      earnBaseToastOptions.inProgress,
      earnBaseToastOptions.success,
    ],
  );

  return { showToast, EarnToastOptions };
};

export default useEarnToasts;
