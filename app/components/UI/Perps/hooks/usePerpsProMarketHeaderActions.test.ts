import { renderHook, act } from '@testing-library/react-native';
import {
  PerpsMode,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsProMarketHeaderActions } from './usePerpsProMarketHeaderActions';

const mockNavigateBack = jest.fn();
const mockNavigateToWallet = jest.fn();
const mockNavigateToMarketList = jest.fn();
const mockNavigateToMarketListFromHeader = jest.fn();
let mockCanGoBack = true;

jest.mock('./usePerpsNavigation', () => ({
  usePerpsNavigation: jest.fn(() => ({
    navigateBack: mockNavigateBack,
    navigateToWallet: mockNavigateToWallet,
    navigateToMarketList: mockNavigateToMarketList,
    navigateToMarketListFromHeader: mockNavigateToMarketListFromHeader,
    get canGoBack() {
      return mockCanGoBack;
    },
  })),
}));

const mockSetPerpsMode = jest.fn();
const mockPerpsModeValue = PerpsMode.Pro;
jest.mock('./usePerpsMode', () => ({
  usePerpsMode: jest.fn(() => ({
    mode: mockPerpsModeValue,
    setMode: mockSetPerpsMode,
  })),
}));

const mockTrack = jest.fn();
jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({ track: mockTrack })),
}));

const mockAddToWatchlist = jest.fn();
const mockRemoveFromWatchlist = jest.fn();
jest.mock('./usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: jest.fn(() => ({
    addToWatchlist: mockAddToWatchlist,
    removeFromWatchlist: mockRemoveFromWatchlist,
  })),
}));

const mockDropPerpsHomeFromStackHistory = jest.fn();
jest.mock('../utils/perpsModeSwitch', () => ({
  useDropPerpsHomeFromStackHistory: () => mockDropPerpsHomeFromStackHistory,
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockOpenPerpsModeSelectionIfNeeded = jest.fn(() =>
  Promise.resolve(false),
);
jest.mock('../utils/openPerpsModeSelection', () => ({
  openPerpsModeSelectionIfNeeded: (...args: unknown[]) =>
    mockOpenPerpsModeSelectionIfNeeded(...(args as [])),
}));

let mockIsWatchlist = false;
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => mockIsWatchlist),
}));

describe('usePerpsProMarketHeaderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
    mockIsWatchlist = false;
    mockOpenPerpsModeSelectionIfNeeded.mockResolvedValue(false);
  });

  it('navigates back when the stack can go back', () => {
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    act(() => {
      result.current.handleBackPress();
    });

    expect(mockNavigateBack).toHaveBeenCalledTimes(1);
    expect(mockNavigateToWallet).not.toHaveBeenCalled();
  });

  it('falls back to leaving Perps when the stack cannot go back', () => {
    mockCanGoBack = false;
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    act(() => {
      result.current.handleBackPress();
    });

    expect(mockNavigateToWallet).toHaveBeenCalledTimes(1);
    expect(mockNavigateBack).not.toHaveBeenCalled();
  });

  it('opens the market list and tracks the identity press', () => {
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    act(() => {
      result.current.handleMarketListPress();
    });

    expect(mockNavigateToMarketListFromHeader).toHaveBeenCalledWith({
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    });
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.MARKET_LIST,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
      }),
    );
  });

  it('no-ops market list press when symbol is missing', () => {
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: undefined }),
    );

    act(() => {
      result.current.handleMarketListPress();
    });

    expect(mockNavigateToMarketListFromHeader).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('adds the market to the watchlist when it is not favorited', () => {
    mockIsWatchlist = false;
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    act(() => {
      result.current.handleFavoritePress();
    });

    expect(mockAddToWatchlist).toHaveBeenCalledWith('BTC');
    expect(mockRemoveFromWatchlist).not.toHaveBeenCalled();
  });

  it('removes the market from the watchlist when it is favorited', () => {
    mockIsWatchlist = true;
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'ETH' }),
    );

    act(() => {
      result.current.handleFavoritePress();
    });

    expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('ETH');
    expect(mockAddToWatchlist).not.toHaveBeenCalled();
  });

  it('no-ops favorite press when symbol is missing', () => {
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: undefined }),
    );

    act(() => {
      result.current.handleFavoritePress();
    });

    expect(mockAddToWatchlist).not.toHaveBeenCalled();
    expect(mockRemoveFromWatchlist).not.toHaveBeenCalled();
  });

  it('switches mode directly when the chooser is already completed', async () => {
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    await act(async () => {
      result.current.handlePerpsModeChange(PerpsMode.Lite);
    });

    expect(mockSetPerpsMode).toHaveBeenCalledWith(PerpsMode.Lite);
    expect(mockDropPerpsHomeFromStackHistory).not.toHaveBeenCalled();
  });

  it('drops Perps Home from history when switching to Pro', async () => {
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    await act(async () => {
      result.current.handlePerpsModeChange(PerpsMode.Pro);
    });

    expect(mockSetPerpsMode).toHaveBeenCalledWith(PerpsMode.Pro);
    expect(mockDropPerpsHomeFromStackHistory).toHaveBeenCalledTimes(1);
  });

  it('opens the mode chooser instead of switching when it has not been completed', async () => {
    mockOpenPerpsModeSelectionIfNeeded.mockResolvedValue(true);
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    await act(async () => {
      result.current.handlePerpsModeChange(PerpsMode.Lite);
    });

    expect(mockOpenPerpsModeSelectionIfNeeded).toHaveBeenCalledWith(
      expect.anything(),
      {
        entry: 'market',
        source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      },
    );
    expect(mockSetPerpsMode).not.toHaveBeenCalled();
    expect(mockDropPerpsHomeFromStackHistory).not.toHaveBeenCalled();
  });

  it('exposes the current mode and watchlist state', () => {
    mockIsWatchlist = true;
    const { result } = renderHook(() =>
      usePerpsProMarketHeaderActions({ symbol: 'BTC' }),
    );

    expect(result.current.perpsMode).toBe(PerpsMode.Pro);
    expect(result.current.isWatchlist).toBe(true);
  });
});
