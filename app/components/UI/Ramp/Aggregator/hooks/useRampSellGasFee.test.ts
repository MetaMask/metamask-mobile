import { act, waitFor } from '@testing-library/react-native';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  GasFeeEstimates,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { flushPromises } from '../../../../../util/test/utils';
import {
  estimateGasBuffered,
  estimateGasFee,
} from '../../../../../util/transaction-controller';
import { fetchEstimatedMultiLayerL1Fee } from '../../../../../util/networks/engineNetworkUtils';
import { getRampGasBufferMultiplier } from '../utils/getRampGasBufferMultiplier';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import useRampSellGasFee from './useRampSellGasFee';

jest.mock('../../../../../util/transaction-controller', () => ({
  estimateGasBuffered: jest.fn(),
  estimateGasFee: jest.fn(),
}));

jest.mock('../../../../../util/networks/engineNetworkUtils', () => ({
  fetchEstimatedMultiLayerL1Fee: jest.fn(),
}));

jest.mock('../utils/getRampGasBufferMultiplier', () => ({
  getRampGasBufferMultiplier: jest.fn(),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

const mockEstimateGasBuffered = jest.mocked(estimateGasBuffered);
const mockEstimateGasFee = jest.mocked(estimateGasFee);
const mockFetchL1Fee = jest.mocked(fetchEstimatedMultiLayerL1Fee);
const mockGetBufferMultiplier = jest.mocked(getRampGasBufferMultiplier);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

const GWEI = 1_000_000_000n;

const TRANSACTION = {
  from: '0x2990079bcdee240329a520d2444386fc119da21a',
  to: '0x1111111111111111111111111111111111111111',
  value: '0x1',
  chainId: '0x1' as const,
};

const FEE_MARKET_ESTIMATES: GasFeeEstimates = {
  type: GasFeeEstimateType.FeeMarket,
  low: { maxFeePerGas: '0x3b9aca00', maxPriorityFeePerGas: '0x3b9aca00' },
  medium: { maxFeePerGas: '0x5f5e1000', maxPriorityFeePerGas: '0x3b9aca00' },
  high: { maxFeePerGas: '0x77359400', maxPriorityFeePerGas: '0x3b9aca00' },
};

type HookArgs = Parameters<typeof useRampSellGasFee>[0];

const defaultArgs: HookArgs = {
  networkClientId: 'mainnet',
  chainId: '0x1',
  transaction: TRANSACTION,
  level: GasFeeEstimateLevel.High,
};

let currentArgs: HookArgs = defaultArgs;
let mockNetworkTier: ReturnType<typeof useNetworkTier> = 'WIFI';

function renderHook(args: Partial<HookArgs> = {}) {
  currentArgs = { ...defaultArgs, ...args };
  const hooks = renderHookWithProvider(() => useRampSellGasFee(currentArgs), {
    state: { engine: { backgroundState } },
  });

  return {
    ...hooks,
    rerenderWith(nextArgs: Partial<HookArgs>) {
      currentArgs = { ...currentArgs, ...nextArgs };
      hooks.rerender(undefined);
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useRampSellGasFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkTier = 'WIFI';
    mockUseNetworkTier.mockImplementation(() => mockNetworkTier);
    mockGetBufferMultiplier.mockReturnValue(1.5);
    mockEstimateGasBuffered.mockResolvedValue({
      gas: '0x4aed4',
      simulationFails: undefined,
    });
    mockEstimateGasFee.mockResolvedValue({
      estimates: FEE_MARKET_ESTIMATES,
    });
    mockFetchL1Fee.mockResolvedValue(undefined);
  });

  it('reserves gas × buffer × maxFeePerGas for fee-market chains', async () => {
    const { result } = renderHook();

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(mockEstimateGasBuffered).toHaveBeenCalledWith(
      TRANSACTION,
      1.5,
      'mainnet',
    );
    expect(result.current).toEqual({
      status: 'ready',
      gasFeeWei: 306_900n * 2n * GWEI,
    });
  });

  it('uses the legacy level price and the eth_gasPrice price', async () => {
    mockEstimateGasBuffered.mockResolvedValue({
      gas: '0x5208',
      simulationFails: undefined,
    });

    mockEstimateGasFee.mockResolvedValueOnce({
      estimates: {
        type: GasFeeEstimateType.Legacy,
        low: '0x3b9aca00',
        medium: '0x3b9aca00',
        high: '0x3b9aca00',
      },
    });
    const legacy = renderHook();
    await waitFor(() => expect(legacy.result.current.status).toBe('ready'));
    expect(legacy.result.current).toEqual({
      status: 'ready',
      gasFeeWei: 21_000n * GWEI,
    });

    mockEstimateGasFee.mockResolvedValueOnce({
      estimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x77359400',
      },
    });
    const gasPrice = renderHook();
    await waitFor(() => expect(gasPrice.result.current.status).toBe('ready'));
    expect(gasPrice.result.current).toEqual({
      status: 'ready',
      gasFeeWei: 21_000n * 2n * GWEI,
    });
  });

  it('adds the L1 fee', async () => {
    mockFetchL1Fee.mockResolvedValue('5af3107a4000');

    const { result } = renderHook();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toEqual({
      status: 'ready',
      gasFeeWei: 306_900n * 2n * GWEI + 100_000_000_000_000n,
    });
  });

  it('follows the node: pre-EIP-2780 21,000 vs EIP-2780 new account 204,600', async () => {
    mockEstimateGasBuffered.mockResolvedValueOnce({
      gas: '0x5208',
      simulationFails: undefined,
    });
    const existingAccount = renderHook();
    await waitFor(() =>
      expect(existingAccount.result.current.status).toBe('ready'),
    );

    mockEstimateGasBuffered.mockResolvedValueOnce({
      gas: '0x31f38',
      simulationFails: undefined,
    });
    const newAccount = renderHook();
    await waitFor(() => expect(newAccount.result.current.status).toBe('ready'));

    expect(existingAccount.result.current).toEqual({
      status: 'ready',
      gasFeeWei: 21_000n * 2n * GWEI,
    });
    expect(newAccount.result.current).toEqual({
      status: 'ready',
      gasFeeWei: 204_600n * 2n * GWEI,
    });
  });

  it('reports error when simulationFails is set', async () => {
    mockEstimateGasBuffered.mockResolvedValue({
      gas: '0x1c9c380',
      simulationFails: { reason: 'x', debug: {} },
    });

    const { result } = renderHook();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({ status: 'error' });
  });

  it('reports error when estimation throws', async () => {
    mockEstimateGasBuffered.mockRejectedValue(new Error('node unavailable'));

    const { result } = renderHook();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({ status: 'error' });
  });

  it('drops a stale result when the network client changes mid-flight', async () => {
    const first = deferred<{
      gas: string;
      simulationFails: undefined;
    }>();
    const second = deferred<{
      gas: string;
      simulationFails: undefined;
    }>();
    mockEstimateGasBuffered
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerenderWith } = renderHook();

    rerenderWith({ networkClientId: 'base' });

    await act(async () => {
      second.resolve({ gas: '0x5208', simulationFails: undefined });
      await flushPromises();
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      first.resolve({ gas: '0x4aed4', simulationFails: undefined });
      await flushPromises();
    });

    expect(result.current).toEqual({
      status: 'ready',
      gasFeeWei: 21_000n * 2n * GWEI,
    });
  });

  it('drops an in-flight result after unmount', async () => {
    const pending = deferred<{
      gas: string;
      simulationFails: undefined;
    }>();
    mockEstimateGasBuffered.mockReturnValueOnce(pending.promise);

    const { unmount } = renderHook();
    unmount();

    await act(async () => {
      pending.resolve({ gas: '0x5208', simulationFails: undefined });
      await flushPromises();
    });

    expect(mockFetchL1Fee).not.toHaveBeenCalled();
  });

  it('keeps the previous ready value until a successful refresh lands', async () => {
    mockNetworkTier = 'SLOW_CELLULAR';
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      const refresh = deferred<{
        gas: string;
        simulationFails: undefined;
      }>();
      mockEstimateGasBuffered.mockReturnValueOnce(refresh.promise);

      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });

      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 306_900n * 2n * GWEI,
      });

      await act(async () => {
        refresh.resolve({ gas: '0x5208', simulationFails: undefined });
      });

      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 21_000n * 2n * GWEI,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('is idle without a transaction or when offline', async () => {
    const missingTransaction = renderHook({ transaction: undefined });
    expect(missingTransaction.result.current).toEqual({ status: 'idle' });
    expect(mockEstimateGasBuffered).not.toHaveBeenCalled();

    mockNetworkTier = 'NONE';
    const offline = renderHook();
    expect(offline.result.current).toEqual({ status: 'idle' });
    expect(mockEstimateGasBuffered).not.toHaveBeenCalled();
  });

  it('refreshes every 60s on slow cellular and 15s otherwise', async () => {
    jest.useFakeTimers();

    try {
      mockNetworkTier = 'SLOW_CELLULAR';
      const slow = renderHook();
      await act(async () => undefined);
      expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(59_999);
      });
      expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(2);

      slow.unmount();
    } finally {
      jest.useRealTimers();
    }

    for (const tier of ['WIFI', null] as const) {
      jest.useFakeTimers();
      try {
        mockEstimateGasBuffered.mockClear();
        mockNetworkTier = tier;
        const fast = renderHook();
        await act(async () => undefined);
        expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(1);

        await act(async () => {
          jest.advanceTimersByTime(15_000);
        });
        expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(2);
        fast.unmount();
      } finally {
        jest.useRealTimers();
      }
    }
  });

  it('keeps the last ready value when a refresh fails', async () => {
    mockNetworkTier = 'SLOW_CELLULAR';
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      mockEstimateGasBuffered.mockRejectedValueOnce(new Error('flaky node'));

      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });

      expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 306_900n * 2n * GWEI,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('marks the estimate stale after two refresh intervals without a success', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      mockEstimateGasBuffered.mockRejectedValue(new Error('node unavailable'));

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current.status).toBe('ready');

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current).toEqual({ status: 'error' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('marks a hanging refresh stale', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      mockEstimateGasBuffered.mockReturnValue(new Promise(() => undefined));

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(result.current).toEqual({ status: 'error' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('marks a hanging first estimate as error after the stale window', async () => {
    mockEstimateGasBuffered.mockReturnValue(new Promise(() => undefined));
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current).toEqual({ status: 'loading' });

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current).toEqual({ status: 'loading' });

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current).toEqual({ status: 'error' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses a 120 s stale window on slow cellular', async () => {
    mockNetworkTier = 'SLOW_CELLULAR';
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      mockEstimateGasBuffered.mockRejectedValue(new Error('node unavailable'));

      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(result.current.status).toBe('ready');

      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(result.current).toEqual({ status: 'error' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('recovers to ready when a refresh succeeds after going stale', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      mockEstimateGasBuffered.mockRejectedValue(new Error('node unavailable'));

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(result.current).toEqual({ status: 'error' });

      mockEstimateGasBuffered.mockResolvedValue({
        gas: '0x5208',
        simulationFails: undefined,
      });

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 21_000n * 2n * GWEI,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('accepts a slow success that lands after one refresh interval', async () => {
    jest.useFakeTimers();
    try {
      const slow = deferred<{ gas: string; simulationFails: undefined }>();
      mockEstimateGasBuffered.mockReturnValueOnce(slow.promise);

      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current).toEqual({ status: 'loading' });

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(1);

      await act(async () => {
        slow.resolve({ gas: '0x5208', simulationFails: undefined });
      });
      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 21_000n * 2n * GWEI,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('accepts a slow refresh after a ready value', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current.status).toBe('ready');

      const refresh = deferred<{ gas: string; simulationFails: undefined }>();
      mockEstimateGasBuffered.mockReturnValueOnce(refresh.promise);

      // 15 s: the refresh starts.
      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      // 30 s: stale cap flips to error; the tick does not start a duplicate.
      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current).toEqual({ status: 'error' });
      expect(mockEstimateGasBuffered).toHaveBeenCalledTimes(2);

      // 32 s: the 17 s refresh lands and is accepted.
      await act(async () => {
        jest.advanceTimersByTime(2_000);
        refresh.resolve({ gas: '0x5208', simulationFails: undefined });
      });
      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 21_000n * 2n * GWEI,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('replaces a hung request after the stale window and recovers', async () => {
    jest.useFakeTimers();
    try {
      let calls = 0;
      mockEstimateGasBuffered.mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          return new Promise<never>(() => undefined);
        }
        if (calls === 2) {
          return Promise.reject(new Error('node unavailable'));
        }
        return Promise.resolve({ gas: '0x5208', simulationFails: undefined });
      });

      const { result } = renderHook();
      await act(async () => undefined);
      expect(result.current).toEqual({ status: 'loading' });

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(result.current).toEqual({ status: 'error' });

      await act(async () => {
        jest.advanceTimersByTime(15_000);
      });
      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 21_000n * 2n * GWEI,
      });
      expect(calls).toBe(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('starts a fresh request after going offline and back online', async () => {
    jest.useFakeTimers();
    try {
      mockEstimateGasBuffered.mockReturnValueOnce(new Promise(() => undefined));
      const { result, rerenderWith } = renderHook();
      await act(async () => undefined);
      expect(result.current).toEqual({ status: 'loading' });

      mockNetworkTier = 'NONE';
      await act(async () => {
        rerenderWith({});
      });
      expect(result.current).toEqual({ status: 'idle' });

      mockNetworkTier = 'WIFI';
      mockEstimateGasBuffered.mockResolvedValue({
        gas: '0x5208',
        simulationFails: undefined,
      });
      await act(async () => {
        rerenderWith({});
      });
      expect(result.current).toEqual({
        status: 'ready',
        gasFeeWei: 21_000n * 2n * GWEI,
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
