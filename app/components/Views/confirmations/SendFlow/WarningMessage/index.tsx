import React, { useContext } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';

interface Props {
  /**
   * Warning message to display (Plain text or JSX)
   */
  warningMessage: string;
  onDismiss?: () => void;
}

const WarningMessage = ({ warningMessage, onDismiss }: Props) => {
  const { toastRef } = useContext(ToastContext);

  React.useEffect(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: warningMessage,
          isBold: false,
        },
      ],
      iconName: IconName.Danger,
      iconColor: IconColor.Warning,
      closeButtonOptions: onDismiss
        ? {
            variant: ButtonVariants.Primary,
            label: strings('navigation.cancel'),
            onPress: onDismiss,
          }
        : undefined,
      hasNoTimeout: !onDismiss,
    });
  }, [warningMessage, onDismiss, toastRef]);

  return null;
};

export default WarningMessage;
