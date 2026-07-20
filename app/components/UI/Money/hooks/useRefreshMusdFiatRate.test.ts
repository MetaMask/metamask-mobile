import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import useRefreshMusdFiatRate from './useRefreshMusdFiatRate';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockGetAssets = jest.fn().mockResolvedValue(undefined);
const mockUpdateExchangeRates = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AssetsController: {
        getAssets: (...args: unknown[]) => mockGetAssets(...args),
      },
      TokenRatesController: {
        updateExchangeRates: (...args: unknown[]) =>
          mockUpdateExchangeRates(...args),
      },
    },
  },
}));

jest.mock(
  '../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(),
  }),
);
jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);
jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

const MOCK_EVM_ACCOUNT = { id: 'mock-account', address: '0xMock' };
const MOCK_NETWORK_CONFIGS = { '0x8f': { nativeCurrency: 'MON' } };

function setupSelectors({
  isAssetsUnifyStateEnabled = false,
  selectedEvmAccount = MOCK_EVM_ACCOUNT as ReturnType<
    typeof selectSelectedAccountGroupEvmInternalAccount
  >,
  networkConfigurations = MOCK_NETWORK_CONFIGS as unknown as ReturnType<
    typeof selectNetworkConfigurations
  >,
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsAssetsUnifyStateEnabled) {
      return isAssetsUnifyStateEnabled;
    }
    if (selector === selectSelectedAccountGroupEvmInternalAccount) {
      return selectedEvmAccount;
    }
    if (selector === selectNetworkConfigurations) {
      return networkConfigurations;
    }
    return undefined;
  });
}

describe('useRefreshMusdFiatRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssets.mockResolvedValue(undefined);
    mockUpdateExchangeRates.mockResolvedValue(undefined);
    setupSelectors();
  });

  describe('unified assets path (isAssetsUnifyStateEnabled = true)', () => {
    it('calls AssetsController.getAssets with Monad chain, price data type, and forceUpdate for the mUSD asset', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: true });

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await act(async () => {
        await result.current();
      });

      expect(mockGetAssets).toHaveBeenCalledTimes(1);
      expect(mockGetAssets).toHaveBeenCalledWith(
        [MOCK_EVM_ACCOUNT],
        expect.objectContaining({
          dataTypes: ['price'],
          forceUpdate: true,
        }),
      );
    });

    it('does not call AssetsController.getAssets when no selected EVM account exists', async () => {
      setupSelectors({
        isAssetsUnifyStateEnabled: true,
        selectedEvmAccount: null,
      });

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await act(async () => {
        await result.current();
      });

      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('does not call TokenRatesController.updateExchangeRates in unified mode', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: true });

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await act(async () => {
        await result.current();
      });

      expect(mockUpdateExchangeRates).not.toHaveBeenCalled();
    });
  });

  describe('legacy path (isAssetsUnifyStateEnabled = false)', () => {
    it('calls TokenRatesController.updateExchangeRates with Monad and its native currency', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await act(async () => {
        await result.current();
      });

      expect(mockUpdateExchangeRates).toHaveBeenCalledTimes(1);
      expect(mockUpdateExchangeRates).toHaveBeenCalledWith([
        { chainId: '0x8f', nativeCurrency: 'MON' },
      ]);
    });

    it('does not call TokenRatesController.updateExchangeRates when Monad native currency is missing', async () => {
      setupSelectors({
        isAssetsUnifyStateEnabled: false,
        networkConfigurations: {},
      });

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await act(async () => {
        await result.current();
      });

      expect(mockUpdateExchangeRates).not.toHaveBeenCalled();
    });

    it('does not call AssetsController.getAssets in legacy mode', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await act(async () => {
        await result.current();
      });

      expect(mockGetAssets).not.toHaveBeenCalled();
    });
  });

  describe('module-level promise dedupe', () => {
    it('returns the same in-flight promise for concurrent callers and calls the controller only once', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });

      let resolveRefresh!: () => void;
      mockUpdateExchangeRates.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      const { result } = renderHook(() => useRefreshMusdFiatRate());
      const refresh = result.current;

      const promise1 = refresh();
      const promise2 = refresh();
      const promise3 = refresh();

      expect(promise1).toBe(promise2);
      expect(promise1).toBe(promise3);
      expect(mockUpdateExchangeRates).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveRefresh();
        await promise1;
      });
    });

    it('allows a retry after the in-flight promise settles', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });

      const { result } = renderHook(() => useRefreshMusdFiatRate());
      const refresh = result.current;

      await act(async () => {
        await refresh();
      });

      await act(async () => {
        await refresh();
      });

      expect(mockUpdateExchangeRates).toHaveBeenCalledTimes(2);
    });

    it('clears the in-flight promise after it settles so later calls do not return the old promise', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });

      const { result } = renderHook(() => useRefreshMusdFiatRate());
      const refresh = result.current;

      let firstPromise!: Promise<void>;
      await act(async () => {
        firstPromise = refresh();
        await firstPromise;
      });

      let secondPromise!: Promise<void>;
      act(() => {
        secondPromise = refresh();
      });

      expect(firstPromise).not.toBe(secondPromise);
    });
  });

  describe('error handling', () => {
    it('logs and swallows AssetsController errors instead of throwing', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: true });
      mockGetAssets.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await expect(
        act(async () => {
          await result.current();
        }),
      ).resolves.not.toThrow();
    });

    it('logs and swallows TokenRatesController errors instead of throwing', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });
      mockUpdateExchangeRates.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await expect(
        act(async () => {
          await result.current();
        }),
      ).resolves.not.toThrow();
    });

    it('clears the in-flight promise even when the controller call fails', async () => {
      setupSelectors({ isAssetsUnifyStateEnabled: false });
      mockUpdateExchangeRates.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useRefreshMusdFiatRate());
      const refresh = result.current;

      await act(async () => {
        await refresh();
      });

      mockUpdateExchangeRates.mockResolvedValue(undefined);

      await act(async () => {
        await refresh();
      });

      expect(mockUpdateExchangeRates).toHaveBeenCalledTimes(2);
    });
  });
});
