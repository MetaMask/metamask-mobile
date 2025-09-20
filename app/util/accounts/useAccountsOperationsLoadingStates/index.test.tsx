import { useAccountsOperationsLoadingStates } from './index';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { strings } from '../../../../locales/i18n';

describe('useAccountsOperationsLoadingStates', () => {
  const getState = (isSyncing: boolean) => ({
    engine: {
      backgroundState: {
        AccountTreeController: {
          isAccountTreeSyncingInProgress: isSyncing,
        },
      },
    },
  });

  it('returns loading state and message when account syncing is in progress', () => {
    const { result } = renderHookWithProvider(
      () => useAccountsOperationsLoadingStates(),
      { state: getState(true) },
    );
    expect(result.current.isAccountSyncingInProgress).toBe(true);
    expect(result.current.areAnyOperationsLoading).toBe(true);
    expect(result.current.loadingMessage).toBe(
      strings('multichain_accounts.syncing'),
    );
  });

  it('returns no loading state and undefined message when no accounts operations are in progress', () => {
    const { result } = renderHookWithProvider(
      () => useAccountsOperationsLoadingStates(),
      { state: getState(false) },
    );
    expect(result.current.isAccountSyncingInProgress).toBe(false);
    expect(result.current.areAnyOperationsLoading).toBe(false);
    expect(result.current.loadingMessage).toBeUndefined();
  });
});
