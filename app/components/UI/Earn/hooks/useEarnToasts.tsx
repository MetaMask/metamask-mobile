import {
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import React, { useCallback, useContext, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { useAppThemeFromContext } from '../../../../util/theme';

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

export interface EarnToastOptionsConfig {
  mUsdConversion: {
    inProgress: EarnToastOptions;
    success: EarnToastOptions;
    failed: EarnToastOptions;
  };
}

const getEarnToastLabels = (
  primary: string | React.ReactNode,
  secondary?: string | React.ReactNode,
) => {
  const labels = [
    {
      label: primary,
      isBold: true,
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
  spinnerContainer: {
    paddingRight: 12,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const useEarnToasts = (): {
  showToast: (config: EarnToastOptions) => void;
  EarnToastOptions: EarnToastOptionsConfig;
} => {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();

  const earnBaseToastOptions: Record<string, EarnToastOptions> = useMemo(
    () => ({
      success: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: theme.colors.accent03.dark,
        backgroundColor: theme.colors.accent03.normal,
        hapticsType: NotificationFeedbackType.Success,
      },
      // Intentional duplication for now to avoid coupling with success options.
      inProgress: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        iconColor: theme.colors.accent04.dark,
        backgroundColor: theme.colors.accent04.normal,
        hapticsType: NotificationFeedbackType.Warning,
        startAccessory: (
          <View style={toastStyles.spinnerContainer}>
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Xl }}
            />
          </View>
        ),
      },
      error: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: theme.colors.accent01.dark,
        backgroundColor: theme.colors.accent01.light,
        hapticsType: NotificationFeedbackType.Error,
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
        inProgress: {
          ...earnBaseToastOptions.inProgress,
          labelOptions: getEarnToastLabels(
            strings('earn.musd_conversion.toasts.in_progress'),
          ),
        },
        success: {
          ...earnBaseToastOptions.success,
          labelOptions: getEarnToastLabels(
            strings('earn.musd_conversion.toasts.success'),
          ),
        },
        failed: {
          ...earnBaseToastOptions.error,
          labelOptions: getEarnToastLabels(
            strings('earn.musd_conversion.toasts.failed'),
          ),
        },
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
