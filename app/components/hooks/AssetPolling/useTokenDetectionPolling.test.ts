import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenDetectionPolling from './useTokenDetectionPolling';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenDetectionController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenDetectionPolling', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const selectedAddress = '0x1234567890abcdef';
  const selectedChainId = '0x1' as const;

  const state = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: '1',
            accounts: {
              '1': {
                address: selectedAddress
              }
            },
          },
        },
        PreferencesController: {
          useTokenDetection: true,
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

  it('Should poll by current chain ids/address, and stop polling on dismount', async () => {

    const { unmount } = renderHookWithProvider(() => useTokenDetectionPolling(), {state});

    const mockedTokenDetectionController = jest.mocked(Engine.context.TokenDetectionController);

    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(1);
    expect(
      mockedTokenDetectionController.startPolling
    ).toHaveBeenCalledWith({chainIds: [selectedChainId], address: selectedAddress});

    expect(mockedTokenDetectionController.stopPollingByPollingToken).toHaveBeenCalledTimes(0);
    unmount();
    expect(mockedTokenDetectionController.stopPollingByPollingToken).toHaveBeenCalledTimes(1);

  });

  it('Should not poll when token detection is disabled', async () => {

    renderHookWithProvider(() => useTokenDetectionPolling({chainIds: ['0x1']}), {state:{
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...state.engine.backgroundState,
          PreferencesController: {
            ...state.engine.backgroundState.PreferencesController,
            useTokenDetection: false,
          },
        },
      },
    }});

    const mockedTokenDetectionController = jest.mocked(Engine.context.TokenDetectionController);
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(0);
    expect(mockedTokenDetectionController.stopPollingByPollingToken).toHaveBeenCalledTimes(0);
  });
});
