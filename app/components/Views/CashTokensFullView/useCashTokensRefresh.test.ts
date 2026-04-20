import { renderHook, act } from '@testing-library/react-native';
import { useCashTokensRefresh } from './useCashTokensRefresh';
import Engine from '../../../core/Engine';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

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

jest.mock('../../UI/Tokens/util/tokenRefreshUtils', () => {
  const actual = jest.requireActual('../../UI/Tokens/util/tokenRefreshUtils');
  return {
    ...actual,
    performEvmTokenRefresh: jest.fn(actual.performEvmTokenRefresh),
  };
});

describe('useCashTokensRefresh', () => {
  const mockRefetchMerklBonus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation to delegate to the real util by default.
    const actual = jest.requireActual('../../UI/Tokens/util/tokenRefreshUtils');
    (performEvmTokenRefresh as jest.Mock).mockImplementation(
      actual.performEvmTokenRefresh,
    );
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
    const { result } = renderHook(() =>
      useCashTokensRefresh(mockRefetchMerklBonus),
    );

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
    expect(mockRefetchMerklBonus).toHaveBeenCalledTimes(1);
  });

  it('does not fail when no refetchMerklBonus is provided', async () => {
    const { result } = renderHook(() => useCashTokensRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('flips refreshing back to false and logs when performEvmTokenRefresh rejects', async () => {
    (performEvmTokenRefresh as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useCashTokensRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
    expect(loggerSpy).toHaveBeenCalled();

    loggerSpy.mockRestore();
  });
});
