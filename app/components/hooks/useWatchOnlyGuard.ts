import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { isWatchOnlyKeyringType } from '@metamask/accounts-controller';
import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import type { RootState } from '../../reducers';
import { ToastContext } from '../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../component-library/components/Toast/Toast.types';
import { strings } from '../../../locales/i18n';

const selectIsSelectedAccountWatchOnly = (state: RootState) =>
  isWatchOnlyKeyringType(
    selectSelectedInternalAccount(state)?.metadata?.keyring?.type ?? '',
  );

/**
 * Refuses write actions while the selected account is a development-only
 * watch-only account, which has no signing capability.
 *
 * @returns `isWatchOnly`, and `guard()` which shows the watch-only message and
 * returns `true` when the caller must stop.
 */
export function useWatchOnlyGuard() {
  // A boolean keeps `guard` stable across unrelated account updates, since
  // every gated write handler depends on it.
  const isWatchOnly = useSelector(selectIsSelectedAccountWatchOnly);
  const { toastRef } = useContext(ToastContext);

  const guard = useCallback(() => {
    if (!isWatchOnly) {
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
  }, [isWatchOnly, toastRef]);

  return { isWatchOnly, guard };
}
