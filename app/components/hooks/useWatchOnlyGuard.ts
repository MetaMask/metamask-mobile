import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../selectors/accountsController';
import { ToastContext } from '../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../component-library/components/Toast/Toast.types';
import { strings } from '../../../locales/i18n';
import { isWatchOnlyAccount } from '../../util/address';

/**
 * Refuses write actions while the selected account is a dev-only watch-only
 * account: `guard()` shows the watch-only message and returns `true`.
 */
export function useWatchOnlyGuard() {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { toastRef } = useContext(ToastContext);

  const guard = useCallback(() => {
    if (!selectedAddress || !isWatchOnlyAccount(selectedAddress)) {
      return false;
    }
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        { label: strings('watch_only.blocked_title'), isBold: true },
        { label: '\n' },
        { label: strings('watch_only.blocked_message') },
      ],
      hasNoTimeout: false,
    });
    return true;
  }, [selectedAddress, toastRef]);

  return { guard };
}
