import { useCallback, useContext } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';

export const useMoneySecurityToast = () => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  return useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Check,
        iconColor: colors.success.default,
        hasNoTimeout: false,
        labelOptions: [{ label, isBold: true }],
      });
    },
    [colors.success.default, toastRef],
  );
};
