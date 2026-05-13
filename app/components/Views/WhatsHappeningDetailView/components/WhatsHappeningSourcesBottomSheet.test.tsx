import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningSourcesBottomSheet from './WhatsHappeningSourcesBottomSheet';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((eventName: string) => ({
  addProperties: jest.fn((properties: Record<string, unknown>) => ({
    build: jest.fn(() => ({ category: eventName, properties })),
  })),
  build: jest.fn(() => ({ category: eventName })),
}));
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactLib = jest.requireActual('react');
    const { View: MockView } = jest.requireActual('react-native');

    return ReactLib.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactLib.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return <MockView testID="mock-bottom-sheet">{children}</MockView>;
      },
    );
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    return ({ children }: { children: React.ReactNode }) => (
      <MockView testID="mock-bottom-sheet-header">{children}</MockView>
    );
  },
);

jest.mock('../../../UI/MarketInsights/utils/marketInsightsFormatting', () => ({
  isSafeUrl: jest.fn(() => true),
  formatRelativeTime: jest.fn(() => '2h ago'),
  getFaviconUrl: jest.fn((url: string) => `https://favicon/${url}`),
}));

const mockIsSafeUrl = jest.requireMock(
  '../../../UI/MarketInsights/utils/marketInsightsFormatting',
).isSafeUrl;

const articles = [
  {
    title: 'Fed pauses rate hikes',
    url: 'https://coindesk.com/fed-pauses',
    source: 'coindesk.com',
    date: '2026-03-15T10:00:00.000Z',
  },
  {
    title: 'Bitcoin ETF sees record inflows',
    url: 'https://cointelegraph.com/btc-etf',
    source: 'cointelegraph.com',
    date: '2026-03-15T09:00:00.000Z',
  },
];

const mockItem: WhatsHappeningItem = {
  id: 'trend-7',
  title: 'Fed pauses rates',
  description: '...',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro',
  impact: 'positive',
  relatedAssets: [
    {
      sourceAssetId: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      caip19: ['eip155:1/slip44:0'],
    },
  ],
  articles: articles as never,
};

describe('WhatsHappeningSourcesBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSafeUrl.mockReturnValue(true);
  });

  it('renders one row per article', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
        item={mockItem}
        cardIndex={0}
        source="homepage"
      />,
    );
    expect(screen.getByText('coindesk.com')).toBeOnTheScreen();
    expect(screen.getByText('cointelegraph.com')).toBeOnTheScreen();
  });

  it('opens the article URL in the in-app browser when a row is pressed and URL is safe', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
        item={mockItem}
        cardIndex={0}
        source="homepage"
      />,
    );
    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'BrowserTabHome',
      expect.objectContaining({
        screen: 'BrowserView',
        params: expect.objectContaining({
          newTabUrl: 'https://coindesk.com/fed-pauses',
          fromTrending: true,
          fromWhatsHappening: true,
        }),
      }),
    );
  });

  it('does not open the browser when isSafeUrl returns false', () => {
    mockIsSafeUrl.mockReturnValue(false);
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
        item={mockItem}
        cardIndex={0}
        source="homepage"
      />,
    );
    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the sheet title', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
        item={mockItem}
        cardIndex={0}
        source="homepage"
      />,
    );
    expect(screen.getByText('News sources')).toBeOnTheScreen();
  });

  it('renders no article rows when articles array is empty', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={[]}
        item={mockItem}
        cardIndex={0}
        source="homepage"
      />,
    );
    expect(screen.queryByText('coindesk.com')).toBeNull();
  });

  it('tracks Whats Happening Interaction (source_click) with the article URL on row press', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
        item={mockItem}
        cardIndex={3}
        source="homepage"
      />,
    );
    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
        properties: expect.objectContaining({
          interaction_type: 'source_click',
          article_url: 'https://coindesk.com/fed-pauses',
          source: 'homepage',
          trend_id: 'trend-7',
          card_index: 3,
          trend_category: 'macro',
          trend_impact: 'positive',
          asset_symbols: ['BTC'],
        }),
      }),
    );
  });

  it('does not track the interaction when the URL is unsafe', () => {
    mockIsSafeUrl.mockReturnValue(false);
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
        item={mockItem}
        cardIndex={0}
        source="homepage"
      />,
    );
    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
    );
  });
});
