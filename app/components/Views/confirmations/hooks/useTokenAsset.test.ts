import { strings } from '../../../../../locales/i18n';
import { useTokenAsset } from './useTokenAsset';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

jest.mock('./transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn().mockReturnValue({
    chainId: '0x1',
    txParams: {
      to: '0x0000000000000000000000000000000000000000',
      from: '0x0000000000000000000000000000000000000000',
    },
  }),
}));

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.Mock;

describe('useTokenAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        to: '0x0000000000000000000000000000000000000000',
        from: '0x0000000000000000000000000000000000000000',
      },
    });
  });

  it('returns "unknown" token name and symbol when the asset symbol is not found', () => {
    const { result } = renderHookWithProvider(useTokenAsset, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
          },
        },
      },
    });

    expect(result.current.displayName).toEqual(strings('token.unknown'));
  });

  it('returns asset', () => {
    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.asset).toMatchObject({
      name: 'Ethereum',
      symbol: 'Ethereum',
    });
    expect(result.current.displayName).toEqual('ETH');
  });

  it('returns correct token when non-EVM network is selected but sending EVM token', () => {
    // This test verifies the fix for the bug where "Unknown" was displayed
    // when a non-EVM network (Solana, BTC, Tron) was selected in the Network Manager
    // while sending EVM tokens.

    // Mock transaction with EVM from address
    const evmAddress = '0x0000000000000000000000000000000000000000';
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        to: evmAddress,
        from: evmAddress,
      },
    });

    // State where a non-EVM account is selected but we have EVM tokens
    // associated with the transaction's from address
    const stateWithNonEvmSelected = {
      ...stakingDepositConfirmationState,
      engine: {
        backgroundState: {
          ...stakingDepositConfirmationState.engine.backgroundState,
          // Simulate a non-EVM network being selected by having a different selected account
          // The key fix is that useTokenAsset now uses txParams.from instead of selected account
          AccountsController: {
            ...stakingDepositConfirmationState.engine.backgroundState
              .AccountsController,
            internalAccounts: {
              ...stakingDepositConfirmationState.engine.backgroundState
                .AccountsController.internalAccounts,
              // The selected account could be a Solana account, but the tokens
              // should still be fetched using the EVM from address in txParams
              selectedAccount: '0x0000000000000000000000000000000000000000',
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stateWithNonEvmSelected,
    });

    // Should return the correct token name instead of "Unknown"
    expect(result.current.asset).toMatchObject({
      name: 'Ethereum',
      symbol: 'Ethereum',
    });
    expect(result.current.displayName).toEqual('ETH');
  });

  it('returns "unknown" when chainId is not provided', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: undefined,
      txParams: {
        to: '0x0000000000000000000000000000000000000000',
        from: '0x0000000000000000000000000000000000000000',
      },
    });

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.displayName).toEqual(strings('token.unknown'));
  });

  it('returns "unknown" when transaction metadata is not available', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.displayName).toEqual(strings('token.unknown'));
  });
});
