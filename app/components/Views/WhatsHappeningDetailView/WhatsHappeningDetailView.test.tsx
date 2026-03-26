import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsHappeningDetailView from './WhatsHappeningDetailView';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';

const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({}));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

const mockDigestId = '2026-03-15T10:00:00.000Z';

const mockItems = [
  {
    id: 'trend-0',
    title: 'Bitcoin ETF inflows hit record high',
    description: 'Spot Bitcoin ETFs recorded over $1.2B in net inflows.',
    date: '2026-03-15T10:00:00.000Z',
    category: 'macro' as const,
    impact: 'positive' as const,
    relatedAssets: [],
    articles: [],
  },
  {
    id: 'trend-1',
    title: 'Ethereum Pectra upgrade live',
    description: 'Pectra upgrade went live on mainnet.',
    date: '2026-03-15T11:00:00.000Z',
    category: 'technical' as const,
    impact: 'positive' as const,
    relatedAssets: [],
    articles: [],
  },
];

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
    useRoute: () => ({
      params: {
        items: mockItems,
        initialIndex: 0,
        digestId: mockDigestId,
      },
    }),
  };
});

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('WhatsHappeningDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({});
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
  });

  it('renders the detail carousel', () => {
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(
      screen.getByTestId('whats-happening-detail-carousel'),
    ).toBeOnTheScreen();
  });

  it('fires BREAKING_NEWS_SCREEN_VIEWED with digest_id on mount', () => {
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.BREAKING_NEWS_SCREEN_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({ digest_id: mockDigestId });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('navigates back when back button is pressed', () => {
    renderWithProvider(<WhatsHappeningDetailView />);
    fireEvent.press(screen.getByTestId('whats-happening-detail-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('fires BREAKING_NEWS_CARD_SWIPED with direction left when scrolled forward', () => {
    renderWithProvider(<WhatsHappeningDetailView />);

    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    // Simulate scrolling from index 0 to index 1 (left swipe = going to next card)
    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 400 } },
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.BREAKING_NEWS_CARD_SWIPED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ digest_id: mockDigestId, direction: 'left' }),
    );
  });
});
