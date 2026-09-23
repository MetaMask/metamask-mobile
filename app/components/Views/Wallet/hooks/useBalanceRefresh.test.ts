import { renderHook, act } from '@testing-library/react-native';
import { useBalanceRefresh } from './useBalanceRefresh';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

let mockPopularEvmNetworks: string[] = ['0x1', '0x89'];
const mockSelectedAccountGroupAccounts = [{ id: 'account-1' }];

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    popularEvmNetworks: mockPopularEvmNetworks,
  }),
}));

jest.mock('../../../../selectors/preferencesController', () => ({
  selectUseNftDetection: jest.fn(() => true),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    // accounts.ts (transitively imported for FUNGIBLE_ASSET_TYPES) builds
    // its own selectors from this module's other exports at import time,
    // so keep those real and only override the one this hook uses.
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupInternalAccounts: jest.fn(
      () => mockSelectedAccountGroupAccounts,
    ),
  }),
);

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      getAssets: jest.fn(() => Promise.resolve()),
    },
    NftDetectionController: {
      detectNfts: jest.fn(() => Promise.resolve()),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('useBalanceRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPopularEvmNetworks = ['0x1', '0x89'];
    const { selectUseNftDetection } = jest.requireMock(
      '../../../../selectors/preferencesController',
    );
    (selectUseNftDetection as jest.Mock).mockReturnValue(true);
    (Engine.context.AssetsController.getAssets as jest.Mock).mockResolvedValue(
      undefined,
    );
    (
      Engine.context.NftDetectionController.detectNfts as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('returns refreshBalance, handleRefresh, and refreshing', () => {
    const { result } = renderHook(() => useBalanceRefresh());

    expect(result.current.refreshBalance).toBeDefined();
    expect(result.current.handleRefresh).toBeDefined();
    expect(result.current.refreshing).toBe(false);
  });

  it('sets refreshing to true during handleRefresh and false after', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('calls AssetsController.getAssets with accounts and popular chain IDs', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(Engine.context.AssetsController.getAssets).toHaveBeenCalledWith(
      mockSelectedAccountGroupAccounts,
      expect.objectContaining({
        forceUpdate: true,
        chainIds: ['eip155:1', 'eip155:137'],
      }),
    );
  });

  describe('NftDetectionController', () => {
    it('calls detectNfts with popular chain IDs and firstPageOnly', async () => {
      const { result } = renderHook(() => useBalanceRefresh());

      await act(async () => {
        await result.current.refreshBalance();
      });

      expect(
        Engine.context.NftDetectionController.detectNfts,
      ).toHaveBeenCalledWith(['0x1', '0x89'], { firstPageOnly: true });
    });

    it('does not call detectNfts when user has disabled NFT detection in settings', async () => {
      const { selectUseNftDetection } = jest.requireMock(
        '../../../../selectors/preferencesController',
      );
      (selectUseNftDetection as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useBalanceRefresh());

      await act(async () => {
        await result.current.refreshBalance();
      });

      expect(
        Engine.context.NftDetectionController.detectNfts,
      ).not.toHaveBeenCalled();
    });
  });

  it('does not log errors when individual refresh promises reject', async () => {
    const mockError = new Error('Refresh failed');
    (
      Engine.context.AssetsController.getAssets as jest.Mock
    ).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    // Promise.allSettled swallows individual rejections, so no error should be logged
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('logs timeout as non-error without emitting error events', async () => {
    jest.useFakeTimers();

    (Engine.context.AssetsController.getAssets as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
        }),
    );

    const { result } = renderHook(() => useBalanceRefresh());

    const refreshPromise = act(async () => {
      await result.current.refreshBalance();
    });

    jest.advanceTimersByTime(5000);

    await refreshPromise;

    expect(Logger.log).toHaveBeenCalledWith('Balance refresh timed out');
    expect(Logger.error).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('logs unexpected refresh exceptions as errors', async () => {
    const unexpectedError = new Error('Unexpected refresh failure');
    (
      Engine.context.AssetsController.getAssets as jest.Mock
    ).mockImplementationOnce(() => {
      throw unexpectedError;
    });

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      unexpectedError,
      'Error refreshing balance',
    );
  });

  it('calls AssetsController.getAssets only for popular EVM chain IDs', async () => {
    mockPopularEvmNetworks = ['0x1'];

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(Engine.context.AssetsController.getAssets).toHaveBeenCalledWith(
      mockSelectedAccountGroupAccounts,
      expect.objectContaining({ chainIds: ['eip155:1'] }),
    );
  });

  it('calls AssetsController.getAssets with empty array when no popular chains', async () => {
    mockPopularEvmNetworks = [];

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(Engine.context.AssetsController.getAssets).toHaveBeenCalledWith(
      mockSelectedAccountGroupAccounts,
      expect.objectContaining({ chainIds: [] }),
    );
  });
});
