import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { useLatestBalance } from './useLatestBalance';
import { getProviderByChainId } from '../../../util/notifications/methods/common';
import { BigNumber, constants } from 'ethers';
import { backgroundState } from '../../../util/test/initial-root-state';
import { waitFor } from '@testing-library/react-native';

// Mock dependencies
jest.mock('../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

// Mock ethers contract
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    Contract: jest.fn().mockImplementation(() => ({
      balanceOf: jest.fn().mockResolvedValue(actual.BigNumber.from('1000000')),
    })),
  };
});

describe('useLatestBalance', () => {
  const mockProvider = {
    getBalance: jest.fn().mockResolvedValue(BigNumber.from('1000000000000000000')),
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
  };

  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        NetworkController: {
          ...backgroundState.NetworkController,
          provider: {
            chainId: '0x1',
          },
        },
        AccountTrackerController: {
          ...backgroundState.AccountTrackerController,
          accounts: {
            '0x1234567890123456789012345678901234567890': {
              balance: '0x0',
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProviderByChainId as jest.Mock).mockReturnValue(mockProvider);
  });

  it('should fetch native token balance when token address is zero address', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
          },
          '0x1',
        ),
      { state: initialState },
    );

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('should fetch ERC20 token balance', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: '0x1234567890123456789012345678901234567890',
            decimals: 6,
          },
          '0x1',
        ),
      { state: initialState },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000'),
      });
    });
  });

  it('should not fetch balance when chainId is CAIP format', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
          },
          'eip155:1',
        ),
      { state: initialState },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('should not fetch balance when chainId does not match current chain', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
          },
          '0x2',
        ),
      { state: initialState },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('should not fetch balance when token address is missing', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            decimals: 18,
          },
          '0x1',
        ),
      { state: initialState },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });
});
