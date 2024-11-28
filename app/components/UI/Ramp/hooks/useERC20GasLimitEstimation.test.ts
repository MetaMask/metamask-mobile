import { renderHook, act } from '@testing-library/react-hooks';
import useERC20GasLimitEstimation from './useERC20GasLimitEstimation';
import { getGasLimit } from '../../../../util/custom-gas';

jest.mock('../../../../util/custom-gas', () => ({
  getGasLimit: jest.fn(),
}));

const mockGetGasLimit = getGasLimit as jest.Mock;

const defaultParams = {
  tokenAddress: '0x123',
  fromAddress: '0x456',
  chainId: '1',
  amount: '100',
  decimals: 18,
  isNativeToken: false,
};

describe('useERC20GasLimitEstimation', () => {
  const DEFAULT_GAS_LIMIT = 100000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGasLimit.mockImplementation(async () => ({
      gas: { toNumber: () => DEFAULT_GAS_LIMIT },
    }));
  });

  it('should return default transfer gas limit for native token', () => {
    const { result } = renderHook(() =>
      useERC20GasLimitEstimation({
        ...defaultParams,
        isNativeToken: true,
      }),
    );

    expect(result.current).toBe(21000);
    expect(mockGetGasLimit).not.toHaveBeenCalled();
  });

  it('should return default transfer gas limit when no token address is provided', () => {
    const { result } = renderHook(() =>
      useERC20GasLimitEstimation({
        ...defaultParams,
        tokenAddress: undefined,
      }),
    );

    expect(result.current).toBe(21000);
    expect(mockGetGasLimit).not.toHaveBeenCalled();
  });

  it('should estimate gas limit for ERC20 transfer', async () => {
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
    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);
  });

  it('should handle gas estimation error and maintain default gas limit', async () => {
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

  it('should poll for gas estimation at regular intervals', async () => {
    jest.useFakeTimers();
    const expectedGasLimit = 100000;

    mockGetGasLimit.mockImplementation(async () => ({
      gas: { toNumber: () => expectedGasLimit },
    }));

    renderHook(() => useERC20GasLimitEstimation(defaultParams));

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(mockGetGasLimit).toHaveBeenCalledTimes(2); // Immediate + first interval

    // Wait for next interval
    await act(async () => {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(mockGetGasLimit).toHaveBeenCalledTimes(3); // Previous calls + one new interval call

    jest.useRealTimers();
  });
});
