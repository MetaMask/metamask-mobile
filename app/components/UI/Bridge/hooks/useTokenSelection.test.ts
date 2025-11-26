import { renderHook, act } from '@testing-library/react-native';
import { useTokenSelection } from './useTokenSelection';
import { BridgeToken } from '../types';
import {
  setSourceToken,
  setDestToken,
} from '../../../../core/redux/slices/bridge';

// Mock react-redux
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// Import useSelector after mocking
import { useSelector } from 'react-redux';
const mockUseSelector = useSelector as jest.Mock;

const createMockToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  name: 'Test Token',
  ...overrides,
});

describe('useTokenSelection', () => {
  const mockSourceToken = createMockToken({
    address: '0xsource',
    symbol: 'SRC',
  });

  const mockDestToken = createMockToken({
    address: '0xdest',
    symbol: 'DST',
    chainId: '0xa',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      // Mock selectSourceToken
      if (selector.toString().includes('sourceToken')) {
        return mockSourceToken;
      }
      // Mock selectDestToken
      if (selector.toString().includes('destToken')) {
        return mockDestToken;
      }
      return undefined;
    });
  });

  describe('source token selection', () => {
    it('dispatches setSourceToken when selecting new source token', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('source'));
      const newToken = createMockToken({
        address: '0xnewtoken',
        symbol: 'NEW',
      });

      act(() => {
        result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('swaps tokens when selecting current dest token as source', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('source'));

      act(() => {
        result.current.handleTokenPress(mockDestToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(mockDestToken));
      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(mockSourceToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns source token as selectedToken for source type', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('source'));

      expect(result.current.selectedToken).toBe(mockSourceToken);
    });
  });

  describe('dest token selection', () => {
    it('dispatches setDestToken when selecting new dest token', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('dest'));
      const newToken = createMockToken({
        address: '0xnewdest',
        symbol: 'NEWDST',
      });

      act(() => {
        result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('swaps tokens when selecting current source token as dest', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('dest'));

      act(() => {
        result.current.handleTokenPress(mockSourceToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(mockDestToken));
      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(mockSourceToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns dest token as selectedToken for dest type', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('dest'));

      expect(result.current.selectedToken).toBe(mockDestToken);
    });
  });

  describe('edge cases', () => {
    it('handles null source token', () => {
      mockUseSelector
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('source'));
      const newToken = createMockToken();

      act(() => {
        result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles null dest token', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(null);

      const { result } = renderHook(() => useTokenSelection('dest'));
      const newToken = createMockToken();

      act(() => {
        result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles both tokens null', () => {
      mockUseSelector.mockReturnValueOnce(null).mockReturnValueOnce(null);

      const { result } = renderHook(() => useTokenSelection('source'));
      const newToken = createMockToken();

      act(() => {
        result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not swap tokens when addresses match but chainIds differ', () => {
      const sameAddressToken = createMockToken({
        address: mockDestToken.address,
        chainId: '0x5', // Different chainId
      });

      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('source'));

      act(() => {
        result.current.handleTokenPress(sameAddressToken);
      });

      // Should set as new source, not swap
      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken(sameAddressToken),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('does not swap tokens when chainIds match but addresses differ', () => {
      const sameChainToken = createMockToken({
        address: '0xdifferent',
        chainId: mockDestToken.chainId,
      });

      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() => useTokenSelection('source'));

      act(() => {
        result.current.handleTokenPress(sameChainToken);
      });

      // Should set as new source, not swap
      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(sameChainToken));
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });
});
