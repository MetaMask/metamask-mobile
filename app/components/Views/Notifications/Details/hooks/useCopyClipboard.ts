import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { protectWalletModalVisible } from '../../../../../actions/user';
import ClipboardManager from '../../../../../core/ClipboardManager';

export const CopyClipboardAlertMessage = {
  default: (): string => strings('notifications.copied_to_clipboard'),
  address: (): string => strings('notifications.address_copied_to_clipboard'),
  transaction: (): string =>
    strings('notifications.transaction_id_copied_to_clipboard'),
};

function useCopyClipboard() {
  const dispatch = useDispatch();

  const handleProtectWalletModalVisible = useCallback(
    () => dispatch(protectWalletModalVisible()),
    [dispatch],
  );

  const copyToClipboard = useCallback(
    async (value: string, alertText?: string) => {
      if (!value) return;
      await ClipboardManager.setString(value);
      toast({
        title: alertText ?? CopyClipboardAlertMessage.default(),
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
      });
      setTimeout(() => handleProtectWalletModalVisible(), 2000);
    },
    [handleProtectWalletModalVisible],
  );

  return copyToClipboard;
}

export default useCopyClipboard;
