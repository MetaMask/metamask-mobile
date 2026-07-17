import { useCallback, useContext } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import ClipboardManager from '../../../../core/ClipboardManager';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

export const useCopyTokenContractAddress = (
  contractAddress: string | null,
  onCopyAddress?: () => void,
) => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  return useCallback(async () => {
    if (!contractAddress) {
      return;
    }

    await ClipboardManager.setString(contractAddress);
    onCopyAddress?.();

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('account_details.account_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
    });
  }, [contractAddress, onCopyAddress, toastRef, colors]);
};
