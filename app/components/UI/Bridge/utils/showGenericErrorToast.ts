import { IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import ToastService from '../../../../core/ToastService';

export function showGenericErrorToast(): void {
  ToastService.showToast({
    variant: ToastVariants.Icon,
    iconName: IconName.Error,
    iconColor: IconColor.ErrorDefault,
    hasNoTimeout: false,
    labelOptions: [
      {
        label: strings('bridge.generic_error_toast_title'),
        isBold: true,
      },
      { label: '\n' },
      { label: strings('bridge.generic_error_toast_body') },
    ],
  });
}
