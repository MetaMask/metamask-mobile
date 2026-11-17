import React, { useCallback, useContext, useMemo } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import {
  NotificationMoment,
  playNotification,
  type HapticNotificationMoment,
} from '../../../../util/haptics';
import { useAppThemeFromContext } from '../../../../util/theme';
import { openProHubFromSubscriptionModal } from '../utils/openProHubFromSubscriptionModal';
import { shouldShowActiveMembershipCta } from '../utils/proSubscriptionPaymentStatus';

type PaymentToastOptions = Omit<
  Extract<ToastOptions, { variant: ToastVariants.Icon }>,
  'labelOptions'
> & {
  hapticsType: HapticNotificationMoment;
  labelOptions?: {
    label: string | React.ReactNode;
    isBold?: boolean;
  }[];
};

export interface ProSubscriptionPaymentToasts {
  showProcessingToast: () => void;
  showActiveToast: () => void;
  dismissPaymentToast: () => void;
}

const getToastLabels = (
  primary: string,
  secondary?: string,
): PaymentToastOptions['labelOptions'] => {
  const labels: NonNullable<PaymentToastOptions['labelOptions']> = [
    { label: primary, isBold: true },
  ];

  if (secondary) {
    labels.push(
      { label: '\n', isBold: false },
      {
        label: (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {secondary}
          </Text>
        ),
        isBold: false,
      },
    );
  }

  return labels;
};

/**
 * Toasts for an on-ramp or bridge membership payment.
 *
 * Processing stays up until the user dismisses it or a later toast replaces
 * it. The active toast stays up when it can open Pro Hub, and uses the
 * shared timeout when the user is already on Pro Hub. A failed payment is a
 * bottom sheet, not a toast.
 *
 * @returns Toast triggers for processing and an active membership.
 */
export function useProSubscriptionPaymentToasts(): ProSubscriptionPaymentToasts {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();

  const closeToast = useCallback(() => {
    toastRef?.current?.closeToast();
  }, [toastRef]);

  const closeButtonOptions = useMemo(
    () => ({
      variant: ButtonIconVariant.Icon as const,
      iconName: ToastIconName.Close,
      onPress: closeToast,
    }),
    [closeToast],
  );

  const showToast = useCallback(
    (config: PaymentToastOptions) => {
      const { hapticsType, ...toastOptions } = config;
      toastRef?.current?.showToast(toastOptions as ToastOptions);
      playNotification(hapticsType).catch(() => undefined);
    },
    [toastRef],
  );

  const showProcessingToast = useCallback(() => {
    showToast({
      variant: ToastVariants.Icon,
      iconName: ToastIconName.Loading,
      hapticsType: NotificationMoment.Warning,
      hasNoTimeout: true,
      startAccessory: (
        <Spinner
          color={IconColor.IconDefault}
          spinnerIconProps={{ size: IconSize.Lg }}
        />
      ),
      labelOptions: getToastLabels(
        strings('pro_subscription.payment.processing_title'),
        strings('pro_subscription.payment.processing_body'),
      ),
      closeButtonOptions,
    });
  }, [closeButtonOptions, showToast]);

  const showActiveToast = useCallback(() => {
    const routeName = NavigationService.getCurrentRoute()?.name;
    const showHubCta = shouldShowActiveMembershipCta(routeName);

    showToast({
      variant: ToastVariants.Icon,
      iconName: ToastIconName.Confirmation,
      iconColor: theme.colors.success.default,
      hapticsType: NotificationMoment.Success,
      hasNoTimeout: showHubCta,
      startAccessory: (
        <Icon
          name={IconName.Confirmation}
          color={IconColor.SuccessDefault}
          size={IconSize.Lg}
        />
      ),
      labelOptions: getToastLabels(
        strings('pro_subscription.payment.active_title'),
      ),
      linkButtonOptions: showHubCta
        ? {
            label: strings('pro_subscription.payment.view_membership'),
            onPress: () => {
              closeToast();
              // The checkout modal is still up while a funded plan is
              // provisional. navigate() only dismisses that modal on iOS.
              if (
                NavigationService.getCurrentRoute()?.name ===
                Routes.PRO_SUBSCRIPTION.ROOT
              ) {
                NavigationService.navigation.dispatch(
                  openProHubFromSubscriptionModal,
                );
                return;
              }
              NavigationService.navigation.navigate(Routes.PRO_HUB.ROOT);
            },
          }
        : undefined,
      closeButtonOptions,
    });
  }, [closeButtonOptions, closeToast, showToast, theme.colors.success.default]);

  return {
    showProcessingToast,
    showActiveToast,
    dismissPaymentToast: closeToast,
  };
}
