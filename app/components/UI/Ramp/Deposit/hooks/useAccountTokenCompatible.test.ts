import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useAccountTokenCompatible from './useAccountTokenCompatible';
import { USDC_SOLANA_TOKEN, USDC_TOKEN } from '../constants';
import initialRootState from '../../../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  MOCK_SOLANA_ACCOUNT,
} from '../../../../../util/test/accountsControllerTestUtils';

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
  it('returns false when the EVM account is not compatible with the token', () => {
    const state = {
      ...initialState,
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(USDC_SOLANA_TOKEN),
      { state },
    );

    expect(result.current).toBe(false);
  });

  it('returns false when the non EVM account is not compatible with the token', () => {
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
      () => useAccountTokenCompatible(USDC_TOKEN),
      { state },
    );

    expect(result.current).toBe(false);
  });

  it('returns true when the EVM account is compatible with the token', () => {
    const state = {
      ...initialState,
    };

    const { result } = renderHookWithProvider(
      () => useAccountTokenCompatible(USDC_TOKEN),
      { state },
    );

    expect(result.current).toBe(true);
  });

  it('returns true when the non-EVM account is compatible with the token', () => {
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
      () => useAccountTokenCompatible(USDC_SOLANA_TOKEN),
      { state },
    );

    expect(result.current).toBe(true);
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
      () => useAccountTokenCompatible(USDC_TOKEN),
      { state },
    );

    expect(result.current).toBe(false);
  });
});
