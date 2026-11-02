import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useFilledLimitOrders } from './useFilledLimitOrders';
import { useLimitOrders } from '../../../UI/Bridge/hooks/useLimitOrders';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { LimitOrderState } from '../../../UI/Bridge/api/limitOrders/getLimitOrders/types';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../../../UI/Bridge/hooks/useLimitOrders', () => ({
  useLimitOrders: jest.fn(),
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseLimitOrders = jest.mocked(useLimitOrders);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('useFilledLimitOrders', () => {
  const limitOrdersResult = { orders: [] } as unknown as ReturnType<
    typeof useLimitOrders
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockUseLimitOrders.mockReturnValue(limitOrdersResult);
  });

  const lastParams = () => mockUseLimitOrders.mock.calls.at(-1)?.[0];

  it('queries filled orders for the wallet and chain while the filter is active', () => {
    const { result } = renderHook(() =>
      useFilledLimitOrders({
        walletAddress: WALLET_ADDRESS,
        chainId: 'eip155:1',
        enabled: true,
      }),
    );

    expect(lastParams()).toEqual({
      walletAddress: WALLET_ADDRESS,
      states: [LimitOrderState.Filled],
      chainId: 'eip155:1',
      enabled: true,
    });
    expect(result.current).toBe(limitOrdersResult);
  });

  it('keeps the states array stable across renders', () => {
    const { rerender } = renderHook(() =>
      useFilledLimitOrders({ walletAddress: WALLET_ADDRESS, enabled: true }),
    );
    const firstStates = lastParams()?.states;

    rerender({});

    expect(lastParams()?.states).toBe(firstStates);
  });

  it('does not fetch while the filter is inactive', () => {
    renderHook(() =>
      useFilledLimitOrders({ walletAddress: WALLET_ADDRESS, enabled: false }),
    );

    expect(lastParams()?.enabled).toBe(false);
  });

  it('does not fetch when limit orders are disabled', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() =>
      useFilledLimitOrders({ walletAddress: WALLET_ADDRESS, enabled: true }),
    );

    expect(lastParams()?.enabled).toBe(false);
  });

  it('does not fetch while offline', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    renderHook(() =>
      useFilledLimitOrders({ walletAddress: WALLET_ADDRESS, enabled: true }),
    );

    expect(lastParams()?.enabled).toBe(false);
  });

  it('fetches when the network tier is unknown', () => {
    mockUseNetworkTier.mockReturnValue(null);

    renderHook(() =>
      useFilledLimitOrders({ walletAddress: WALLET_ADDRESS, enabled: true }),
    );

    expect(lastParams()?.enabled).toBe(true);
  });

  it('passes no wallet address when the account group has no EVM account', () => {
    renderHook(() =>
      useFilledLimitOrders({ walletAddress: '', enabled: true }),
    );

    expect(lastParams()?.walletAddress).toBeUndefined();
  });
});
