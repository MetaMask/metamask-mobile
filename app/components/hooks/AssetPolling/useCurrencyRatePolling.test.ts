import useCurrencyRatePolling from './useCurrencyRatePolling';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useCurrencyRatePolling', () => {
  it('Should poll by the native currencies in network state', async () => {
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                nativeCurrency: 'ETH',
              },
              '0x89': {
                nativeCurrency: 'POL',
              },
            },
          },
        },
      },
    };

    renderHookWithProvider(() => useCurrencyRatePolling(), { state });

    expect(
      jest.mocked(Engine.context.CurrencyRateController.startPolling),
    ).toHaveBeenCalledWith({ nativeCurrencies: ['ETH', 'POL'] });
  });
});
