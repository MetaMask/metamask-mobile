import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useAccountTokenCompatible from './useAccountTokenCompatible';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import initialRootState from '../../../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  MOCK_SOLANA_ACCOUNT,
} from '../../../../../util/test/accountsControllerTestUtils';

const mockEVMCurrency: CryptoCurrency = {
  id: 'eth-1',
  symbol: 'ETH',
  name: 'Ethereum',
  address: '0x0000000000000000000000000000000000000000',
  logo: 'https://example.com/eth.png',
  network: {
    chainId: 'eip155:1',
    shortName: 'Ethereum',
  },
  decimals: 18,
  limits: ['0.001', '8'],
} as CryptoCurrency;

const mockSolanaCurrency: CryptoCurrency = {
  id: 'sol-1',
  symbol: 'SOL',
  name: 'Solana',
  address: 'So11111111111111111111111111111111111111112',
  logo: 'https://example.com/sol.png',
  network: {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    shortName: 'Solana',
  },
  decimals: 9,
  limits: ['0.001', '8'],
} as CryptoCurrency;

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
      MultichainNetworkController: {
        ...initialRootState.engine.backgroundState.MultichainNetworkController,
        isEvmSelected: true,
      },
    },
  },
};

describe('useAccountTokenCompatible', () => {
  it('returns false when cryptoCurrency is null', () => {
    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(null),
      { state: initialState },
    );

    expect(result.current).toBe(false);
  });

  it('returns false when no account is selected', () => {
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
              selectedAccount: 'non-existent-account-id',
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockEVMCurrency),
      { state },
    );

    expect(result.current).toBe(false);
  });

  it('returns true when EVM account is compatible with EVM token', () => {
    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockEVMCurrency),
      { state: initialState },
    );

    expect(result.current).toBe(true);
  });

  it('returns false when EVM account is not compatible with Solana token', () => {
    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockSolanaCurrency),
      { state: initialState },
    );

    expect(result.current).toBe(false);
  });

  it('returns true when Solana account is compatible with Solana token', () => {
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
            ...initialRootState.engine.backgroundState
              .MultichainNetworkController,
            isEvmSelected: false,
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockSolanaCurrency),
      { state },
    );

    expect(result.current).toBe(true);
  });

  it('returns false when Solana account is not compatible with EVM token', () => {
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
            ...initialRootState.engine.backgroundState
              .MultichainNetworkController,
            isEvmSelected: false,
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockEVMCurrency),
      { state },
    );

    expect(result.current).toBe(false);
  });

  it('handles numeric chainId by converting to CAIP format', () => {
    const mockNumericChainIdCurrency: CryptoCurrency = {
      ...mockEVMCurrency,
      network: {
        ...mockEVMCurrency.network,
        chainId: '1',
      },
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockNumericChainIdCurrency),
      { state: initialState },
    );

    expect(result.current).toBe(true);
  });

  it('handles account with empty scopes', () => {
    const emptyScopesAccount = {
      ...MOCK_SOLANA_ACCOUNT,
      scopes: [],
    };

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
              accounts: {
                ...initialState.engine.backgroundState.AccountsController
                  .internalAccounts.accounts,
                [emptyScopesAccount.id]: emptyScopesAccount,
              },
              selectedAccount: emptyScopesAccount.id,
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(mockEVMCurrency),
      { state },
    );

    expect(result.current).toBe(false);
  });
});
