import { RootState } from '../components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { selectLocalTransactions } from './activity';

jest.mock('./smartTransactionsController', () => ({
  selectPendingSmartTransactionsForSelectedAccountGroup: (state: {
    pendingSmartTransactionsForGroup: unknown[];
  }) => state.pendingSmartTransactionsForGroup || [],
}));

jest.mock('./accountsController', () => ({
  selectEvmAddress: (state: {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: string;
            accounts: Record<string, { address: string }>;
          };
        };
      };
    };
  }) => {
    const selectedAccountId =
      state.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount;
    return state.engine.backgroundState.AccountsController.internalAccounts
      .accounts[selectedAccountId]?.address;
  },
}));

describe('activity selectors', () => {
  describe('selectLocalTransactions', () => {
    it('filters required child transactions before nonce dedupe', () => {
      const activeEvmAddress = '0x0000000000000000000000000000000000000001';
      const state = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    id: 'account-1',
                    address: activeEvmAddress,
                    type: 'eip155:eoa',
                  },
                },
              },
            },
            TransactionController: {
              transactions: [
                {
                  id: 'parent',
                  chainId: '0x1',
                  time: 1,
                  txParams: {
                    from: activeEvmAddress,
                    nonce: '0x1',
                  },
                },
                {
                  id: 'child',
                  chainId: '0x1',
                  time: 2,
                  txParams: {
                    from: activeEvmAddress,
                    nonce: '0x2',
                  },
                  requiredTransactionIds: ['parent'],
                },
              ],
            },
          },
        },
        pendingSmartTransactionsForGroup: [],
      } as unknown as RootState;

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'parent' }),
      ]);
    });
  });
});
