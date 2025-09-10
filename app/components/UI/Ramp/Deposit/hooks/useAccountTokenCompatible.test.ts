import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useAccountTokenCompatible from './useAccountTokenCompatible';
const USDC_TOKEN = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

const USDC_SOLANA_TOKEN = {
  assetId: 'solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
};
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
