import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { lightTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ToastService from '../../../../core/ToastService';
import { renderNumber } from '../../../../util/number';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';

export interface V2OrderToastParams {
  orderId: string;
  cryptocurrency: string;
  cryptoAmount?: string | number;
  state: FIAT_ORDER_STATES;
}

const toastStyles = StyleSheet.create({
  spinnerContainer: {
    paddingTop: 4,
    marginRight: 12,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    paddingTop: 0,
    marginRight: 12,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
});

/**
 * Builds toast options for V2 Ramps orders based on order state.
 * Returns null for CREATED state (no toast shown).
 */
export function buildV2OrderToastOptions(
  params: V2OrderToastParams,
): ToastOptions | null {
  const { orderId, cryptocurrency, cryptoAmount, state } = params;

  switch (state) {
    case FIAT_ORDER_STATES.PENDING: {
      return {
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        startAccessory: React.createElement(
          View,
          { style: toastStyles.spinnerContainer },
          React.createElement(Spinner, {
            color: ReactNativeDsIconColor.PrimaryDefault,
            spinnerIconProps: { size: ReactNativeDsIconSize.Xl },
          }),
        ),
        labelOptions: [
          {
            label: strings('ramps_v2.notifications.purchase_pending_title', {
              cryptocurrency,
            }),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'ramps_v2.notifications.purchase_pending_description',
          ),
        },
        linkButtonOptions: {
          label: strings('ramps_v2.notifications.track'),
          onPress: () => {
            ToastService.closeToast();
            NavigationService.navigation.navigate(
              Routes.RAMP.RAMPS_ORDER_DETAILS,
              { orderId, showCloseButton: true },
            );
          },
        },
      };
    }

    case FIAT_ORDER_STATES.COMPLETED: {
      const formattedAmount = cryptoAmount
        ? renderNumber(String(cryptoAmount))
        : '';
      return {
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        startAccessory: React.createElement(
          View,
          { style: toastStyles.iconContainer },
          React.createElement(Avatar, {
            variant: AvatarVariant.Icon,
            name: IconName.Confirmation,
            size: AvatarSize.Lg,
            iconColor: lightTheme.colors.success.default,
            backgroundColor: 'transparent',
          }),
        ),
        labelOptions: [
          {
            label: strings('ramps_v2.notifications.purchase_completed_title', {
              amount: formattedAmount,
              cryptocurrency,
            }),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'ramps_v2.notifications.purchase_completed_description',
            {
              cryptocurrency,
            },
          ),
        },
      };
    }

    case FIAT_ORDER_STATES.FAILED: {
      return {
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        startAccessory: React.createElement(
          View,
          { style: toastStyles.iconContainer },
          React.createElement(Avatar, {
            variant: AvatarVariant.Icon,
            name: IconName.Warning,
            size: AvatarSize.Lg,
            iconColor: lightTheme.colors.error.default,
            backgroundColor: 'transparent',
          }),
        ),
        labelOptions: [
          {
            label: strings('ramps_v2.notifications.purchase_failed_title', {
              cryptocurrency,
            }),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'ramps_v2.notifications.purchase_failed_description',
          ),
        },
      };
    }

    case FIAT_ORDER_STATES.CANCELLED: {
      return {
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        startAccessory: React.createElement(
          View,
          { style: toastStyles.iconContainer },
          React.createElement(Avatar, {
            variant: AvatarVariant.Icon,
            name: IconName.Warning,
            size: AvatarSize.Lg,
            iconColor: lightTheme.colors.warning.default,
            backgroundColor: 'transparent',
          }),
        ),
        labelOptions: [
          {
            label: strings('ramps_v2.notifications.purchase_cancelled_title'),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'ramps_v2.notifications.purchase_cancelled_description',
            {
              cryptocurrency,
            },
          ),
        },
      };
    }

    case FIAT_ORDER_STATES.CREATED:
    default:
      return null;
  }
}

/**
 * Shows a toast notification for V2 Ramps orders.
 * No-op if toast options are null (e.g., CREATED state).
 */
export function showV2OrderToast(params: V2OrderToastParams): void {
  const toastOptions = buildV2OrderToastOptions(params);
  if (toastOptions) {
    ToastService.showToast(toastOptions);
  }
}
