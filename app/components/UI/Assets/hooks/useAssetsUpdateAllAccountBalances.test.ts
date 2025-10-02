import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import Engine from '../../../../core/Engine';
import useAssetsUpdateAllAccountBalances from './useAssetsUpdateAllAccountBalances';
import { RootState } from '../../../../reducers';
import Logger from '../../../../util/Logger';

// Mock Engine context
jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      updateBalances: jest.fn(),
    },
  },
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useAssetsUpdateAllAccountBalances', () => {
  const state = {
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
              '0x89': true,
              '0xa': true,
            },
          },
        },
      },
    },
  } as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls TokenBalancesController.updateBalances with enabled chain IDs', () => {
    renderHookWithProvider(() => useAssetsUpdateAllAccountBalances(), {
      state,
    });

    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x89', '0xa'],
      queryAllAccounts: true,
    });
  });

  it('returns updateBalances function', () => {
    const { result } = renderHookWithProvider(
      () => useAssetsUpdateAllAccountBalances(),
      { state },
    );

    expect(result.current.updateBalances).toBeInstanceOf(Function);
  });

  it('triggers updateBalances on component mount', () => {
    renderHookWithProvider(() => useAssetsUpdateAllAccountBalances(), {
      state,
    });

    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not call updateBalances when no chains are enabled', () => {
    const stateWithNoEnabledChains = {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...state.engine.backgroundState,
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {},
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useAssetsUpdateAllAccountBalances(), {
      state: stateWithNoEnabledChains,
    });

    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).not.toHaveBeenCalled();
  });

  it('handles updateBalances errors without throwing', async () => {
    const mockError = new Error('Network error');
    const mockUpdateBalances = Engine.context.TokenBalancesController
      .updateBalances as jest.Mock;
    mockUpdateBalances.mockRejectedValueOnce(mockError);

    const { result } = renderHookWithProvider(
      () => useAssetsUpdateAllAccountBalances(),
      { state },
    );

    // Manually call the function to test error handling
    await result.current.updateBalances();

    // Error should be logged, not thrown
    expect(Logger.error).toHaveBeenCalledWith(
      mockError,
      'Error updating balances state for all accounts',
    );
  });
});
