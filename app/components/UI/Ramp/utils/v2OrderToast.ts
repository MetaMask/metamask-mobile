import React from 'react';
import {
  IconColor as DsIconColor,
  IconSize as DsIconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import {
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ToastService from '../../../../core/ToastService';
import { renderNumber } from '../../../../util/number';

export interface V2OrderToastParams {
  orderId: string;
  cryptocurrency: string;
  cryptoAmount?: string | number;
  status: RampsOrderStatus;
}

/**
 * Builds toast options for V2 Ramps orders based on order status.
 * Returns null for statuses that don't warrant a toast (Created, Precreated, Unknown, IdExpired).
 */
export function buildV2OrderToastOptions(
  params: V2OrderToastParams,
): ToastOptions | null {
  const { orderId, cryptocurrency, cryptoAmount, status } = params;

  switch (status) {
    case RampsOrderStatus.Pending: {
      return {
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        startAccessory: React.createElement(Spinner, {
          color: DsIconColor.IconDefault,
          spinnerIconProps: { size: DsIconSize.Lg },
        }),
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
            if (!NavigationService.isReady()) {
              return;
            }

            ToastService.closeToast();
            NavigationService.navigation.navigate(
              Routes.RAMP.RAMPS_ORDER_DETAILS,
              { orderId, showCloseButton: true },
            );
          },
        },
      };
    }

    case RampsOrderStatus.Completed: {
      const formattedAmount = cryptoAmount
        ? renderNumber(String(cryptoAmount))
        : '';
      return {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: IconColor.Success,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
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

    case RampsOrderStatus.Failed: {
      return {
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: IconColor.Error,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
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

    case RampsOrderStatus.Cancelled: {
      return {
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: IconColor.Warning,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
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

    case RampsOrderStatus.Created:
    case RampsOrderStatus.Precreated:
    case RampsOrderStatus.Unknown:
    case RampsOrderStatus.IdExpired:
    default:
      return null;
  }
}

/**
 * Shows a toast notification for V2 Ramps orders.
 * No-op for statuses that don't warrant a toast (e.g., Created).
 */
export function showV2OrderToast(params: V2OrderToastParams): void {
  const toastOptions = buildV2OrderToastOptions(params);
  if (toastOptions) {
    ToastService.showToast(toastOptions);
  }
}
