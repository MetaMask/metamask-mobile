import { renderHook, waitFor } from '@testing-library/react-native';
import BN4 from 'bnjs4';

import useTokenBalance from './useTokenBalance';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20BalanceOf: jest.fn(),
    },
  },
}));

const getERC20BalanceOf = Engine.context.AssetsContractController
  .getERC20BalanceOf as jest.Mock;

const TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000002';
const USER_ADDRESS = '0x000000000000000000000000000000000000000a';
const OTHER_USER_ADDRESS = '0x000000000000000000000000000000000000000b';

describe('useTokenBalance', () => {
  beforeEach(() => {
    getERC20BalanceOf.mockReset();
  });

  it('returns the fetched balance and clears loading', async () => {
    const balance = new BN4('100');
    getERC20BalanceOf.mockResolvedValue(balance);

    const { result } = renderHook(() =>
      useTokenBalance(TOKEN_ADDRESS, USER_ADDRESS),
    );

    await waitFor(() => {
      expect(result.current[0]).toBe(balance);
    });
    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBe(false);
    expect(getERC20BalanceOf).toHaveBeenCalledTimes(1);
    expect(getERC20BalanceOf).toHaveBeenCalledWith(TOKEN_ADDRESS, USER_ADDRESS);
  });

  it('sets error when the balance request fails', async () => {
    getERC20BalanceOf.mockRejectedValue(new Error('rpc'));

    const { result } = renderHook(() =>
      useTokenBalance(TOKEN_ADDRESS, USER_ADDRESS),
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(true);
    });
    expect(result.current[0]).toBeNull();
    expect(result.current[1]).toBe(false);
    expect(getERC20BalanceOf).toHaveBeenCalledTimes(1);
  });

  it('fetches again when the token address changes', async () => {
    const firstBalance = new BN4('1');
    const secondBalance = new BN4('2');
    getERC20BalanceOf
      .mockResolvedValueOnce(firstBalance)
      .mockResolvedValueOnce(secondBalance);

    const { result, rerender } = renderHook(
      ({ tokenAddress, userAddress }) =>
        useTokenBalance(tokenAddress, userAddress),
      {
        initialProps: {
          tokenAddress: TOKEN_ADDRESS,
          userAddress: USER_ADDRESS,
        },
      },
    );

    await waitFor(() => {
      expect(result.current[0]).toBe(firstBalance);
    });

    rerender({
      tokenAddress: OTHER_TOKEN_ADDRESS,
      userAddress: USER_ADDRESS,
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(secondBalance);
    });
    expect(getERC20BalanceOf).toHaveBeenCalledTimes(2);
    expect(getERC20BalanceOf).toHaveBeenLastCalledWith(
      OTHER_TOKEN_ADDRESS,
      USER_ADDRESS,
    );
  });

  it('fetches again when the account address changes', async () => {
    const firstBalance = new BN4('3');
    const secondBalance = new BN4('4');
    getERC20BalanceOf
      .mockResolvedValueOnce(firstBalance)
      .mockResolvedValueOnce(secondBalance);

    const { result, rerender } = renderHook(
      ({ tokenAddress, userAddress }) =>
        useTokenBalance(tokenAddress, userAddress),
      {
        initialProps: {
          tokenAddress: TOKEN_ADDRESS,
          userAddress: USER_ADDRESS,
        },
      },
    );

    await waitFor(() => {
      expect(result.current[0]).toBe(firstBalance);
    });

    rerender({
      tokenAddress: TOKEN_ADDRESS,
      userAddress: OTHER_USER_ADDRESS,
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(secondBalance);
    });
    expect(getERC20BalanceOf).toHaveBeenCalledTimes(2);
    expect(getERC20BalanceOf).toHaveBeenLastCalledWith(
      TOKEN_ADDRESS,
      OTHER_USER_ADDRESS,
    );
  });

  it('does not fetch again when re-rendered with the same addresses', async () => {
    const balance = new BN4('100');
    getERC20BalanceOf.mockResolvedValue(balance);

    const { result, rerender } = renderHook(
      ({ tokenAddress, userAddress }) =>
        useTokenBalance(tokenAddress, userAddress),
      {
        initialProps: {
          tokenAddress: TOKEN_ADDRESS,
          userAddress: USER_ADDRESS,
        },
      },
    );

    await waitFor(() => {
      expect(result.current[0]).toBe(balance);
    });

    rerender({
      tokenAddress: TOKEN_ADDRESS,
      userAddress: USER_ADDRESS,
    });

    expect(result.current[0]).toBe(balance);
    expect(getERC20BalanceOf).toHaveBeenCalledTimes(1);
  });
});
