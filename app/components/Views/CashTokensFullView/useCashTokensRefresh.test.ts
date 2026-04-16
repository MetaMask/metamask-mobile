import { renderHook, act } from '@testing-library/react-native';
import { useCashTokensRefresh } from './useCashTokensRefresh';
import Engine from '../../../core/Engine';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': { chainId: '0x1', nativeCurrency: 'ETH' },
    '0xe708': { chainId: '0xe708', nativeCurrency: 'ETH' },
  })),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenDetectionController: {
      detectTokens: jest.fn(() => Promise.resolve()),
    },
    TokenBalancesController: {
      updateBalances: jest.fn(() => Promise.resolve()),
    },
    TokenRatesController: {
      updateExchangeRates: jest.fn(() => Promise.resolve()),
    },
    NetworkEnablementController: {
      state: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0xe708': true,
          },
        },
      },
    },
  },
}));

describe('useCashTokensRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets refreshing true during onRefresh and false after completion', async () => {
    const { result } = renderHook(() => useCashTokensRefresh());

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('invokes each registered refresher on onRefresh', async () => {
    const { result } = renderHook(() => useCashTokensRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.TokenDetectionController.detectTokens,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).toHaveBeenCalledTimes(1);
  });

  it('flips refreshing back to false even when a refresher rejects', async () => {
    (
      Engine.context.TokenBalancesController.updateBalances as jest.Mock
    ).mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useCashTokensRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });
});
