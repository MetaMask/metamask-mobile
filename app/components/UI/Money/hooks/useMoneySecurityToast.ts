import { useCallback, useContext } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';

type MoneySecurityToastVariant = 'success' | 'error';

export const useMoneySecurityToast = () => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  return useCallback(
    (label: string, variant: MoneySecurityToastVariant = 'success') => {
      const isError = variant === 'error';
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: isError ? IconName.Danger : IconName.Check,
        iconColor: isError ? colors.error.default : colors.success.default,
        hasNoTimeout: false,
        labelOptions: [{ label, isBold: true }],
      });
    },
    [colors.error.default, colors.success.default, toastRef],
  );
};
