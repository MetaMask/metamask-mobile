import React from 'react';
import { Text } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { FeatureId } from '@metamask/bridge-controller';

import {
  selectBridgeBalanceRefreshKey,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import { useLatestBalance } from '../useLatestBalance';
import { BridgeSessionProvider } from './BridgeSessionContext';
import { useBridgeSession } from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(() => undefined),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;

const mockSourceToken = {
  address: '0x1234',
  decimals: 18,
  chainId: '0x1' as const,
  symbol: 'ETH',
  balance: '1.5',
};

const mockLatestBalance = {
  displayBalance: '1000',
  atomicBalance: { toString: () => '1000000000000000000' },
} as ReturnType<typeof useLatestBalance>;

const mockSourceTokenSelectors = () => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSourceToken) {
      return mockSourceToken;
    }
    if (selector === selectBridgeBalanceRefreshKey) {
      return 3;
    }
    return undefined;
  });
};

describe('useBridgeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when used outside BridgeSessionProvider', () => {
    expect(() => renderHook(() => useBridgeSession())).toThrow(
      'useBridgeSession must be used within BridgeSessionProvider',
    );
  });

  it('defaults to Market and updates selectedTab and renderedTab independently', () => {
    const { result } = renderHook(() => useBridgeSession(), {
      wrapper: ({ children }) => (
        <BridgeSessionProvider>{children}</BridgeSessionProvider>
      ),
    });

    expect(result.current.selectedTab).toBe(BridgeTabKey.Market);
    expect(result.current.renderedTab).toBe(BridgeTabKey.Market);

    act(() => {
      result.current.setSelectedTab(BridgeTabKey.Limit);
    });

    expect(result.current.selectedTab).toBe(BridgeTabKey.Limit);
    expect(result.current.renderedTab).toBe(BridgeTabKey.Market);

    act(() => {
      result.current.setRenderedTab(BridgeTabKey.Limit);
    });

    expect(result.current.renderedTab).toBe(BridgeTabKey.Limit);
  });

  it('renders children', () => {
    const { getByText } = render(
      <BridgeSessionProvider>
        <Text>hosted</Text>
      </BridgeSessionProvider>,
    );

    expect(getByText('hosted')).toBeOnTheScreen();
  });

  describe('useLatestBalance', () => {
    afterEach(() => {
      mockUseLatestBalance.mockReturnValue(undefined);
      mockUseSelector.mockReset();
    });

    it('calls useLatestBalance with source token fields and the rendered tab feature id', () => {
      mockSourceTokenSelectors();

      renderHook(() => useBridgeSession(), {
        wrapper: ({ children }) => (
          <BridgeSessionProvider>{children}</BridgeSessionProvider>
        ),
      });

      expect(mockUseLatestBalance).toHaveBeenCalledWith(
        {
          address: mockSourceToken.address,
          decimals: mockSourceToken.decimals,
          chainId: mockSourceToken.chainId,
          balance: mockSourceToken.balance,
          refreshKey: 3,
        },
        FeatureId.UNIFIED_SWAP_BRIDGE,
      );
    });

    it('exposes latestSourceBalance from useLatestBalance', () => {
      mockSourceTokenSelectors();
      mockUseLatestBalance.mockReturnValue(mockLatestBalance);

      const { result } = renderHook(() => useBridgeSession(), {
        wrapper: ({ children }) => (
          <BridgeSessionProvider>{children}</BridgeSessionProvider>
        ),
      });

      expect(result.current.latestSourceBalance).toBe(mockLatestBalance);
    });
  });
});
