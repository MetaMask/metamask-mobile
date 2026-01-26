import { renderHook, act } from '@testing-library/react-native';
import { useTokenSelection } from './useTokenSelection';
import {
  setSourceToken,
  setDestToken,
} from '../../../../core/redux/slices/bridge';
import { createMockToken } from '../testUtils/fixtures';
import { TokenSelectorType } from '../types';
import Routes from '../../../../constants/navigation/Routes';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

const mockIsStockToken = jest.fn();
const mockIsTokenTradingOpen = jest.fn();
jest.mock('./useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: mockIsStockToken,
    isTokenTradingOpen: mockIsTokenTradingOpen,
  }),
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
    // Default: non-stock token behavior
    mockIsStockToken.mockReturnValue(false);
    mockIsTokenTradingOpen.mockResolvedValue(true);
  });

  describe('source token selection', () => {
    beforeEach(() => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);
    });

    it('dispatches setSourceToken when selecting new source token', async () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );
      const newToken = createMockToken({
        address: '0xnewtoken',
        symbol: 'NEW',
      });

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('swaps tokens when selecting current dest token as source', async () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockDestToken);
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

    it('dispatches setDestToken when selecting new dest token', async () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );
      const newToken = createMockToken({
        address: '0xnewdest',
        symbol: 'NEWDST',
      });

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('swaps tokens when selecting current source token as dest', async () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockSourceToken);
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
    ])('handles %s', async (_, tokens, type) => {
      mockUseSelector
        .mockReturnValueOnce(tokens.source)
        .mockReturnValueOnce(tokens.dest);

      const { result } = renderHook(() => useTokenSelection(type));
      const newToken = createMockToken();

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      const expectedAction =
        type === TokenSelectorType.Source ? setSourceToken : setDestToken;
      expect(mockDispatch).toHaveBeenCalledWith(expectedAction(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not swap when addresses match but chainIds differ', async () => {
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

      await act(async () => {
        await result.current.handleTokenPress(sameAddressToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken(sameAddressToken),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('does not swap when chainIds match but addresses differ', async () => {
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

      await act(async () => {
        await result.current.handleTokenPress(sameChainToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(sameChainToken));
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('RWA token handling', () => {
    const mockStockToken = createMockToken({
      address: '0xstocktoken',
      symbol: 'AAPL',
      rwaData: {
        instrumentType: 'stock',
        market: {
          nextOpen: new Date().toISOString(),
          nextClose: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    });

    beforeEach(() => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);
    });

    it('proceeds with selection when stock token trading is open', async () => {
      mockIsStockToken.mockReturnValue(true);
      mockIsTokenTradingOpen.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockStockToken);
      });

      expect(mockIsStockToken).toHaveBeenCalledWith(mockStockToken);
      expect(mockIsTokenTradingOpen).toHaveBeenCalledWith(mockStockToken);
      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(mockStockToken));
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to market closed modal when stock token trading is closed', async () => {
      mockIsStockToken.mockReturnValue(true);
      mockIsTokenTradingOpen.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockStockToken);
      });

      expect(mockIsStockToken).toHaveBeenCalledWith(mockStockToken);
      expect(mockIsTokenTradingOpen).toHaveBeenCalledWith(mockStockToken);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
      );
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('skips trading check for non-stock tokens', async () => {
      mockIsStockToken.mockReturnValue(false);
      const regularToken = createMockToken({
        address: '0xregular',
        symbol: 'ETH',
      });

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(regularToken);
      });

      expect(mockIsStockToken).toHaveBeenCalledWith(regularToken);
      expect(mockIsTokenTradingOpen).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(regularToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('navigates to market closed modal for dest token when trading is closed', async () => {
      mockUseSelector.mockReset();
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken);
      mockIsStockToken.mockReturnValue(true);
      mockIsTokenTradingOpen.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockStockToken);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
      );
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('swaps tokens when selecting other token as stock token with open market', async () => {
      mockUseSelector.mockReset();
      const stockDestToken = createMockToken({
        address: '0xdest',
        symbol: 'DST',
        chainId: '0xa',
        rwaData: {
          instrumentType: 'stock',
          market: {
            nextOpen: new Date().toISOString(),
            nextClose: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      });
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(stockDestToken);
      mockIsStockToken.mockReturnValue(true);
      mockIsTokenTradingOpen.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(stockDestToken);
      });

      expect(mockIsStockToken).toHaveBeenCalledWith(stockDestToken);
      expect(mockIsTokenTradingOpen).toHaveBeenCalledWith(stockDestToken);
      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(stockDestToken));
      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(mockSourceToken));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
