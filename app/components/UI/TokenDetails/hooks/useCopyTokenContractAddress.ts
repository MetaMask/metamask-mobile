import { useCallback } from 'react';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import ClipboardManager from '../../../../core/ClipboardManager';
import { strings } from '../../../../../locales/i18n';

export const useCopyTokenContractAddress = (
  contractAddress: string | null,
  onCopyAddress?: () => void,
) =>
  useCallback(async () => {
    if (!contractAddress) {
      return;
    }

    await ClipboardManager.setString(contractAddress);
    onCopyAddress?.();

    toast({
      title: strings('account_details.account_copied_to_clipboard'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, [contractAddress, onCopyAddress]);
