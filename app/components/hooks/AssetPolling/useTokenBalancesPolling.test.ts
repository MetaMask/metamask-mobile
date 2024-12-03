import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenBalancesPolling from './useTokenBalancesPolling';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenBalancesPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const selectedChainId = '0x1' as const;
  const state = {
    engine: {
      backgroundState: {
        TokenBalancesController: {
          tokenBalances: {},
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networkConfigurationsByChainId: {
            [selectedChainId]: {
              chainId: selectedChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
            },
            '0x89': {},
          },
        },
      },
    },
  };

  it('should poll by selected chain id when portfolio view is disabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling(),
      {
        state,
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: selectedChainId,
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll all network configurations when portfolio view is enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling(),
      {
        state,
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(2); // For both chain IDs
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: selectedChainId,
    });
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x89',
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('should use provided chainIds when specified, even with portfolio view enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const specificChainIds = ['0x5' as const];
    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling({ chainIds: specificChainIds }),
      { state },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x5',
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });
});
