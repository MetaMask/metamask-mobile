import { renderHook, act } from '@testing-library/react-hooks';
import useERC20GasLimitEstimation from './useERC20GasLimitEstimation';
import { getGasLimit } from '../../../../util/custom-gas';
import { generateTransferData } from '../../../../util/transactions';
import { toHex } from '@metamask/controller-utils';
import { flushPromises } from '../../../../util/test/utils';

jest.mock('../../../../util/custom-gas', () => ({
  getGasLimit: jest.fn(),
}));

jest.mock('../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn((address) => address),
}));

const mockGetGasLimit = getGasLimit as jest.Mock;
const mockGenerateTransferData = generateTransferData as jest.Mock;

const defaultParams = {
  tokenAddress: '0x123',
  fromAddress: '0x456',
  chainId: '1',
  amount: '100',
  decimals: 18,
  isNativeToken: false,
};

const POLLING_INTERVAL = 15000; // 15s

describe('useERC20GasLimitEstimation', () => {
  const DEFAULT_GAS_LIMIT = 100000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGasLimit.mockImplementation(async () => ({
      gas: { toNumber: () => DEFAULT_GAS_LIMIT },
    }));
    mockGenerateTransferData.mockReturnValue('0xmockedData');
  });

  it('returns default transfer gas limit for native token', () => {
    const { result } = renderHook(() =>
      useERC20GasLimitEstimation({
        ...defaultParams,
        isNativeToken: true,
      }),
    );

    expect(result.current).toBe(21000);
    expect(mockGetGasLimit).not.toHaveBeenCalled();
  });

  it('returns default transfer gas limit when no token address is provided', () => {
    const { result } = renderHook(() =>
      useERC20GasLimitEstimation({
        ...defaultParams,
        tokenAddress: undefined,
      }),
    );

    expect(result.current).toBe(21000);
    expect(mockGetGasLimit).not.toHaveBeenCalled();
  });

  it('estimates gas limit for ERC20 transfer', async () => {
    const expectedGasLimit = 100000;
    mockGetGasLimit.mockImplementation(async () => ({
      gas: { toNumber: () => expectedGasLimit },
    }));

    const { result } = renderHook(() =>
      useERC20GasLimitEstimation(defaultParams),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toBe(expectedGasLimit);
    expect(mockGetGasLimit).toHaveBeenCalledWith({
      from: defaultParams.fromAddress,
      to: defaultParams.tokenAddress,
      value: '0x0',
      data: '0xmockedData',
      chainId: toHex(defaultParams.chainId),
    });
  });

  it('handles gas estimation error and maintain default gas limit', async () => {
    mockGetGasLimit.mockRejectedValue(new Error('Gas estimation failed'));
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => null);

    const { result } = renderHook(() =>
      useERC20GasLimitEstimation(defaultParams),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toBe(21000);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to estimate ERC20 transfer gas limit:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('polls for gas estimation at regular intervals', async () => {
    jest.useFakeTimers();
    const expectedGasLimit = 100000;

    mockGetGasLimit.mockImplementation(async () => ({
      gas: { toNumber: () => expectedGasLimit },
    }));

    renderHook(() => useERC20GasLimitEstimation(defaultParams));

    // Wait for immediate execution
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);

    // Advance timer and check interval execution
    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL);
      await Promise.resolve();
    });
    expect(mockGetGasLimit).toHaveBeenCalledTimes(2);

    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('handles different decimal values correctly', async () => {
    const params = {
      ...defaultParams,
      decimals: 6,
      amount: '1000',
    };

    renderHook(() => useERC20GasLimitEstimation(params));

    await flushPromises();

    expect(mockGenerateTransferData).toHaveBeenCalledWith(
      'transfer',
      expect.objectContaining({
        toAddress: expect.any(String),
        amount: expect.any(String),
      }),
    );
  }, 10000);

  it('stops polling when component unmounts', async () => {
    jest.useFakeTimers();

    const { unmount } = renderHook(() =>
      useERC20GasLimitEstimation(defaultParams),
    );

    // Wait for immediate execution
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);

    unmount();

    // Advance timers after unmount
    await act(async () => {
      jest.advanceTimersByTime(POLLING_INTERVAL);
      await Promise.resolve();
    });

    // Should still be 1 since polling stopped
    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);

    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('updates gas estimation when amount changes', async () => {
    jest.useFakeTimers();

    const { rerender } = renderHook(
      (props) => useERC20GasLimitEstimation(props),
      {
        initialProps: defaultParams,
      },
    );

    // Wait for initial call
    await act(async () => {
      await Promise.resolve();
      jest.runOnlyPendingTimers();
    });

    // Should be 2 because of immediate flag + initial effect
    expect(mockGetGasLimit).toHaveBeenCalledTimes(2);

    mockGetGasLimit.mockClear(); // Clear the call count

    // Trigger rerender with new amount
    rerender({
      ...defaultParams,
      amount: '200',
    });

    // Wait for rerender effect
    await act(async () => {
      await Promise.resolve();
      jest.runOnlyPendingTimers();
    });

    // Should be 1 new call from the rerender
    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);
    expect(mockGenerateTransferData).toHaveBeenCalledWith(
      'transfer',
      expect.objectContaining({
        amount: expect.any(String),
      }),
    );

    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('handles invalid amount or decimals', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => null);

    const params = {
      ...defaultParams,
      amount: 'invalid',
      decimals: -1,
    };

    const { result } = renderHook(() => useERC20GasLimitEstimation(params));

    // expect an immediate error
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(21000); // Should maintain default gas limit
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  }, 10000);

  it('handles empty or invalid addresses', async () => {
    const params = {
      ...defaultParams,
      tokenAddress: '',
      fromAddress: 'invalid',
    };

    const { result } = renderHook(() => useERC20GasLimitEstimation(params));

    // expect an immediate result
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(21000);
    expect(mockGetGasLimit).not.toHaveBeenCalled();
  }, 10000);

  it('updates gas estimation when chainId changes', async () => {
    jest.useFakeTimers();

    const { rerender } = renderHook(
      (props) => useERC20GasLimitEstimation(props),
      {
        initialProps: defaultParams,
      },
    );

    mockGetGasLimit.mockClear();

    // Trigger rerender with new chainId
    rerender({
      ...defaultParams,
      chainId: '56',
    });

    await act(async () => {
      await Promise.resolve();
      jest.runOnlyPendingTimers();
    });

    expect(mockGetGasLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: toHex('56'),
      }),
    );

    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('handles concurrent estimation requests', async () => {
    jest.useFakeTimers();

    let resolveFirst: (value: { gas: { toNumber: () => number } }) => void;
    let resolveSecond: (value: { gas: { toNumber: () => number } }) => void;

    const firstEstimation = new Promise<{ gas: { toNumber: () => number } }>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );

    const secondEstimation = new Promise<{ gas: { toNumber: () => number } }>(
      (resolve) => {
        resolveSecond = resolve;
      },
    );

    mockGetGasLimit
      .mockImplementationOnce(() => firstEstimation)
      .mockImplementationOnce(() => secondEstimation);

    const { result, rerender } = renderHook(() =>
      useERC20GasLimitEstimation(defaultParams),
    );

    // Start first estimation
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Trigger second estimation with new amount
    rerender({
      ...defaultParams,
      amount: '200',
    });

    // Resolve second estimation first
    await act(async () => {
      resolveSecond({ gas: { toNumber: () => 150000 } });
      await Promise.resolve();
    });

    // Verify that at least one estimation completed
    expect(result.current).toBeGreaterThan(0);

    // Resolve first estimation
    await act(async () => {
      resolveFirst({ gas: { toNumber: () => 100000 } });
      await Promise.resolve();
    });

    // Verify we still have a valid gas estimation
    expect(result.current).toBeGreaterThan(0);
    expect(typeof result.current).toBe('number');

    jest.useFakeTimers({ legacyFakeTimers: true });
  });
});
