import { renderHook, waitFor } from '@testing-library/react-native';
import type BN4 from 'bnjs4';

import Engine from '../../core/Engine';
import useTokenBalance from './useTokenBalance';

const MOCK_TOKEN_ADDRESS = '0x1234567890123456789012345678901234567890';
const MOCK_USER_ADDRESS = '0x0987654321098765432109876543210987654321';

jest.mock('../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20BalanceOf: jest.fn(),
    },
  },
}));

describe('useTokenBalance', () => {
  const mockEngine = jest.mocked(Engine);
  const mockGetERC20BalanceOf = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.context.AssetsContractController.getERC20BalanceOf =
      mockGetERC20BalanceOf;
  });

  const arrange = (
    tokenAddress: string = MOCK_TOKEN_ADDRESS,
    userAddress: string = MOCK_USER_ADDRESS,
  ) =>
    renderHook(
      ({ token, user }: { token: string; user: string }) =>
        useTokenBalance(token, user),
      { initialProps: { token: tokenAddress, user: userAddress } },
    );

  it('returns the fetched balance and stops loading', async () => {
    const expectedBalance = { toString: () => '100' } as BN4;
    mockGetERC20BalanceOf.mockResolvedValue(expectedBalance);

    const { result } = arrange();

    expect(result.current).toStrictEqual([null, true, false]);

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });
    expect(result.current).toStrictEqual([expectedBalance, false, false]);
    expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
      MOCK_TOKEN_ADDRESS,
      MOCK_USER_ADDRESS,
    );
  });

  it('flags an error and stops loading when the request rejects', async () => {
    mockGetERC20BalanceOf.mockRejectedValue(new Error('Network error'));

    const { result } = arrange();

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });
    expect(result.current).toStrictEqual([null, false, true]);
  });

  it('re-fetches when the requested token address changes', async () => {
    const firstBalance = { toString: () => '1' } as BN4;
    const secondBalance = { toString: () => '2' } as BN4;
    mockGetERC20BalanceOf
      .mockResolvedValueOnce(firstBalance)
      .mockResolvedValueOnce(secondBalance);
    const nextTokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    const { result, rerender } = arrange();

    await waitFor(() => {
      expect(result.current[0]).toBe(firstBalance);
    });

    rerender({ token: nextTokenAddress, user: MOCK_USER_ADDRESS });

    await waitFor(() => {
      expect(result.current[0]).toBe(secondBalance);
    });
    expect(mockGetERC20BalanceOf).toHaveBeenCalledTimes(2);
    expect(mockGetERC20BalanceOf).toHaveBeenLastCalledWith(
      nextTokenAddress,
      MOCK_USER_ADDRESS,
    );
  });

  it('does not re-fetch when re-rendered with the same addresses', async () => {
    const balance = { toString: () => '1' } as BN4;
    mockGetERC20BalanceOf.mockResolvedValue(balance);

    const { result, rerender } = arrange();

    await waitFor(() => {
      expect(result.current[0]).toBe(balance);
    });

    rerender({ token: MOCK_TOKEN_ADDRESS, user: MOCK_USER_ADDRESS });
    rerender({ token: MOCK_TOKEN_ADDRESS, user: MOCK_USER_ADDRESS });

    expect(mockGetERC20BalanceOf).toHaveBeenCalledTimes(1);
  });
});
