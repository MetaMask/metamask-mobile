import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useLatestBalance } from './useLatestBalance';
import { Provider } from 'react-redux';
import { getProviderByChainId } from '../../../util/notifications/methods/common';
import { BigNumber, constants } from 'ethers';
import configureStore from 'redux-mock-store';

// Mock dependencies
jest.mock('../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: () => '0x1234567890123456789012345678901234567890',
}));

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: () => '0x1',
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

  const mockStore = configureStore();
  const createTestStore = (initialState = {}) => mockStore({
    engine: {
      backgroundState: {
        NetworkController: {
          provider: {
            chainId: '0x1',
          },
        },
        AccountTrackerController: {
          accounts: {
            '0x1234567890123456789012345678901234567890': {
              balance: '0x0',
            },
          },
        },
        ...initialState,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const store = createTestStore();
    return <Provider store={store}>{children}</Provider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProviderByChainId as jest.Mock).mockReturnValue(mockProvider);
  });

  it('should fetch native token balance when token address is zero address', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
          },
          '0x1',
        ),
      { wrapper },
    );

    await waitForNextUpdate();

    expect(mockProvider.getBalance).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
    expect(result.current).toEqual({
      displayBalance: '1.0',
      atomicBalance: BigNumber.from('1000000000000000000'),
    });
  });

  it('should fetch ERC20 token balance', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useLatestBalance(
          {
            address: '0x1234567890123456789012345678901234567890',
            decimals: 6,
          },
          '0x1',
        ),
      { wrapper },
    );

    await waitForNextUpdate();

    expect(result.current).toEqual({
      displayBalance: '1.0',
      atomicBalance: BigNumber.from('1000000'),
    });
  });

  it('should not fetch balance when chainId is CAIP format', async () => {
    const { result } = renderHook(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
          },
          'eip155:1',
        ),
      { wrapper },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('should not fetch balance when chainId does not match current chain', async () => {
    const { result } = renderHook(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
          },
          '0x2',
        ),
      { wrapper },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('should not fetch balance when token address is missing', async () => {
    const { result } = renderHook(
      () =>
        useLatestBalance(
          {
            decimals: 18,
          },
          '0x1',
        ),
      { wrapper },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });
});
