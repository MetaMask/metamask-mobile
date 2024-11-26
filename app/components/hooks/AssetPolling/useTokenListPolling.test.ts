import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenListPolling from './useTokenListPolling';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenListController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenListPolling', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const selectedChainId = '0x1' as const;
  const state = {
    engine: {
      backgroundState: {
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

    const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {state});

    const mockedTokenListController = jest.mocked(Engine.context.TokenListController);

    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(1);
    expect(
      mockedTokenListController.startPolling
    ).toHaveBeenCalledWith({chainId: selectedChainId});

    expect(mockedTokenListController.stopPollingByPollingToken).toHaveBeenCalledTimes(0);
    unmount();
    expect(mockedTokenListController.stopPollingByPollingToken).toHaveBeenCalledTimes(1);
  });
});
