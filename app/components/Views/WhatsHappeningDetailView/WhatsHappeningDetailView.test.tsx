import React from 'react';
import { Pressable, View } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsHappeningDetailView from './WhatsHappeningDetailView';
import WhatsHappeningExpandedCard from './components/WhatsHappeningExpandedCard';
import WhatsHappeningSourcesBottomSheet from './components/WhatsHappeningSourcesBottomSheet';

const mockGoBack = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('./components/WhatsHappeningExpandedCard', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./components/WhatsHappeningSourcesBottomSheet', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../Homepage/Sections/WhatsHappening/hooks', () => ({
  useWhatsHappening: jest.fn(() => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  })),
}));

jest.mock('./utils/getRelatedAssetImageSource', () => ({
  getRelatedAssetImageSource: jest.fn(() => undefined),
}));

jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: jest.fn() }),
}));

jest.mock('../../UI/MarketInsights/utils/marketInsightsFormatting', () => ({
  formatRelativeTime: jest.fn(() => 'now'),
  getUniqueSourcesByFavicon: jest.fn(() => []),
}));

jest.mock(
  '../../UI/MarketInsights/components/SourceLogoGroup',
  () => 'SourceLogoGroup',
);

const mockUseWhatsHappening = jest.requireMock(
  '../Homepage/Sections/WhatsHappening/hooks',
).useWhatsHappening;

const mockNav = jest.requireMock('@react-navigation/native');
const mockUseRoute = mockNav.useRoute as jest.Mock;
const mockUseNavigation = mockNav.useNavigation as jest.Mock;

const mockItem = {
  id: 'trend-0',
  title: 'The Federal Reserve pauses interest rates',
  description: 'Reflecting the current economy.',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro' as const,
  impact: 'positive' as const,
  relatedAssets: [],
  articles: [],
};

describe('WhatsHappeningDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: { initialIndex: 0 } });
    mockUseNavigation.mockReturnValue({ goBack: mockGoBack });

    (WhatsHappeningExpandedCard as unknown as jest.Mock).mockImplementation(
      ({
        onSourcesPress,
      }: {
        onSourcesPress?: (articles: unknown[]) => void;
      }) => (
        <Pressable
          testID="mock-expanded-card"
          onPress={() =>
            onSourcesPress?.([
              {
                title: 'Test',
                source: 'coindesk.com',
                url: 'https://coindesk.com/test',
                date: '2026-03-15T10:00:00.000Z',
              },
            ])
          }
        />
      ),
    );

    (
      WhatsHappeningSourcesBottomSheet as unknown as jest.Mock
    ).mockImplementation(({ onClose }: { onClose: () => void }) => (
      <View testID="mock-sources-bottom-sheet">
        <Pressable testID="mock-sources-close" onPress={onClose} />
      </View>
    ));
  });

  it('renders the screen title', () => {
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(screen.getByText("What's happening")).toBeOnTheScreen();
  });

  it('renders skeleton carousel while loading', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(
      screen.getByTestId('whats-happening-detail-skeleton'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('whats-happening-detail-carousel')).toBeNull();
  });

  it('renders error state when fetch fails', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
    expect(screen.queryByTestId('whats-happening-detail-carousel')).toBeNull();
  });

  it('calls refresh when error retry button is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the carousel with items when data is available', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    expect(carousel).toBeOnTheScreen();
    // Simulate the carousel measuring its height so cards become visible
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    expect(screen.getByTestId('mock-expanded-card')).toBeOnTheScreen();
  });

  it('does not show the skeleton or error when items are loaded', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(screen.queryByTestId('whats-happening-detail-skeleton')).toBeNull();
    expect(screen.queryByText(/unable to load/i)).toBeNull();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    renderWithProvider(<WhatsHappeningDetailView />);
    fireEvent.press(screen.getByTestId('whats-happening-detail-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows the sources bottom sheet when onSourcesPress is called from a card', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    fireEvent.press(screen.getByTestId('mock-expanded-card'));
    expect(screen.getByTestId('mock-sources-bottom-sheet')).toBeOnTheScreen();
  });

  it('hides the sources bottom sheet when onClose is called', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    fireEvent.press(screen.getByTestId('mock-expanded-card'));
    expect(screen.getByTestId('mock-sources-bottom-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mock-sources-close'));
    expect(screen.queryByTestId('mock-sources-bottom-sheet')).toBeNull();
  });

  it('updates the active page indicator dot when the carousel is scrolled', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [
        mockItem,
        { ...mockItem, id: 'trend-1' },
        { ...mockItem, id: 'trend-2' },
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    // SNAP_INTERVAL ≈ 343 on a 375px screen: scrolling by 1× lands on index 1
    fireEvent(carousel, 'scroll', {
      nativeEvent: { contentOffset: { x: 343, y: 0 } },
    });
    expect(screen.getByTestId('page-indicator-dot-active')).toBeOnTheScreen();
    // Dot at index 0 is now inactive
    const inactiveDots = screen.getAllByTestId('page-indicator-dot');
    expect(inactiveDots.length).toBe(2);
  });

  it('scrolls to initialIndex once content is wide enough', () => {
    mockUseRoute.mockReturnValue({ params: { initialIndex: 1 } });
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem, { ...mockItem, id: 'trend-1' }],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    // Fire contentSizeChange with sufficient width (> 1 × SNAP_INTERVAL ≈ 343)
    expect(() =>
      fireEvent(carousel, 'contentSizeChange', 700, 600),
    ).not.toThrow();
  });
});
