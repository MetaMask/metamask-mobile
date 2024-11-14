import useTokenRatesPolling from './useTokenRatesPolling';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenRatesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenRatesPolling', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const state = {
    engine: {
      backgroundState: {
        TokenRatesController: {
          marketData: {},
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {},
            '0x89': {},
          },
        },
      },
    },
  };

  it('Should poll by provided chain ids', async () => {

    renderHookWithProvider(() => useTokenRatesPolling({chainIds: ['0x1']}), {state});

    const mockedTokenRatesController = jest.mocked(Engine.context.TokenRatesController);

    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(1);
    expect(
      mockedTokenRatesController.startPolling
    ).toHaveBeenCalledWith({chainId: '0x1'});

  });

  it('Should poll by all chain ids in network state, if no chain ids are explicitly provided', async () => {

    renderHookWithProvider(() => useTokenRatesPolling(), {state});

    const mockedTokenRatesController = jest.mocked(Engine.context.TokenRatesController);

    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(2);
    expect(
      mockedTokenRatesController.startPolling
    ).toHaveBeenCalledWith({chainId: '0x1'});
    expect(
      mockedTokenRatesController.startPolling
    ).toHaveBeenCalledWith({chainId: '0x89'});
  });
});
