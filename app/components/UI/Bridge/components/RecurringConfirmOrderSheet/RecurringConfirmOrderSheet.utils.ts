import { createProjectLogger } from '@metamask/utils';
import { IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import ToastService from '../../../../../core/ToastService';

const log = createProjectLogger('bridge-recurring-auto-upgrade');

export async function submitRecurringOrder(): Promise<void> {
  log('Recurring order backend submission placeholder');
}

export function showRecurringOrderCreatedToast(): void {
  ToastService.showToast({
    variant: ToastVariants.Icon,
    iconName: IconName.Confirmation,
    iconColor: IconColor.SuccessDefault,
    hasNoTimeout: false,
    labelOptions: [
      {
        label: strings('bridge.recurring.order_created_toast_title'),
        isBold: true,
      },
      { label: '\n' },
      { label: strings('bridge.recurring.order_created_toast_body') },
    ],
  });
}

export function showRecurringOrderCanceledToast(): void {
  ToastService.showToast({
    variant: ToastVariants.Icon,
    iconName: IconName.Error,
    iconColor: IconColor.ErrorDefault,
    hasNoTimeout: false,
    labelOptions: [
      {
        label: strings('bridge.recurring.order_canceled_toast_title'),
        isBold: true,
      },
    ],
  });
}

export function showRecurringAutoUpgradeError(error: unknown): void {
  log('Recurring account upgrade error placeholder', error);
}
