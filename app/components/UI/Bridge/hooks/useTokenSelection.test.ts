import { renderHook, act } from '@testing-library/react-native';
import { useTokenSelection } from './useTokenSelection';
import {
  setSourceToken,
  setDestToken,
} from '../../../../core/redux/slices/bridge';
import { createMockToken } from '../testUtils/fixtures';
import { TokenSelectorType } from '../types';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

import { useSelector } from 'react-redux';
const mockUseSelector = useSelector as jest.Mock;

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
      if (selector.toString().includes('sourceToken')) return mockSourceToken;
      if (selector.toString().includes('destToken')) return mockDestToken;
      return undefined;
    });
  });

  describe('source token selection', () => {
    beforeEach(() => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);
    });

    it('dispatches setSourceToken when selecting new source token', () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );
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
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      act(() => {
        result.current.handleTokenPress(mockDestToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(mockDestToken));
      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(mockSourceToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns source token as selectedToken', () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      expect(result.current.selectedToken).toBe(mockSourceToken);
    });
  });

  describe('dest token selection', () => {
    beforeEach(() => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);
    });

    it('dispatches setDestToken when selecting new dest token', () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );
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
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      act(() => {
        result.current.handleTokenPress(mockSourceToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(mockDestToken));
      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(mockSourceToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns dest token as selectedToken', () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      expect(result.current.selectedToken).toBe(mockDestToken);
    });
  });

  describe('edge cases', () => {
    it.each([
      [
        'null source token',
        { source: null, dest: mockDestToken },
        TokenSelectorType.Source,
      ],
      [
        'null dest token',
        { source: mockSourceToken, dest: null },
        TokenSelectorType.Dest,
      ],
      [
        'both tokens null',
        { source: null, dest: null },
        TokenSelectorType.Source,
      ],
    ])('handles %s', (_, tokens, type) => {
      mockUseSelector
        .mockReturnValueOnce(tokens.source)
        .mockReturnValueOnce(tokens.dest);

      const { result } = renderHook(() => useTokenSelection(type));
      const newToken = createMockToken();

      act(() => {
        result.current.handleTokenPress(newToken);
      });

      const expectedAction =
        type === TokenSelectorType.Source ? setSourceToken : setDestToken;
      expect(mockDispatch).toHaveBeenCalledWith(expectedAction(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not swap when addresses match but chainIds differ', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );
      const sameAddressToken = createMockToken({
        address: mockDestToken.address,
        chainId: '0x5',
      });

      act(() => {
        result.current.handleTokenPress(sameAddressToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken(sameAddressToken),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('does not swap when chainIds match but addresses differ', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );
      const sameChainToken = createMockToken({
        address: '0xdifferent',
        chainId: mockDestToken.chainId,
      });

      act(() => {
        result.current.handleTokenPress(sameChainToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(sameChainToken));
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });
});
