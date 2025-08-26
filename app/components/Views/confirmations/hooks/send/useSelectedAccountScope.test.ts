import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSelectedAccountScope } from './useSelectedAccountScope';

describe('useSelectedAccountScope', () => {
  const mockEvmAccount = {
    id: 'evm-account-1',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa' as const,
    metadata: {
      name: 'EVM Account',
      keyring: {
        type: 'HD Key Tree',
      },
    },
  };

  const mockSolanaAccount = {
    id: 'solana-account-1',
    address: 'Sol1234567890123456789012345678901234567890',
    type: 'solana:data-account' as const,
    metadata: {
      name: 'Solana Account',
      keyring: {
        type: 'Solana Keyring',
      },
    },
  };

  const mockUnknownAccount = {
    id: 'unknown-account-1',
    address: 'unknown1234567890123456789012345678901234567890',
    type: 'bitcoin:legacy',
    metadata: {
      name: 'Unknown Account',
      keyring: {
        type: 'Bitcoin Keyring',
      },
    },
  };

  it('returns undefined flags when no account is selected', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '',
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSelectedAccountScope(), {
      state,
    });

    expect(result.current).toEqual({
      account: undefined,
      isSolana: undefined,
      isEvm: undefined,
    });
  });

  it('returns isSolana true for solana account type', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [mockSolanaAccount.id]: mockSolanaAccount,
              },
              selectedAccount: mockSolanaAccount.id,
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSelectedAccountScope(), {
      state,
    });

    expect(result.current).toEqual({
      account: mockSolanaAccount,
      isSolana: true,
      isEvm: undefined,
    });
  });

  it('returns isEvm true for eip155 account type', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [mockEvmAccount.id]: mockEvmAccount,
              },
              selectedAccount: mockEvmAccount.id,
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSelectedAccountScope(), {
      state,
    });

    expect(result.current).toEqual({
      account: mockEvmAccount,
      isSolana: undefined,
      isEvm: true,
    });
  });

  it('returns undefined flags for unknown account type', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [mockUnknownAccount.id]: mockUnknownAccount,
              },
              selectedAccount: mockUnknownAccount.id,
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSelectedAccountScope(), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: state as any,
    });

    expect(result.current).toEqual({
      account: mockUnknownAccount,
      isSolana: undefined,
      isEvm: undefined,
    });
  });

  it('handles account type containing solana substring', () => {
    const solanaVariantAccount = {
      ...mockSolanaAccount,
      type: 'solana:custom-variant',
    };

    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [solanaVariantAccount.id]: solanaVariantAccount,
              },
              selectedAccount: solanaVariantAccount.id,
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSelectedAccountScope(), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: state as any,
    });

    expect(result.current).toEqual({
      account: solanaVariantAccount,
      isSolana: true,
      isEvm: undefined,
    });
  });

  it('handles account type containing eip155 substring', () => {
    const evmVariantAccount = {
      ...mockEvmAccount,
      type: 'eip155:custom-variant',
    };

    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [evmVariantAccount.id]: evmVariantAccount,
              },
              selectedAccount: evmVariantAccount.id,
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSelectedAccountScope(), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: state as any,
    });

    expect(result.current).toEqual({
      account: evmVariantAccount,
      isSolana: undefined,
      isEvm: true,
    });
  });
});
