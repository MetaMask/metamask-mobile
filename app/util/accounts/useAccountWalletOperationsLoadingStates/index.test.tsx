import { useAccountWalletOperationsLoadingStates } from './index';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { AccountWalletObject } from '@metamask/account-tree-controller';

const mockWalletId = 'entropy:test';

describe('useAccountWalletOperationsLoadingStates', () => {
  const getState = (status: AccountWalletObject['status']) => ({
    engine: {
      backgroundState: {
        AccountTreeController: {
          accountTree: {
            wallets: {
              [mockWalletId]: {
                status,
              },
            },
          },
        },
      },
    },
  });

  it.each([
    [
      'in-progress:alignment',
      'multichain_accounts.wallet_details.discovering_accounts',
    ],
    [
      'in-progress:discovery',
      'multichain_accounts.wallet_details.discovering_accounts',
    ],
    [
      'in-progress:create-accounts',
      'multichain_accounts.wallet_details.creating_account',
    ],
  ] as const)(
    'returns loading state and message when a wallet operation is in progress: "%s"',
    (
      status: AccountWalletObject['status'],
      expectedLoadingMessageKey: string,
    ) => {
      const { result } = renderHookWithProvider(
        () => useAccountWalletOperationsLoadingStates(mockWalletId),
        { state: getState(status) },
      );
      expect(result.current.areAnyOperationsLoading).toBe(true);
      expect(result.current.loadingMessage).toBe(
        strings(expectedLoadingMessageKey),
      );
    },
  );

  it('returns no loading state and undefined message when no wallet operation is in progress', () => {
    const { result } = renderHookWithProvider(
      () => useAccountWalletOperationsLoadingStates(mockWalletId),
      { state: getState('ready') },
    );
    expect(result.current.areAnyOperationsLoading).toBe(false);
    expect(result.current.loadingMessage).toBeUndefined();
  });
});
