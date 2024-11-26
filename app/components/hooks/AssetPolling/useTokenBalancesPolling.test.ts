import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenBalancesPolling from './useTokenBalancesPolling';

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
              rpcEndpoints: [{
                networkClientId: 'selectedNetworkClientId',
              }]
            },
            '0x89': {},
          },
        },
      },
    },
  };

  it('Should poll by selected chain id, and stop polling on dismount', async () => {

    const { unmount } = renderHookWithProvider(() => useTokenBalancesPolling(), {state});

    const mockedTokenBalancesController = jest.mocked(Engine.context.TokenBalancesController);

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(
      mockedTokenBalancesController.startPolling
    ).toHaveBeenCalledWith({chainId: selectedChainId});

    expect(mockedTokenBalancesController.stopPollingByPollingToken).toHaveBeenCalledTimes(0);
    unmount();
    expect(mockedTokenBalancesController.stopPollingByPollingToken).toHaveBeenCalledTimes(1);
  });
});
