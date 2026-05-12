import { RootState } from '../components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { TransactionType } from '@metamask/transaction-controller';
import { selectLocalTransactions } from './activity';

jest.mock('./smartTransactionsController', () => ({
  selectPendingSmartTransactionsBySender: (state: {
    pendingSmartTransactions?: unknown[];
  }) => state.pendingSmartTransactions || [],
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
            accounts: Record<string, { address?: string }>;
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

const ACTIVE = '0x0000000000000000000000000000000000000001';

function buildState({
  transactions,
  pendingSmartTransactionsForGroup = [],
  accountEvmAddress = ACTIVE,
  omitAccountEvmAddress = false,
}: {
  transactions: Record<string, unknown>[];
  pendingSmartTransactionsForGroup?: Record<string, unknown>[];
  accountEvmAddress?: string;
  omitAccountEvmAddress?: boolean;
}): RootState {
  return {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account-1',
            accounts: {
              'account-1': {
                id: 'account-1',
                ...(!omitAccountEvmAddress ? { address: accountEvmAddress } : {}),
                type: 'eip155:eoa',
              },
            },
          },
        },
        TransactionController: {
          transactions,
        },
      },
    },
    pendingSmartTransactionsForGroup,
  } as unknown as RootState;
}

describe('activity selectors', () => {
  describe('selectLocalTransactions', () => {
    it('filters required child transactions before nonce dedupe', () => {
      const state = buildState({
        transactions: [
          {
            id: 'child',
            chainId: '0x1',
            time: 2,
            txParams: {
              from: ACTIVE,
              nonce: '0x2',
            },
          },
          {
            id: 'parent',
            chainId: '0x1',
            time: 1,
            txParams: {
              from: ACTIVE,
              nonce: '0x1',
            },
            requiredTransactionIds: ['child'],
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'parent' }),
      ]);
    });

    it('returns local transactions for the active account sorted by time descending', () => {
      const state = buildState({
        transactions: [
          {
            id: 'older',
            chainId: '0x1',
            time: 100,
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
          {
            id: 'newer',
            chainId: '0x1',
            time: 200,
            txParams: { from: ACTIVE, nonce: '0x2' },
          },
        ],
      });

      expect(selectLocalTransactions(state).map((tx) => tx.id)).toStrictEqual([
        'newer',
        'older',
      ]);
    });

    it('treats missing time as zero when sorting', () => {
      const state = buildState({
        transactions: [
          {
            id: 'no-time',
            chainId: '0x1',
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
          {
            id: 'with-time',
            chainId: '0x1',
            time: 50,
            txParams: { from: ACTIVE, nonce: '0x2' },
          },
        ],
      });

      expect(selectLocalTransactions(state).map((tx) => tx.id)).toStrictEqual([
        'with-time',
        'no-time',
      ]);
    });

    it('excludes transactions whose from address does not match the active account', () => {
      const state = buildState({
        transactions: [
          {
            id: 'other',
            chainId: '0x1',
            time: 1,
            txParams: {
              from: '0x0000000000000000000000000000000000000002',
              nonce: '0x1',
            },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([]);
    });

    it('returns an empty list when the active account has no EVM address', () => {
      const state = buildState({
        omitAccountEvmAddress: true,
        transactions: [
          {
            id: 'a',
            chainId: '0x1',
            time: 1,
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([]);
    });

    it('merges pending smart transactions for the active address and sorts with controller transactions', () => {
      const state = buildState({
        transactions: [
          {
            id: 'ctrl',
            chainId: '0x1',
            time: 100,
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
        ],
        pendingSmartTransactionsForGroup: [
          {
            id: 'smart',
            chainId: '0x1',
            time: 300,
            txParams: { from: ACTIVE, nonce: '0x2' },
          },
        ],
      });

      expect(selectLocalTransactions(state).map((tx) => tx.id)).toStrictEqual([
        'smart',
        'ctrl',
      ]);
    });

    it('dedupes two controller transactions that share chain, from, and nonce', () => {
      const state = buildState({
        transactions: [
          {
            id: 'first',
            chainId: '0x1',
            time: 2,
            txParams: { from: ACTIVE, nonce: '0x5' },
          },
          {
            id: 'second',
            chainId: '0x1',
            time: 1,
            txParams: { from: ACTIVE, nonce: '0x5' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'first' }),
      ]);
    });

    it('uses bridge hash in the dedupe key for bridge transactions', () => {
      const state = buildState({
        transactions: [
          {
            id: 'bridge-a',
            type: TransactionType.bridge,
            hash: '0xAAA',
            chainId: '0x1',
            time: 2,
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
          {
            id: 'bridge-b',
            type: TransactionType.bridge,
            hash: '0xAAA',
            chainId: '0x1',
            time: 1,
            txParams: { from: ACTIVE, nonce: '0x2' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'bridge-a' }),
      ]);
    });

    it('falls back to nonce dedupe for bridge transactions without a hash', () => {
      const state = buildState({
        transactions: [
          {
            id: 'bridge-1',
            type: TransactionType.bridge,
            chainId: '0x1',
            time: 2,
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
          {
            id: 'bridge-2',
            type: TransactionType.bridge,
            chainId: '0x1',
            time: 1,
            txParams: { from: ACTIVE, nonce: '0x1' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'bridge-1' }),
      ]);
    });

    it('dedupes transactions that share chain, from, and actionId when nonce is absent', () => {
      const state = buildState({
        transactions: [
          {
            id: 'a',
            chainId: '0x1',
            time: 2,
            txParams: { from: ACTIVE, actionId: 'act-1' },
          },
          {
            id: 'b',
            chainId: '0x1',
            time: 1,
            txParams: { from: ACTIVE, actionId: 'act-1' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'a' }),
      ]);
    });

    it('dedupes across controller and pending smart transactions using the same nonce key', () => {
      const state = buildState({
        transactions: [
          {
            id: 'ctrl',
            chainId: '0x1',
            time: 1,
            txParams: { from: ACTIVE, nonce: '0x9' },
          },
        ],
        pendingSmartTransactionsForGroup: [
          {
            id: 'smart',
            chainId: '0x1',
            time: 2,
            txParams: { from: ACTIVE, nonce: '0x9' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'ctrl' }),
      ]);
    });
  });
});
