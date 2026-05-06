import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsHappeningDetailView from './WhatsHappeningDetailView';

const mockGoBack = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
    useRoute: () => ({ params: { initialIndex: 0 } }),
  };
});

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
    expect(
      screen.getByTestId('whats-happening-detail-carousel'),
    ).toBeOnTheScreen();
    expect(screen.getByText(mockItem.title)).toBeOnTheScreen();
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
});
