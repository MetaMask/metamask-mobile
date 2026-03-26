import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WhatsHappeningSection from './WhatsHappeningSection';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({}));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock(
  '../../../../../selectors/featureFlagController/whatsHappening',
  () => ({
    selectWhatsHappeningEnabled: jest.fn(() => true),
  }),
);

jest.mock('./hooks', () => ({
  useWhatsHappening: jest.fn(() => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    digestId: null,
  })),
}));

const mockUseWhatsHappening = jest.requireMock('./hooks').useWhatsHappening;
const mockSelectWhatsHappeningEnabled = jest.requireMock(
  '../../../../../selectors/featureFlagController/whatsHappening',
).selectWhatsHappeningEnabled;

const mockItem = {
  id: 'trend-0',
  title: 'Bitcoin ETF inflows hit record high',
  description: 'Spot Bitcoin ETFs recorded over $1.2B in net inflows.',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro' as const,
  impact: 'positive' as const,
  relatedAssets: [],
  articles: [],
};

const defaultProps = { sectionIndex: 1, totalSectionsLoaded: 3 };

describe('WhatsHappeningSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({});
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockSelectWhatsHappeningEnabled.mockImplementation(() => true);
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId: null,
    });
  });

  it('returns null when feature flag is disabled', () => {
    mockSelectWhatsHappeningEnabled.mockImplementation(() => false);
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.queryByTestId('homepage-whats-happening-carousel'),
    ).toBeNull();
  });

  it('returns null when not loading and items are empty', () => {
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.queryByTestId('homepage-whats-happening-carousel'),
    ).toBeNull();
  });

  it('renders skeleton cards while loading', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.getByTestId('homepage-whats-happening-carousel'),
    ).toBeOnTheScreen();
  });

  it('renders item cards when data is available', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.getByTestId('homepage-whats-happening-carousel'),
    ).toBeOnTheScreen();
    expect(screen.getByText(mockItem.title)).toBeOnTheScreen();
  });

  it('renders error state when fetch fails', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: jest.fn(),
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.queryByTestId('homepage-whats-happening-carousel'),
    ).toBeNull();
    expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
  });

  it('calls refresh when error retry button is pressed', () => {
    const mockRefresh = jest.fn();
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: mockRefresh,
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('navigates to detail view at index 0 when a card is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(mockItem.title));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WHATS_HAPPENING_DETAIL,
      expect.objectContaining({ initialIndex: 0 }),
    );
  });

  it('navigates to detail view at index 0 when ViewMore card is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(/view more/i));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WHATS_HAPPENING_DETAIL,
      expect.objectContaining({ initialIndex: 0 }),
    );
  });

  it('navigates with correct index when second card is pressed', () => {
    const secondItem = {
      ...mockItem,
      id: 'trend-1',
      title: 'Ethereum Pectra upgrade',
    };
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem, secondItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId: null,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(secondItem.title));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WHATS_HAPPENING_DETAIL,
      expect.objectContaining({ initialIndex: 1 }),
    );
  });

  it('fires BREAKING_NEWS_CARD_CLICKED with digest_id when a card is pressed', () => {
    const digestId = '2026-03-15T10:00:00.000Z';
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(mockItem.title));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.BREAKING_NEWS_CARD_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({ digest_id: digestId });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('passes digestId in navigation params when a card is pressed', () => {
    const digestId = '2026-03-15T10:00:00.000Z';
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      digestId,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(mockItem.title));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WHATS_HAPPENING_DETAIL,
      expect.objectContaining({ digestId }),
    );
  });
});
