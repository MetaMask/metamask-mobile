import React from 'react';
import {
  IconSize as DsIconSize,
  Spinner,
  toast,
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { renderNumber } from '../../../../util/number/bigint';

export interface V2OrderToastParams {
  orderId: string;
  cryptocurrency: string;
  cryptoAmount?: string | number;
  status: RampsOrderStatus;
}

function dismissToast() {
  try {
    toast.dismiss();
  } catch {
    // Toaster may be unmounted in tests
  }
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
        hasNoTimeout: false,
        startAccessory: React.createElement(Spinner, {
          spinnerIconProps: { size: DsIconSize.Lg },
        }),
        title: strings('ramps_v2.notifications.purchase_pending_title', {
          cryptocurrency,
        }),
        description: strings(
          'ramps_v2.notifications.purchase_pending_description',
        ),
        actionButtonLabel: strings('ramps_v2.notifications.track'),
        actionButtonOnPress: () => {
          dismissToast();
          NavigationService.navigation.navigate(
            Routes.RAMP.RAMPS_ORDER_DETAILS,
            { orderId, showCloseButton: true },
          );
        },
      };
    }

    case RampsOrderStatus.Completed: {
      const formattedAmount = cryptoAmount
        ? renderNumber(String(cryptoAmount))
        : '';
      return {
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
        title: strings('ramps_v2.notifications.purchase_completed_title', {
          amount: formattedAmount,
          cryptocurrency,
        }),
        description: strings(
          'ramps_v2.notifications.purchase_completed_description',
          {
            cryptocurrency,
          },
        ),
      };
    }

    case RampsOrderStatus.Failed: {
      return {
        severity: ToastSeverity.Danger,
        hasNoTimeout: false,
        title: strings('ramps_v2.notifications.purchase_failed_title', {
          cryptocurrency,
        }),
        description: strings(
          'ramps_v2.notifications.purchase_failed_description',
        ),
      };
    }

    case RampsOrderStatus.Cancelled: {
      return {
        severity: ToastSeverity.Warning,
        hasNoTimeout: false,
        title: strings('ramps_v2.notifications.purchase_cancelled_title'),
        description: strings(
          'ramps_v2.notifications.purchase_cancelled_description',
          {
            cryptocurrency,
          },
        ),
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
    toast(toastOptions);
  }
}
