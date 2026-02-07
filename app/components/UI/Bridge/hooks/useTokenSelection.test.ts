import { renderHook, act } from '@testing-library/react-native';
import { useTokenSelection } from './useTokenSelection';
import {
  setSourceToken,
  setDestToken,
  setIsDestTokenManuallySet,
} from '../../../../core/redux/slices/bridge';
import { createMockToken } from '../testUtils/fixtures';
import { TokenSelectorType } from '../types';
import Routes from '../../../../constants/navigation/Routes';

const mockDispatch = jest.fn();
const mockHandleSwitchTokensInner = jest.fn().mockResolvedValue(undefined);
const mockHandleSwitchTokens = jest.fn(() => mockHandleSwitchTokensInner);

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

jest.mock('./useSwitchTokens', () => ({
  useSwitchTokens: () => ({ handleSwitchTokens: mockHandleSwitchTokens }),
}));

jest.mock('./useIsNetworkEnabled', () => ({
  useIsNetworkEnabled: jest.fn(() => true),
}));

const mockAutoUpdateDestToken = jest.fn();
jest.mock('./useAutoUpdateDestToken', () => ({
  useAutoUpdateDestToken: () => ({
    autoUpdateDestToken: mockAutoUpdateDestToken,
  }),
}));

import { useSelector } from 'react-redux';
import { useIsNetworkEnabled } from './useIsNetworkEnabled';
const mockUseSelector = useSelector as jest.Mock;
const mockUseIsNetworkEnabled = useIsNetworkEnabled as jest.Mock;

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
  const mockDestAmount = '100';

  beforeEach(() => {
    jest.clearAllMocks();
    // Non-stock token behavior
    mockIsStockToken.mockReturnValue(false);
    mockIsTokenTradingOpen.mockReturnValue(true);
    mockUseIsNetworkEnabled.mockReturnValue(true);
  });

  describe('source token selection', () => {
    beforeEach(() => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken) // selectSourceToken
        .mockReturnValueOnce(mockDestToken) // selectDestToken
        .mockReturnValueOnce(mockDestAmount); // selectDestAmount
    });

    it('dispatches setSourceToken and calls autoUpdateDestToken when selecting new source token', async () => {
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
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(newToken);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls handleSwitchTokens when selecting current dest token as source', async () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockDestToken);
      });

      expect(mockHandleSwitchTokens).toHaveBeenCalledWith(mockDestAmount);
      expect(mockHandleSwitchTokensInner).toHaveBeenCalled();
      expect(mockAutoUpdateDestToken).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns source token as selectedToken', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      expect(result.current.selectedToken).toBe(mockSourceToken);
    });

    it('does not swap when dest network is disabled', async () => {
      mockUseIsNetworkEnabled.mockReturnValue(false);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockDestToken);
      });

      expect(mockHandleSwitchTokens).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('dest token selection', () => {
    beforeEach(() => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);
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
      expect(mockDispatch).toHaveBeenCalledWith(
        setIsDestTokenManuallySet(true),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls handleSwitchTokens when selecting current source token as dest', async () => {
      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockSourceToken);
      });

      expect(mockHandleSwitchTokens).toHaveBeenCalledWith(mockDestAmount);
      expect(mockHandleSwitchTokensInner).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns dest token as selectedToken', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      expect(result.current.selectedToken).toBe(mockDestToken);
    });
  });

  describe('edge cases', () => {
    it('handles null source token', async () => {
      mockUseSelector
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );
      const newToken = createMockToken();

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(newToken);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles null dest token', async () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockDestAmount);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );
      const newToken = createMockToken();

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not swap when addresses match but chainIds differ', async () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);

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
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(sameAddressToken);
      expect(mockHandleSwitchTokens).not.toHaveBeenCalled();
    });

    it('does not swap when chainIds match but addresses differ', async () => {
      mockUseSelector
        .mockReturnValueOnce(mockSourceToken)
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);

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
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(sameChainToken);
      expect(mockHandleSwitchTokens).not.toHaveBeenCalled();
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
        .mockReturnValueOnce(mockDestToken)
        .mockReturnValueOnce(mockDestAmount);
    });
    afterEach(() => {
      mockUseSelector.mockReset();
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
      mockIsTokenTradingOpen.mockReturnValue(false);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Source),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockStockToken);
      });

      expect(mockIsStockToken).toHaveBeenCalledWith(mockStockToken);
      expect(mockIsTokenTradingOpen).toHaveBeenCalledWith(mockStockToken);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
      });
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
      mockIsStockToken.mockReturnValue(true);
      mockIsTokenTradingOpen.mockReturnValue(false);

      const { result } = renderHook(() =>
        useTokenSelection(TokenSelectorType.Dest),
      );

      await act(async () => {
        await result.current.handleTokenPress(mockStockToken);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('swaps tokens when selecting other token as stock token with open market', async () => {
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
        .mockReturnValueOnce(stockDestToken)
        .mockReturnValueOnce(mockDestAmount);
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
      expect(mockHandleSwitchTokens).toHaveBeenCalledWith(mockDestAmount);
      expect(mockHandleSwitchTokensInner).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
