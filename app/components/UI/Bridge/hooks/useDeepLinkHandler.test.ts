import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { BridgeViewMode, BridgeToken } from '../types';
import { BridgeRouteParams } from '../Views/BridgeView';
import { RouteProp } from '@react-navigation/native';

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

// Mock useSwitchNetworks hook
jest.mock('../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: jest.fn(),
}));

// Mock network selectors
jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectEvmChainId: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

// Mock bridge slice actions and selectors
jest.mock('../../../../core/redux/slices/bridge', () => ({
  setSourceToken: jest.fn((token) => ({
    type: 'bridge/setSourceToken',
    payload: token,
  })),
  setDestToken: jest.fn((token) => ({
    type: 'bridge/setDestToken',
    payload: token,
  })),
  setSourceAmount: jest.fn((amount) => ({
    type: 'bridge/setSourceAmount',
    payload: amount,
  })),
  setBridgeViewMode: jest.fn((mode) => ({
    type: 'bridge/setBridgeViewMode',
    payload: mode,
  })),
  selectIsUnifiedSwapsEnabled: jest.fn(),
  selectSourceToken: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Import the mocked modules
import { useSwitchNetworks } from '../../../Views/NetworkSelector/useSwitchNetworks';
import {
  selectChainId,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import {
  setSourceToken,
  setDestToken,
  setSourceAmount,
  setBridgeViewMode,
  selectIsUnifiedSwapsEnabled,
  selectSourceToken,
} from '../../../../core/redux/slices/bridge';
import { useDeepLinkHandler } from './useDeepLinkHandler';

const mockUseSwitchNetworks = useSwitchNetworks as jest.MockedFunction<
  typeof useSwitchNetworks
>;

describe('useDeepLinkHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Mock useSelector for different selectors
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSourceToken) {
        return null;
      }
      if (selector === selectIsUnifiedSwapsEnabled) {
        return true;
      }
      if (selector === selectChainId) {
        return '0x1';
      }
      if (selector === selectEvmChainId) {
        return '0x1';
      }
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {};
      }
      return null;
    });

    // Mock useSwitchNetworks
    mockUseSwitchNetworks.mockReturnValue({
      onSetRpcTarget: jest.fn(),
      onNetworkChange: jest.fn(),
      onNonEvmNetworkChange: jest.fn(),
    });
  });

  const createMockRoute = (params?: Partial<BridgeRouteParams>) =>
    ({
      params: params || {},
    } as RouteProp<{ params: BridgeRouteParams }, 'params'>);

  const mockSourceToken: BridgeToken = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    image: '',
    chainId: '0x1',
  };

  const mockDestToken: BridgeToken = {
    address: '0x0987654321098765432109876543210987654321',
    symbol: 'DEST',
    name: 'Destination Token',
    decimals: 18,
    image: '',
    chainId: '0x137',
  };

  it('does not dispatch actions when not a deep link', () => {
    const route = createMockRoute();

    const { result } = renderHook(() => useDeepLinkHandler({ route }));

    expect(result.current.isDeepLink).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches setSourceToken when deep link has sourceToken', () => {
    const route = createMockRoute({
      sourcePage: 'deeplink',
      sourceToken: mockSourceToken,
    });

    renderHook(() => useDeepLinkHandler({ route }));

    expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(mockSourceToken));
  });

  it('dispatches setDestToken when deep link has destToken', () => {
    const route = createMockRoute({
      sourcePage: 'deeplink',
      destToken: mockDestToken,
    });

    renderHook(() => useDeepLinkHandler({ route }));

    expect(mockDispatch).toHaveBeenCalledWith(setDestToken(mockDestToken));
  });

  it('dispatches setSourceAmount when deep link has sourceAmount', () => {
    const route = createMockRoute({
      sourcePage: 'deeplink',
      sourceAmount: '1.5',
    });

    renderHook(() => useDeepLinkHandler({ route }));

    expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount('1.5'));
  });

  it('dispatches setBridgeViewMode to Unified when unified swaps enabled', () => {
    const route = createMockRoute({
      sourcePage: 'deeplink',
    });

    renderHook(() => useDeepLinkHandler({ route }));

    expect(mockDispatch).toHaveBeenCalledWith(
      setBridgeViewMode(BridgeViewMode.Unified),
    );
  });

  it('does not dispatch setBridgeViewMode when unified swaps disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSourceToken) {
        return null;
      }
      if (selector === selectIsUnifiedSwapsEnabled) {
        return false;
      }
      if (selector === selectChainId) {
        return '0x1';
      }
      if (selector === selectEvmChainId) {
        return '0x1';
      }
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {};
      }
      return null;
    });

    const route = createMockRoute({
      sourcePage: 'deeplink',
    });

    renderHook(() => useDeepLinkHandler({ route }));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setBridgeViewMode(BridgeViewMode.Unified),
    );
  });

  it('does not update source token when token already has same address', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSourceToken) {
        return mockSourceToken;
      }
      if (selector === selectIsUnifiedSwapsEnabled) {
        return true;
      }
      if (selector === selectChainId) {
        return '0x1';
      }
      if (selector === selectEvmChainId) {
        return '0x1';
      }
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {};
      }
      return null;
    });

    const route = createMockRoute({
      sourcePage: 'deeplink',
      sourceToken: mockSourceToken,
    });

    renderHook(() => useDeepLinkHandler({ route }));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setSourceToken(mockSourceToken),
    );
  });

  it('returns true for isDeepLink when deep link detected', () => {
    const route = createMockRoute({
      sourcePage: 'deeplink',
    });

    const { result } = renderHook(() => useDeepLinkHandler({ route }));

    expect(result.current.isDeepLink).toBe(true);
  });

  it('returns false for isDeepLink when not a deep link', () => {
    const route = createMockRoute();

    const { result } = renderHook(() => useDeepLinkHandler({ route }));

    expect(result.current.isDeepLink).toBe(false);
  });

  it('handles undefined route gracefully', () => {
    const route = createMockRoute(undefined);

    const { result } = renderHook(() => useDeepLinkHandler({ route }));

    expect(result.current.isDeepLink).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
