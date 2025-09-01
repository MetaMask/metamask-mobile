import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  MOCK_SOLANA_ACCOUNT,
  internalAccount1,
  internalAccount2,
} from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useChainIdsWithBalance from './useChainIdsWithBalance';

const mockEvmChainId = '0x1';

const initialState = {
  ...initialRootState,
  engine: {
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA.internalAccounts,
          accounts: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA.internalAccounts
              .accounts,
            [MOCK_SOLANA_ACCOUNT.id]: MOCK_SOLANA_ACCOUNT,
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          [mockEvmChainId]: {
            [toChecksumHexAddress(internalAccount1.address)]: {
              balance: '0x123',
            },
            [toChecksumHexAddress(internalAccount2.address)]: {
              balance: '0x321',
            },
          },
        },
      },
      MultichainNetworkController: {
        ...initialRootState.engine.backgroundState.MultichainNetworkController,
        isEvmSelected: true,
      },
      MultichainBalancesController: {
        balances: {
          [MOCK_SOLANA_ACCOUNT.id]: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
              amount: '0.001',
              unit: 'SOL',
            },
          },
        },
      },
    },
  },
};

describe('useChainIdsWithBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns EVM chain IDs with balance', () => {
    const { result } = renderHookWithProvider(() => useChainIdsWithBalance(), {
      state: initialState,
    });

    expect(result.current).toEqual(['eip155:1']);
  });

  it('returns an empty array when no EVM chain IDs have balance', () => {
    const stateWithoutBalance = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountTrackerController: {
            accountsByChainId: {
              [mockEvmChainId]: {
                [toChecksumHexAddress(internalAccount1.address)]: {
                  balance: '0x0',
                },
                [toChecksumHexAddress(internalAccount2.address)]: {
                  balance: '0x0',
                },
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useChainIdsWithBalance(), {
      state: stateWithoutBalance,
    });

    expect(result.current).toEqual([]);
  });

  it('returns Solana chain ID if account is selected and has balance', () => {
    const state = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountsController: {
            ...initialState.engine.backgroundState.AccountsController,
            internalAccounts: {
              ...initialState.engine.backgroundState.AccountsController
                .internalAccounts,
              selectedAccount: MOCK_SOLANA_ACCOUNT.id,
            },
          },
          MultichainNetworkController: {
            ...initialState.engine.backgroundState.MultichainNetworkController,
            isEvmSelected: false,
          },
          MultichainBalancesController: {
            balances: {
              [MOCK_SOLANA_ACCOUNT.id]: {
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
                  amount: '0.005',
                  unit: 'SOL',
                },
              },
            },
          },
        },
      },
    };
    const { result } = renderHookWithProvider(() => useChainIdsWithBalance(), {
      state,
    });

    expect(result.current).toEqual(['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']);
  });

  it('doest not return Solana chain ID if account is selected and has no balance', () => {
    const state = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountsController: {
            ...initialState.engine.backgroundState.AccountsController,
            internalAccounts: {
              ...initialState.engine.backgroundState.AccountsController
                .internalAccounts,
              selectedAccount: MOCK_SOLANA_ACCOUNT.id,
            },
          },
          MultichainNetworkController: {
            ...initialState.engine.backgroundState.MultichainNetworkController,
            isEvmSelected: false,
          },
          MultichainBalancesController: {
            balances: {
              [MOCK_SOLANA_ACCOUNT.id]: {
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
                  amount: '0.0',
                  unit: 'SOL',
                },
              },
            },
          },
        },
      },
    };
    const { result } = renderHookWithProvider(() => useChainIdsWithBalance(), {
      state,
    });

    expect(result.current).toEqual([]);
  });
});
