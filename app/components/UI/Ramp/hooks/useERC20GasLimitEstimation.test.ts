import { renderHook, act } from '@testing-library/react-hooks';
import useERC20GasLimitEstimation from './useERC20GasLimitEstimation';
import { getGasLimit } from '../../../../util/custom-gas';
import { generateTransferData } from '../../../../util/transactions';
import { toHex } from '@metamask/controller-utils';

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
    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);
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

  it('handles different decimal values correctly', async () => {
    const params = {
      ...defaultParams,
      decimals: 6,
      amount: '1000',
    };

    renderHook(() => useERC20GasLimitEstimation(params));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGenerateTransferData).toHaveBeenCalledWith(
      'transfer',
      expect.objectContaining({
        toAddress: expect.any(String),
        amount: expect.any(String),
      }),
    );
  });

  it('stops polling when component unmounts', async () => {
    jest.useFakeTimers();

    const { unmount } = renderHook(() =>
      useERC20GasLimitEstimation(defaultParams),
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    // Should not call getGasLimit after unmount
    expect(mockGetGasLimit).toHaveBeenCalledTimes(2); // Only immediate + first interval

    jest.useRealTimers();
  });

  it('updates gas estimation when amount changes', async () => {
    const { rerender } = renderHook(
      (props) => useERC20GasLimitEstimation(props),
      {
        initialProps: defaultParams,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetGasLimit).toHaveBeenCalledTimes(1);

    rerender({
      ...defaultParams,
      amount: '200',
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetGasLimit).toHaveBeenCalledTimes(2);
    expect(mockGenerateTransferData).toHaveBeenCalledWith(
      'transfer',
      expect.objectContaining({
        amount: expect.any(String),
      }),
    );
  });
});
