import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import useRefreshMusdFiatRate from './useRefreshMusdFiatRate';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../Earn/constants/musd';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockSyncAssetsPrices = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AssetsController: {
        syncAssetsPrices: (...args: unknown[]) => mockSyncAssetsPrices(...args),
      },
    },
  },
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

const mockUseSelector = jest.mocked(useSelector);

const MOCK_EVM_ACCOUNT = { id: 'mock-account', address: '0xMock' };

function setupSelectors({
  selectedEvmAccount = MOCK_EVM_ACCOUNT as ReturnType<
    typeof selectSelectedAccountGroupEvmInternalAccount
  >,
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSelectedAccountGroupEvmInternalAccount) {
      return selectedEvmAccount;
    }
    return undefined;
  });
}

describe('useRefreshMusdFiatRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncAssetsPrices.mockResolvedValue(undefined);
    setupSelectors();
  });

  it('calls AssetsController.syncAssetsPrices with the Monad mUSD asset', async () => {
    const { result } = renderHook(() => useRefreshMusdFiatRate());

    await act(async () => {
      await result.current();
    });

    expect(mockSyncAssetsPrices).toHaveBeenCalledTimes(1);
    expect(mockSyncAssetsPrices).toHaveBeenCalledWith([
      MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD],
    ]);
  });

  it('does not call AssetsController.syncAssetsPrices when no selected EVM account exists', async () => {
    setupSelectors({ selectedEvmAccount: null });

    const { result } = renderHook(() => useRefreshMusdFiatRate());

    await act(async () => {
      await result.current();
    });

    expect(mockSyncAssetsPrices).not.toHaveBeenCalled();
  });

  describe('module-level promise dedupe', () => {
    it('returns the same in-flight promise for concurrent callers and calls the controller only once', async () => {
      let resolveRefresh!: () => void;
      mockSyncAssetsPrices.mockReturnValue(
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
      expect(mockSyncAssetsPrices).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveRefresh();
        await promise1;
      });
    });

    it('allows a retry after the in-flight promise settles', async () => {
      const { result } = renderHook(() => useRefreshMusdFiatRate());
      const refresh = result.current;

      await act(async () => {
        await refresh();
      });

      await act(async () => {
        await refresh();
      });

      expect(mockSyncAssetsPrices).toHaveBeenCalledTimes(2);
    });

    it('clears the in-flight promise after it settles so later calls do not return the old promise', async () => {
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
      mockSyncAssetsPrices.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useRefreshMusdFiatRate());

      await expect(
        act(async () => {
          await result.current();
        }),
      ).resolves.not.toThrow();
    });

    it('clears the in-flight promise even when the controller call fails', async () => {
      mockSyncAssetsPrices.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useRefreshMusdFiatRate());
      const refresh = result.current;

      await act(async () => {
        await refresh();
      });

      mockSyncAssetsPrices.mockResolvedValue(undefined);

      await act(async () => {
        await refresh();
      });

      expect(mockSyncAssetsPrices).toHaveBeenCalledTimes(2);
    });
  });
});
