import { useCallback, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { protectWalletModalVisible } from '../../../../../actions/user';
import ClipboardManager from '../../../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';

export const CopyClipboardAlertMessage = {
  default: (): string => strings('notifications.copied_to_clipboard'),
  address: (): string => strings('notifications.address_copied_to_clipboard'),
  transaction: (): string =>
    strings('notifications.transaction_id_copied_to_clipboard'),
};

function useCopyClipboard() {
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  const handleProtectWalletModalVisible = useCallback(
    () => dispatch(protectWalletModalVisible()),
    [dispatch],
  );

  const copyToClipboard = useCallback(
    async (value: string, alertText?: string) => {
      if (!value) return;
      await ClipboardManager.setString(value);
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: colors.accent03.dark,
        backgroundColor: colors.accent03.normal,
        labelOptions: [
          { label: alertText ?? CopyClipboardAlertMessage.default() },
        ],
        hasNoTimeout: false,
      });
      setTimeout(() => handleProtectWalletModalVisible(), 2000);
    },
    [
      colors.accent03.dark,
      colors.accent03.normal,
      toastRef,
      handleProtectWalletModalVisible,
    ],
  );

  return copyToClipboard;
}

export default useCopyClipboard;
